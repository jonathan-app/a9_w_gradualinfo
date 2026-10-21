/**
 * @fileoverview app/api/admin/ofertas/[id]/avaliar-selo/route.ts — avaliação e concessão do selo
 * @module app/api/admin/ofertas/[id]/avaliar-selo/route
 * @description Route handler para ingestão de evidências comerciais, persistência WORM fail-closed
 *   e execução transacional da RPC evaluate_and_set_verified_price da Spec 0017 (Fatia 4).
 * @dependencies @/lib/admin/auth, @/lib/offers/evidence-canonicalizer, @/lib/offers/storage/storage-factory,
 *   @/lib/offers/webhook-auth, @/lib/supabase/server
 */

import { NextResponse } from 'next/server';
import { assertAdminApiAuth } from '@/lib/admin/auth';
import { recordAdminAudit } from '@/lib/admin/audit-service';
import {
  digestEvidence,
  type CanonicalEvidencePayload,
  InvalidEvidenceFormatError,
} from '@/lib/offers/evidence-canonicalizer';
import {
  EvidenceCollisionConflictError,
  EvidenceStorageUnavailableError,
  type EvidenceStorageAdapter,
} from '@/lib/offers/storage/evidence-storage-adapter';
import { getOffersEvidenceStorage } from '@/lib/offers/storage/storage-factory';
import { getOffersServiceClient } from '@/lib/offers/service-client';
import {
  verifyWebhookSignature,
  type SupabaseClientForWebhookNonce,
} from '@/lib/offers/webhook-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { readLimitedTextBody } from '@/lib/utils/http-stream';
import {
  apiErrorResponse,
  sanitizeRpcErrorMessage,
} from '@/lib/utils/api-response';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PAYLOAD_BYTES = 524_288; // 512 KB

/**
 * Cliente Supabase para a rota: usa o tipo real do Supabase JS SDK.
 * O cast para SupabaseClientForWebhookNonce é feito apenas no ponto de chamada.
 */
export type AvaliarSeloSupabaseClient = SupabaseClient;

export interface AvaliarSeloDependencies {
  storage?: EvidenceStorageAdapter;
  supabaseClient?: AvaliarSeloSupabaseClient;
}

/**
 * Lógica principal da rota com injeção opcional para testes unitários isolados.
 */
export async function handleAvaliarSelo(
  request: Request,
  context: { params: Promise<{ id: string }> },
  deps: AvaliarSeloDependencies = {},
): Promise<Response> {
  const params = await context.params;
  const offerId = params?.id;

  if (!offerId || !UUID_V4_REGEX.test(offerId)) {
    return NextResponse.json(
      {
        error: 'invalid_offer_id',
        message: 'O ID da oferta deve ser um UUIDv4 válido.',
      },
      { status: 400 },
    );
  }

  const bodyResult = await readLimitedTextBody(request, MAX_PAYLOAD_BYTES);
  if (!bodyResult.ok) {
    return apiErrorResponse(
      bodyResult.status,
      bodyResult.error,
      bodyResult.message,
    );
  }
  const rawBodyText = bodyResult.text;

  let actorId: string;
  let origin: 'admin_aal2' | 'signed_webhook';

  // Autenticação dual (Fail-Closed):
  // 1. Webhook HMAC assinado por coletor
  if (request.headers.has('x-gradualinfo-signature')) {
    let serviceClient: AvaliarSeloSupabaseClient | undefined =
      deps.supabaseClient;
    if (!serviceClient) {
      try {
        serviceClient = getOffersServiceClient();
      } catch {
        // Se serviceClient não estiver disponível em runtime, verifyWebhookSignature
        // validará a assinatura e falhará de forma fechada (503) no consumo do nonce.
      }
    }

    const webhookNonceClient: SupabaseClientForWebhookNonce | undefined =
      serviceClient
        ? {
            from: () => ({
              insert: async (values: {
                collector_id: string;
                nonce: string;
              }) => {
                const { error } = await serviceClient
                  .from('offers_ingest_nonces')
                  .insert(values as Record<string, unknown>);
                return { error };
              },
            }),
          }
        : undefined;

    const webhookAuth = await verifyWebhookSignature(request, rawBodyText, {
      supabaseClient: webhookNonceClient,
    });
    if (!webhookAuth.valid) {
      if (webhookAuth.reason === 'webhook_nonce_replay_detected') {
        return NextResponse.json(
          {
            error: 'nonce_already_consumed',
            message:
              'Tentativa de repetição detectada: este nonce já foi consumido por este coletor.',
          },
          { status: 409 },
        );
      }
      if (webhookAuth.reason === 'webhook_nonce_storage_error') {
        return apiErrorResponse(
          503,
          'nonce_storage_error',
          'Falha de persistência ao consumir nonce no banco compartilhado.',
        );
      }
      return NextResponse.json(
        {
          error: webhookAuth.reason,
          message: 'Autenticação do webhook rejeitada.',
        },
        { status: 401 },
      );
    }
    origin = 'signed_webhook';
    actorId = webhookAuth.actorId!;
  } else {
    // 2. Sessão administrativa com MFA AAL2
    const adminAuth = await assertAdminApiAuth(request, 'editor');
    if (!adminAuth.ok) {
      return adminAuth.response;
    }
    origin = 'admin_aal2';
    actorId = adminAuth.user.id;
    void recordAdminAudit({
      actorType: 'admin',
      actorId: adminAuth.user.id,
      actorEmail: adminAuth.user.email,
      actorRole: adminAuth.role,
      action: 'offer.badge_evaluated',
      resourceType: 'offer',
      resourceId: offerId,
      ipAddress: request.headers.get('cf-connecting-ip'),
    });
  }

  // Parse do corpo JSON
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBodyText) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_json',
        message: 'Corpo da requisição não é um JSON válido.',
      },
      { status: 400 },
    );
  }

  const advertisedSku =
    typeof body?.advertised_sku === 'string' ? body.advertised_sku : undefined;
  const advertisedSpecs =
    body?.advertised_specs && typeof body.advertised_specs === 'object'
      ? (body.advertised_specs as Record<string, unknown>)
      : undefined;
  const advertisedEan =
    body?.advertised_ean !== undefined && body.advertised_ean !== null
      ? String(body.advertised_ean)
      : null;
  const regionCode =
    body?.region_code !== undefined && body.region_code !== null
      ? String(body.region_code)
      : null;
  const couponCode =
    body?.coupon_code !== undefined && body.coupon_code !== null
      ? String(body.coupon_code)
      : null;
  const rawProof =
    body?.raw_proof && typeof body.raw_proof === 'object'
      ? (body.raw_proof as { proof_type?: unknown; content?: unknown })
      : null;
  const notes = typeof body?.notes === 'string' ? body.notes : null;
  const action = body?.action === 'renovacao' ? 'renovacao' : 'concessao';

  if (
    !advertisedSku ||
    typeof advertisedSku !== 'string' ||
    advertisedSku.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error: 'missing_advertised_sku',
        message: 'O campo advertised_sku é obrigatório.',
      },
      { status: 400 },
    );
  }

  const proofType =
    rawProof?.proof_type === 'selector_text_extract'
      ? 'selector_text_extract'
      : rawProof?.proof_type === 'api_response_json'
        ? 'api_response_json'
        : null;
  const proofContent =
    typeof rawProof?.content === 'string' ? rawProof.content : null;

  if (!proofType || !proofContent) {
    return NextResponse.json(
      {
        error: 'invalid_raw_proof',
        message:
          'O campo raw_proof deve conter proof_type ("api_response_json" ou "selector_text_extract") e content em string.',
      },
      { status: 400 },
    );
  }

  const supabase = deps.supabaseClient || (await createClient());

  // Consulta os metadados da oferta e do produto associado
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(
      `
      id,
      product_id,
      merchant_id,
      price_cents,
      original_price_cents,
      payment_method,
      installment_count,
      installment_price_cents,
      shipping_cost_cents,
      affiliate_url,
      badge_status,
      badge_expires_at,
      verified_effective_price_cents,
      merchants (
        domain
      ),
      products (
        specs_json
      )
    `,
    )
    .eq('id', offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.json(
      {
        error: 'offer_not_found',
        message: 'Oferta não encontrada no catálogo.',
      },
      { status: 404 },
    );
  }

  const rawMerchant = Array.isArray(offer.merchants)
    ? offer.merchants[0]
    : offer.merchants;
  const rawProduct = Array.isArray(offer.products)
    ? offer.products[0]
    : offer.products;

  const merchantDomain = rawMerchant?.domain?.trim();
  if (!merchantDomain) {
    return NextResponse.json(
      {
        error: 'missing_merchant_domain',
        message:
          'O lojista associado à oferta não possui um domínio cadastrado válido.',
      },
      { status: 422 },
    );
  }

  // Monta o payload canônico para computar o hash e bytes WORM
  const canonicalPayload: CanonicalEvidencePayload = {
    schema_version: '1.0',
    captured_at:
      typeof body?.captured_at === 'string' &&
      body.captured_at.trim().length > 0
        ? body.captured_at.trim()
        : new Date().toISOString(),
    offer: {
      id: offer.id,
      product_id: offer.product_id,
      merchant_id: offer.merchant_id,
      merchant_domain: merchantDomain,
      advertised_url: offer.affiliate_url,
    },
    product_identity: {
      sku: advertisedSku.trim(),
      ean: advertisedEan ? String(advertisedEan).trim() : null,
      specs: advertisedSpecs ?? rawProduct?.specs_json ?? {},
    },
    commercial_terms: {
      price_cents: offer.price_cents,
      original_price_cents: offer.original_price_cents ?? null,
      currency: 'BRL',
      payment_method: offer.payment_method ?? 'a_vista',
      installment_count: offer.installment_count ?? 1,
      installment_price_cents:
        offer.installment_price_cents ?? offer.price_cents,
      shipping_cost_cents: offer.shipping_cost_cents ?? 0,
      region_code: regionCode ? String(regionCode).trim().toUpperCase() : null,
      coupon_code: couponCode ? String(couponCode).trim() : null,
    },
    collector: {
      origin,
      actor_id: actorId,
      collector_version: '1.0.0',
    },
    raw_proof: {
      proof_type: proofType,
      content: proofContent,
    },
  };

  let digest;
  try {
    digest = digestEvidence(canonicalPayload);
  } catch (err) {
    if (err instanceof InvalidEvidenceFormatError) {
      return NextResponse.json(
        { error: 'invalid_evidence_format', message: err.message },
        { status: 400 },
      );
    }
    throw err;
  }

  const storage = deps.storage || getOffersEvidenceStorage();

  // Persistência WORM Fail-Closed
  let putResult;
  try {
    putResult = await storage.putEvidence(
      digest.sha256,
      digest.canonicalBytes,
      730,
    );
  } catch (err) {
    if (err instanceof EvidenceCollisionConflictError) {
      return NextResponse.json(
        { error: 'evidence_collision_conflict', message: err.message },
        { status: 409 },
      );
    }
    if (err instanceof EvidenceStorageUnavailableError) {
      return apiErrorResponse(
        503,
        'storage_unavailable',
        'Falha ao persistir evidência WORM. Operação abortada sem mutação no banco.',
      );
    }
    return apiErrorResponse(
      503,
      'storage_error',
      'Erro inesperado no subsistema de storage WORM.',
    );
  }

  // Idempotência: se a evidência já existia e o selo ativo já está válido e vigente
  const now = new Date();
  if (
    putResult.reused_existing &&
    offer.badge_status === 'verified' &&
    offer.badge_expires_at &&
    new Date(offer.badge_expires_at) > now
  ) {
    return NextResponse.json(
      {
        approved: true,
        badge_status: 'verified',
        reason: 'reused_active_evidence',
        effective_price_cents: offer.verified_effective_price_cents,
        median_30d_cents: null,
        audit_id: null,
        badge_expires_at: offer.badge_expires_at,
        evidence_hash: digest.sha256,
        reused_existing: true,
      },
      { status: 200 },
    );
  }

  // Execução transacional da RPC no Supabase com permissão de serviço (Spec 0021 AC-01)
  let privilegedClient;
  if (deps.supabaseClient) {
    privilegedClient = deps.supabaseClient;
  } else {
    try {
      privilegedClient = getOffersServiceClient();
    } catch {
      return apiErrorResponse(
        503,
        'service_client_unavailable',
        'Cliente de serviço Supabase indisponível no runtime.',
      );
    }
  }

  const { data: rpcRows, error: rpcError } = await privilegedClient.rpc(
    'evaluate_and_set_verified_price',
    {
      p_offer_id: offerId,
      p_action: action,
      p_announced_sku: advertisedSku.trim(),
      p_announced_ean: advertisedEan ? String(advertisedEan).trim() : null,
      p_announced_variant: advertisedSpecs ?? {},
      p_region_code: regionCode
        ? String(regionCode).trim().toUpperCase()
        : null,
      p_origin_actor_id: actorId,
      p_evidence_hash: digest.sha256,
      p_evidence_byte_size: digest.byteSize,
      p_evidence_content_type: 'application/json',
      p_evidence_storage_path: digest.storagePath,
      p_notes: notes,
    },
  );

  if (rpcError) {
    console.error(
      'Falha na transação RPC evaluate_and_set_verified_price (avaliar-selo):',
      {
        code: rpcError.code ?? 'unknown',
      },
    );

    return apiErrorResponse(
      422,
      'evaluation_transaction_failed',
      sanitizeRpcErrorMessage(
        rpcError.message,
        'Não foi possível concluir a avaliação da oferta no banco de dados.',
      ),
    );
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;

  return NextResponse.json(
    {
      approved: row?.approved ?? false,
      badge_status: row?.badge_status ?? 'unverified',
      reason: row?.reason ?? 'unknown',
      effective_price_cents: row?.effective_price_cents ?? null,
      median_30d_cents: row?.median_30d_cents ?? null,
      audit_id: row?.audit_id ?? null,
      badge_expires_at: row?.badge_expires_at ?? null,
      evidence_hash: digest.sha256,
      storage_path: digest.storagePath,
      reused_existing: putResult.reused_existing,
    },
    { status: 200 },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    return await handleAvaliarSelo(request, context);
  } catch (err: unknown) {
    console.error(
      'Unhandled error in POST /api/admin/ofertas/[id]/avaliar-selo:',
      {
        name: err instanceof Error ? err.name : 'UnknownError',
      },
    );
    return apiErrorResponse(
      500,
      'internal_error',
      'Erro interno ao processar a avaliação do selo.',
    );
  }
}
