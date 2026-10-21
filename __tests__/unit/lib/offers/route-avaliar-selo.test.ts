/**
 * @fileoverview Testes unitários para a rota POST /api/admin/ofertas/[id]/avaliar-selo (Spec 0017 / Fatia 4).
 */

import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { handleAvaliarSelo } from '@/app/api/admin/ofertas/[id]/avaliar-selo/route';
import { createClient } from '@/lib/supabase/server';
import {
  MemoryEvidenceStorageAdapter,
  resetEvidenceStorage,
} from '@/lib/offers/storage/memory-adapter';
import { resetGlobalNonceCache } from '@/lib/offers/webhook-auth';

// Mock de assertAdminApiAuth
vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(),
}));

// Mock de createClient para evitar cookies() fora do escopo Next em testes
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  })),
}));

import { assertAdminApiAuth } from '@/lib/admin/auth';

describe('handleAvaliarSelo (POST /api/admin/ofertas/[id]/avaliar-selo)', () => {
  const validOfferId = 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329';
  const webhookSecret = 'test-offers-webhook-secret-999';
  let storage: MemoryEvidenceStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    resetEvidenceStorage();
    resetGlobalNonceCache();
    process.env.OFFERS_WEBHOOK_SECRET = webhookSecret;
    storage = new MemoryEvidenceStorageAdapter();
  });

  const validBody = {
    captured_at: '2026-10-14T12:00:00.000Z',
    advertised_sku: 'G15-5530-A20P',
    advertised_specs: { ram: '16GB', storage: '512GB SSD' },
    advertised_ean: '7891234567890',
    region_code: 'SP',
    coupon_code: 'CUPOM10',
    raw_proof: {
      proof_type: 'api_response_json',
      content: '{"price":549900,"in_stock":true}',
    },
    notes: 'Auditoria noturna automatizada',
  };

  const sampleOfferData = {
    id: validOfferId,
    product_id: 'e4d3c2b1-0000-4000-8000-000000000001',
    merchant_id: 'f5e4d3c2-0000-4000-8000-000000000002',
    price_cents: 549900,
    original_price_cents: 629900,
    payment_method: 'a_vista',
    installment_count: 1,
    installment_price_cents: 549900,
    shipping_cost_cents: 0,
    affiliate_url: 'https://www.amazon.com.br/dp/B0CXYZ1234',
    badge_status: 'unverified',
    badge_expires_at: null,
    verified_effective_price_cents: null,
    merchants: { domain: 'amazon.com.br' },
    products: { specs_json: { ram: '16GB', storage: '512GB SSD' } },
  };

  function mockSupabase(
    offerData: any = sampleOfferData,
    rpcResult: any = [
      {
        approved: true,
        badge_status: 'verified',
        reason: 'approved',
        effective_price_cents: 549900,
        median_30d_cents: 600000,
        audit_id: 'a1b2c3d4-0000-4000-8000-000000000001',
        badge_expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
    rpcError: any = null,
    options: {
      nonceConflict?: boolean;
      nonceStorageError?: boolean;
    } = {},
  ) {
    let capturedRpcParams: any = null;
    const consumedNonces = new Set<string>();

    const client = {
      from: (table: string) => {
        if (table === 'offers_ingest_nonces') {
          return {
            insert: async (row: { collector_id: string; nonce: string }) => {
              if (options.nonceStorageError) {
                return { error: { message: 'DB connection failure' } };
              }
              if (options.nonceConflict || consumedNonces.has(row.nonce)) {
                return {
                  error: {
                    code: '23505',
                    message: 'duplicate key value violates unique constraint',
                  },
                };
              }
              consumedNonces.add(row.nonce);
              return { error: null };
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: offerData, error: null }),
            }),
          }),
        };
      },
      rpc: async (name: string, params: any) => {
        capturedRpcParams = { name, params };
        if (rpcError) {
          return { data: null, error: rpcError };
        }
        return { data: rpcResult, error: null };
      },
      getCapturedRpc: () => capturedRpcParams,
    };

    return client;
  }

  function createAdminRequest(
    body: any,
    customHeaders: Record<string, string> = {},
  ): Request {
    return new Request(
      `https://gradualinfo.com.br/api/admin/ofertas/${validOfferId}/avaliar-selo`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...customHeaders,
        },
        body: JSON.stringify(body),
      },
    );
  }

  function createSignedWebhookRequest(
    body: any,
    options: { timestamp?: number; nonce?: string; secretKey?: string } = {},
  ): Request {
    const rawBody = JSON.stringify(body);
    const ts = options.timestamp ?? Math.floor(Date.now() / 1000);
    const nonce = options.nonce ?? 'webhook-nonce-12345';
    const key = options.secretKey ?? webhookSecret;

    const signature = `v1=${createHmac('sha256', key)
      .update(`v1:${ts}:${nonce}:${rawBody}`, 'utf8')
      .digest('hex')}`;

    return new Request(
      `https://gradualinfo.com.br/api/admin/ofertas/${validOfferId}/avaliar-selo`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gradualinfo-signature': signature,
          'x-gradualinfo-timestamp': String(ts),
          'x-gradualinfo-nonce': nonce,
        },
        body: rawBody,
      },
    );
  }

  it('rejeita com 400 se o ID da rota não for um UUIDv4 válido', async () => {
    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: 'invalid-uuid-format' }) },
      { storage },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_offer_id');
  });

  it('rejeita com 413 se o Content-Length exceder 512 KB', async () => {
    const req = createAdminRequest(validBody, { 'content-length': '600000' });
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage },
    );

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe('payload_too_large');
  });

  it('rejeita com 403/401 se a sessão administrativa não tiver MFA AAL2', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: false,
      response: new Response('Segundo fator obrigatório', { status: 403 }),
    });

    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage },
    );

    expect(res.status).toBe(403);
  });

  it('rejeita com 401 se a assinatura do webhook HMAC estiver incorreta', async () => {
    const req = createSignedWebhookRequest(validBody, {
      secretKey: 'wrong-key-attacker',
    });

    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage },
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('invalid_webhook_signature');
  });

  it('rejeita com 409 quando o webhook repete um nonce já consumido no banco compartilhado', async () => {
    const mockDb = mockSupabase(sampleOfferData, undefined, null, {
      nonceConflict: true,
    });
    const req = createSignedWebhookRequest(validBody, {
      nonce: 'already-used-nonce',
    });

    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('nonce_already_consumed');
  });

  it('rejeita com 503 quando o banco compartilhado de nonces falha na rota de webhook', async () => {
    const mockDb = mockSupabase(sampleOfferData, undefined, null, {
      nonceStorageError: true,
    });
    const req = createSignedWebhookRequest(validBody, {
      nonce: 'fresh-nonce-db-error',
    });

    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('nonce_storage_error');
  });

  it('rejeita com 400 se o campo advertised_sku estiver em branco', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const invalidSkuBody = { ...validBody, advertised_sku: '   ' };
    const req = createAdminRequest(invalidSkuBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('missing_advertised_sku');
  });

  it('rejeita com 503 e NÃO executa a RPC se o storage WORM estiver indisponível (Fail-Closed)', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    storage.setSimulateUnavailable(true);
    const mockDb = mockSupabase();

    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('storage_unavailable');
    // Assegura que o banco NÃO foi chamado para avaliar a RPC
    expect(mockDb.getCapturedRpc()).toBeNull();
  });

  it('executa com sucesso via autenticação admin AAL2 e invoca a RPC com os 12 parâmetros posicionais', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const mockDb = mockSupabase();
    const req = createAdminRequest(validBody);

    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);
    expect(json.badge_status).toBe('verified');
    expect(json.effective_price_cents).toBe(549900);
    expect(json.evidence_hash).toHaveLength(64);

    // Confere os 12 parâmetros reais da RPC
    const captured = mockDb.getCapturedRpc();
    expect(captured.name).toBe('evaluate_and_set_verified_price');
    expect(captured.params).toMatchObject({
      p_offer_id: validOfferId,
      p_action: 'concessao',
      p_announced_sku: 'G15-5530-A20P',
      p_announced_ean: '7891234567890',
      p_announced_variant: { ram: '16GB', storage: '512GB SSD' },
      p_region_code: 'SP',
      p_origin_actor_id: 'admin-123',
      p_evidence_content_type: 'application/json',
      p_notes: 'Auditoria noturna automatizada',
    });
    expect(captured.params.p_evidence_hash).toHaveLength(64);
    expect(captured.params.p_evidence_byte_size).toBeGreaterThan(0);
    expect(captured.params.p_evidence_storage_path).toContain(
      'evidences/sha256/',
    );

    // Confere que a evidência foi realmente persistida no storage WORM
    const inStorage = await storage.headEvidence(
      captured.params.p_evidence_hash,
    );
    expect(inStorage.exists).toBe(true);
  });

  it('autentica e avalia via Webhook assinado com HMAC-SHA256', async () => {
    const mockDb = mockSupabase();
    const req = createSignedWebhookRequest(validBody, {
      nonce: 'fresh-unique-nonce-555',
    });

    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);

    const captured = mockDb.getCapturedRpc();
    expect(captured.params.p_origin_actor_id).toBe('signed_webhook:fresh-un');
  });

  it('responde de forma idempotente sem reinvocar a RPC se a evidência já foi gravada e o selo estiver ativo e vigente', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValue({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const activeOfferData = {
      ...sampleOfferData,
      badge_status: 'verified',
      badge_expires_at: new Date(Date.now() + 50000000).toISOString(),
      verified_effective_price_cents: 549900,
    };

    const mockDb = mockSupabase(activeOfferData);

    // 1ª execução grava no storage e chama a RPC
    const req1 = createAdminRequest(validBody);
    const res1 = await handleAvaliarSelo(
      req1,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );
    expect(res1.status).toBe(200);

    // Reseta rastreador da RPC
    const rpcCallsBefore = mockDb.getCapturedRpc();
    expect(rpcCallsBefore).not.toBeNull();

    // 2ª execução idêntica detecta reused_existing e selo vigente
    const mockDb2 = mockSupabase(activeOfferData);
    const req2 = createAdminRequest(validBody);
    const res2 = await handleAvaliarSelo(
      req2,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb2 },
    );

    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.reused_existing).toBe(true);
    expect(json2.reason).toBe('reused_active_evidence');
    // Não executou a RPC na segunda requisição idempotente
    expect(mockDb2.getCapturedRpc()).toBeNull();
  });

  it('retorna 422 Unprocessable Entity se a RPC falhar com erro de negócio ou restrição SQL', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const mockDb = mockSupabase(sampleOfferData, null, {
      message: 'coupon_scope_mismatch',
      code: '22023',
    });

    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('evaluation_transaction_failed');
    expect(json.message).toBe('coupon_scope_mismatch');
  });

  it('retorna 422 se o lojista não possuir domínio válido, sem persistir evidência WORM nem chamar RPC', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const offerWithoutDomain = {
      ...sampleOfferData,
      merchants: { domain: '   ' }, // espaço em branco
    };
    const mockDb = mockSupabase(offerWithoutDomain);
    const spyPut = vi.spyOn(storage, 'putEvidence');

    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('missing_merchant_domain');
    expect(spyPut).not.toHaveBeenCalled();
    expect(mockDb.getCapturedRpc()).toBeNull();
  });

  it('mascara mensagem de erro de RPC que vaza detalhes internos de SQL', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const mockDb = mockSupabase(sampleOfferData, null, {
      message:
        'duplicate key value violates unique constraint "offers_pkey" on table "offers"',
      code: '23505',
    });

    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('evaluation_transaction_failed');
    expect(json.message).toBe(
      'Não foi possível concluir a avaliação da oferta no banco de dados.',
    );
    expect(json.message).not.toContain('offers_pkey');
    expect(json.code).toBeUndefined();
  });

  it('avalia com ação de renovacao (action: renovacao)', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const renovacaoBody = { ...validBody, action: 'renovacao' };
    const mockDb = mockSupabase();
    const req = createAdminRequest(renovacaoBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(200);
    const captured = mockDb.getCapturedRpc();
    expect(captured.params.p_action).toBe('renovacao');
  });

  it('retorna 503 service_client_unavailable quando o cliente de serviço não está disponível', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    // Mock createClient para retornar a oferta (prossiga até a RPC),
    // depois getOffersServiceClient() lança por falta de SUPABASE_SERVICE_ROLE_KEY.
    vi.mocked(createClient).mockImplementationOnce(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: sampleOfferData, error: null }),
          }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    }));

    // Sem deps.supabaseClient e sem cabeçalho de webhook: o caminho do admin
    // tenta getOffersServiceClient(), que lança se a chave de serviço não estiver configurada.
    const req = createAdminRequest(validBody);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('service_client_unavailable');
  });

  it('aceita advertised_ean nulo e não quebra a canonicalização', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const bodySemEan = { ...validBody, advertised_ean: null };
    const mockDb = mockSupabase();
    const req = createAdminRequest(bodySemEan);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(200);
    const captured = mockDb.getCapturedRpc();
    expect(captured.params.p_announced_ean).toBeNull();
  });

  it('usa data atual quando captured_at está vazio ou ausente', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-123' } as any,
    });

    const bodySemCapturedAt = { ...validBody, captured_at: '' };
    const mockDb = mockSupabase();
    const req = createAdminRequest(bodySemCapturedAt);
    const res = await handleAvaliarSelo(
      req,
      { params: Promise.resolve({ id: validOfferId }) },
      { storage, supabaseClient: mockDb },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);
    // A evidência foi persistida com hash gerado a partir da data atual
    expect(json.evidence_hash).toHaveLength(64);
  });
});
