/**
 * @fileoverview app/api/ingest/ofertas/route.ts: ingestão de ofertas por coletores automatizados
 * @module app/api/ingest/ofertas/route
 * @description Ponto de entrada exclusivo para coletores externos com autenticação HMAC-SHA256,
 *   consumo atômico de nonce anti-replay, persistência probatória WORM fail-closed e idempotência
 *   transacional na RPC evaluate_and_set_verified_price (Spec 0021 / AC-08).
 * @dependencies @/lib/offers/ingest-auth, @/lib/offers/evidence-canonicalizer,
 *   @/lib/offers/storage/storage-factory, @/lib/offers/service-client
 */

import { NextResponse } from 'next/server';
import {
  digestEvidence,
  type CanonicalEvidencePayload,
  InvalidEvidenceFormatError,
} from '@/lib/offers/evidence-canonicalizer';
import { verifyIngestSignature } from '@/lib/offers/ingest-auth';
import {
  EvidenceCollisionConflictError,
  EvidenceStorageUnavailableError,
  type EvidenceStorageAdapter,
} from '@/lib/offers/storage/evidence-storage-adapter';
import { getOffersEvidenceStorage } from '@/lib/offers/storage/storage-factory';
import { getOffersServiceClient } from '@/lib/offers/service-client';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PAYLOAD_BYTES = 524_288; // 512 KB

export interface SupabaseLikeClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: unknown;
        }>;
      };
    };
    insert: (values: Record<string, unknown>) => Promise<{
      error: { code?: string; message: string } | null;
    }>;
  };
  rpc: (
    functionName: string,
    params: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
}

export interface IngestOfertasDependencies {
  storage?: EvidenceStorageAdapter;
  supabaseClient?: SupabaseLikeClient;
  secret?: string;
  nowSeconds?: number;
}

/**
 * Handler central da rota com injeção de dependências para testes unitários de concorrência e falhas.
 */
export async function handleIngestOfertas(
  request: Request,
  deps: IngestOfertasDependencies = {},
): Promise<Response> {
  const collectorId = request.headers.get('x-collector-id');
  const timestampStr = request.headers.get('x-timestamp');
  const nonce = request.headers.get('x-nonce');
  const signature = request.headers.get('x-signature-sha256');

  if (!collectorId || !timestampStr || !nonce || !signature) {
    return NextResponse.json(
      {
        error: 'missing_collector_headers',
        message:
          'Cabeçalhos x-collector-id, x-timestamp, x-nonce e x-signature-sha256 são obrigatórios.',
      },
      { status: 400 },
    );
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `O corpo da requisição excede o limite máximo permitido de ${MAX_PAYLOAD_BYTES} bytes.`,
        },
        { status: 413 },
      );
    }
  }

  const rawBodyText = await request.text();
  if (Buffer.byteLength(rawBodyText, 'utf8') > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `O corpo da requisição excede o limite máximo permitido de ${MAX_PAYLOAD_BYTES} bytes.`,
      },
      { status: 413 },
    );
  }

  const secret = deps.secret ?? process.env.OFFERS_INGEST_SECRET;
  if (!secret || secret.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'secret_missing',
        message:
          'Segredo de autenticação de coletores não configurado no servidor.',
      },
      { status: 503 },
    );
  }

  // 1. Verificação da assinatura HMAC antes de consultar ou consumir o nonce
  const url = new URL(request.url);
  const path = url.pathname;
  const authResult = verifyIngestSignature({
    method: request.method,
    path,
    collectorId,
    timestampStr,
    nonce,
    rawBodyText,
    signatureHeader: signature,
    secret,
    nowSeconds: deps.nowSeconds,
  });

  if (!authResult.valid) {
    if (authResult.reason === 'timestamp_out_of_window') {
      return NextResponse.json(
        {
          error: 'timestamp_out_of_window',
          message: 'Desvio de timestamp superior à janela de 300 segundos.',
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: authResult.reason || 'invalid_signature',
        message: 'Assinatura criptográfica HMAC do coletor inválida.',
      },
      { status: 401 },
    );
  }

  // Cliente privilegiado para operações em tabelas protegidas por RLS
  let privilegedClient: SupabaseLikeClient;
  try {
    privilegedClient =
      deps.supabaseClient ||
      (getOffersServiceClient() as unknown as SupabaseLikeClient);
  } catch {
    return NextResponse.json(
      {
        error: 'service_client_unavailable',
        message: 'Cliente de serviço Supabase indisponível no runtime.',
      },
      { status: 503 },
    );
  }

  // 2. Consumo atômico do nonce compartilhado (anti-replay estrito)
  const { error: nonceError } = await privilegedClient
    .from('offers_ingest_nonces')
    .insert({
      collector_id: collectorId.trim(),
      nonce: nonce.trim(),
    });

  if (nonceError) {
    const isConflict =
      nonceError.code === '23505' ||
      nonceError.message?.includes('duplicate key') ||
      nonceError.message?.includes('unique constraint');

    if (isConflict) {
      return NextResponse.json(
        {
          error: 'nonce_already_consumed',
          message:
            'Tentativa de repetição detectada: este nonce já foi consumido por este coletor.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: 'nonce_storage_error',
        message:
          'Falha de persistência ao consumir nonce no banco compartilhado.',
      },
      { status: 503 },
    );
  }

  // 3. Validação do corpo da oferta
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

  const offerId =
    typeof body?.offer_id === 'string' ? body.offer_id : undefined;
  if (!offerId || !UUID_V4_REGEX.test(offerId)) {
    return NextResponse.json(
      {
        error: 'invalid_offer_id',
        message: 'O campo offer_id deve ser um UUIDv4 válido.',
      },
      { status: 400 },
    );
  }

  const advertisedSku =
    typeof body?.advertised_sku === 'string' ? body.advertised_sku : undefined;
  if (!advertisedSku || advertisedSku.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'missing_advertised_sku',
        message: 'O campo advertised_sku é obrigatório.',
      },
      { status: 400 },
    );
  }

  const rawProof =
    body?.raw_proof && typeof body.raw_proof === 'object'
      ? (body.raw_proof as { proof_type?: unknown; content?: unknown })
      : null;

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
  const operationKey =
    typeof body?.operation_key === 'string' &&
    body.operation_key.trim().length > 0
      ? body.operation_key.trim()
      : null;
  const notes = typeof body?.notes === 'string' ? body.notes : null;
  const action = body?.action === 'renovacao' ? 'renovacao' : 'concessao';

  // 4. Consulta a oferta no catálogo
  const { data: offer, error: offerError } = await privilegedClient
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

  const merchantDomain = (
    rawMerchant as { domain?: string } | undefined
  )?.domain?.trim();
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

  // 5. Canonização da evidência probatória
  const canonicalPayload: CanonicalEvidencePayload = {
    schema_version: '1.0',
    action,
    captured_at:
      typeof body?.captured_at === 'string' &&
      body.captured_at.trim().length > 0
        ? body.captured_at.trim()
        : new Date().toISOString(),
    offer: {
      id: offer.id as string,
      product_id: offer.product_id as string,
      merchant_id: offer.merchant_id as string,
      merchant_domain: merchantDomain,
      advertised_url: offer.affiliate_url as string,
    },
    product_identity: {
      sku: advertisedSku.trim(),
      ean: advertisedEan ? String(advertisedEan).trim() : null,
      specs:
        advertisedSpecs ??
        (rawProduct as { specs_json?: Record<string, unknown> } | undefined)
          ?.specs_json ??
        {},
    },
    commercial_terms: {
      price_cents: offer.price_cents as number,
      original_price_cents: (offer.original_price_cents as number) ?? null,
      currency: 'BRL',
      payment_method:
        offer.payment_method === 'parcelado' ||
        offer.payment_method === 'pix' ||
        offer.payment_method === 'cartao'
          ? offer.payment_method
          : 'a_vista',
      installment_count: (offer.installment_count as number) ?? 1,
      installment_price_cents:
        (offer.installment_price_cents as number) ??
        (offer.price_cents as number),
      shipping_cost_cents: (offer.shipping_cost_cents as number) ?? 0,
      region_code: regionCode ? String(regionCode).trim().toUpperCase() : null,
      coupon_code: (offer.verified_coupon_code as string) ?? null,
    },
    collector: {
      origin: 'automated_collector',
      actor_id: `collector:${collectorId.trim()}`,
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

  // 6. Gravação atômica no storage WORM fail-closed
  let putResult;
  try {
    const storage = deps.storage || getOffersEvidenceStorage();
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
      return NextResponse.json(
        {
          error: 'storage_unavailable',
          message:
            'Falha ao persistir evidência WORM. Operação abortada sem mutação no banco.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: 'storage_error',
        message: 'Erro no subsistema de storage WORM.',
      },
      { status: 503 },
    );
  }

  // 7. Chamada à RPC transacional evaluate_and_set_verified_price com operation_key
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
      p_origin_actor_id: `collector:${collectorId.trim()}`,
      p_evidence_hash: digest.sha256,
      p_evidence_byte_size: digest.byteSize,
      p_evidence_content_type: 'application/json',
      p_evidence_storage_path: digest.storagePath,
      p_notes: notes,
      p_operation_key: operationKey,
    },
  );

  if (rpcError) {
    const isPayloadConflict =
      rpcError.code === '23505' ||
      rpcError.message?.includes('operation_key_payload_conflict');

    if (isPayloadConflict) {
      return NextResponse.json(
        {
          error: 'operation_key_payload_conflict',
          message: rpcError.message,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: 'evaluation_transaction_failed',
        message: rpcError.message,
        code: rpcError.code,
      },
      { status: 422 },
    );
  }

  const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as {
    approved?: boolean;
    badge_status?: string;
    reason?: string;
    effective_price_cents?: number | null;
    median_30d_cents?: number | null;
    audit_id?: string | null;
    badge_expires_at?: string | null;
    reused_existing?: boolean;
  };

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
      reused_existing: row?.reused_existing ?? putResult.reused_existing,
    },
    { status: 200 },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleIngestOfertas(request);
  } catch (err: unknown) {
    console.error('Unhandled error in POST /api/ingest/ofertas:', err);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
