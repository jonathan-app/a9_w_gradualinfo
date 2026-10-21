/**
 * @fileoverview Testes unitários para a rota POST /api/ingest/ofertas (Spec 0021 / AC-08).
 * Validação rigorosa dos seis critérios de aceite:
 * 1. HMAC inválido rejeitado antes do consumo do nonce.
 * 2. Nonce compartilhado aceito uma única vez sob concorrência.
 * 3. Reenvio legítimo com novo nonce e mesma chave de operação retornando o resultado anterior.
 * 4. Mesma chave com payload diferente retornando 409.
 * 5. Transação confirmada com resposta perdida sem duplicar auditoria nem renovar datas.
 * 6. Storage indisponível retornando 503, sem conceder selo.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { handleIngestOfertas, POST } from '@/app/api/ingest/ofertas/route';
import {
  buildIngestStringToSign,
  computeIngestSignature,
  computeRawBodyHash,
} from '@/lib/offers/ingest-auth';
import {
  EvidenceStorageUnavailableError,
  type EvidenceStorageAdapter,
} from '@/lib/offers/storage/evidence-storage-adapter';
import { MemoryEvidenceStorageAdapter } from '@/lib/offers/storage/memory-adapter';

describe('handleIngestOfertas (POST /api/ingest/ofertas)', () => {
  const secret = 'super-secret-collector-key-32-chars';
  const validOfferId = 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329';
  const collectorId = 'collector-sp-crawler-01';
  let storage: MemoryEvidenceStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new MemoryEvidenceStorageAdapter();
    process.env.OFFERS_INGEST_SECRET = secret;
  });

  const sampleOfferData = {
    id: validOfferId,
    product_id: 'e4d3c2b1-0000-4000-8000-000000000001',
    merchant_id: 'f5e4d3c2-0000-4000-8000-000000000002',
    price_cents: 299900,
    original_price_cents: 349900,
    payment_method: 'a_vista',
    installment_count: 1,
    installment_price_cents: 299900,
    shipping_cost_cents: 0,
    affiliate_url: 'https://www.mercadolivre.com.br/p/MLB12345',
    badge_status: 'unverified',
    badge_expires_at: null,
    verified_effective_price_cents: null,
    merchants: { domain: 'mercadolivre.com.br' },
    products: { specs_json: { color: 'black' } },
  };

  const validBody = {
    offer_id: validOfferId,
    advertised_sku: 'SKU-TEST-123',
    advertised_specs: { color: 'black' },
    advertised_ean: '7891234567890',
    region_code: 'SP',
    raw_proof: {
      proof_type: 'api_response_json',
      content: '{"price":299900,"sku":"SKU-TEST-123"}',
    },
    operation_key: 'op-test-key-001',
  };

  function createSignedRequest(
    body: Record<string, unknown> | string,
    options: {
      collectorId?: string;
      timestamp?: number;
      nonce?: string;
      signature?: string;
      secretToUse?: string;
      path?: string;
    } = {},
  ) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const ts = options.timestamp ?? Math.floor(Date.now() / 1000);
    const cid = options.collectorId ?? collectorId;
    const n =
      options.nonce ?? `nonce-${Math.random().toString(36).substring(2)}`;
    const path = options.path ?? '/api/ingest/ofertas';

    const rawBodyHash = computeRawBodyHash(rawBody);
    const stringToSign = buildIngestStringToSign(
      'POST',
      path,
      cid,
      ts,
      n,
      rawBodyHash,
    );
    const validSig = computeIngestSignature(
      options.secretToUse ?? secret,
      stringToSign,
    );

    const headers = new Headers({
      'content-type': 'application/json',
      'x-collector-id': cid,
      'x-timestamp': String(ts),
      'x-nonce': n,
      'x-signature-sha256': options.signature ?? validSig,
    });

    return new Request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers,
      body: rawBody,
    });
  }

  // Helper de mock do Supabase com rastreamento de chamadas
  function createSupabaseMock(overrides?: {
    offerData?: any;
    consumedNonces?: Set<string>;
    rpcHandler?: (
      name: string,
      params: any,
    ) => Promise<{ data: any; error: any }>;
  }) {
    const consumedNonces = overrides?.consumedNonces ?? new Set<string>();
    const nonceInsertCalls: any[] = [];
    const rpcCalls: any[] = [];

    const client = {
      from: (table: string) => {
        if (table === 'offers_ingest_nonces') {
          return {
            insert: async (values: any) => {
              nonceInsertCalls.push(values);
              const key = `${values.collector_id}:${values.nonce}`;
              if (consumedNonces.has(key)) {
                return {
                  error: {
                    code: '23505',
                    message: `duplicate key value violates unique constraint "offers_ingest_nonces_pkey"`,
                  },
                };
              }
              consumedNonces.add(key);
              return { error: null };
            },
            select: () => ({
              eq: () => ({ single: async () => ({ data: null, error: null }) }),
            }),
          };
        }
        if (table === 'offers') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: overrides?.offerData ?? sampleOfferData,
                  error:
                    overrides?.offerData === null
                      ? { message: 'not found' }
                      : null,
                }),
              }),
            }),
            insert: async () => ({ error: null }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: null, error: null }) }),
          }),
          insert: async () => ({ error: null }),
        };
      },
      rpc: async (name: string, params: any) => {
        rpcCalls.push({ name, params });
        if (overrides?.rpcHandler) {
          return overrides.rpcHandler(name, params);
        }
        return {
          data: [
            {
              approved: true,
              badge_status: 'verified',
              reason: 'approved',
              effective_price_cents: 299900,
              median_30d_cents: 350000,
              audit_id: 'a1b2c3d4-0000-4000-8000-000000000001',
              badge_expires_at: new Date(Date.now() + 86400000).toISOString(),
              reused_existing: false,
            },
          ],
          error: null,
        };
      },
      nonceInsertCalls,
      rpcCalls,
      consumedNonces,
    };

    return client;
  }

  it('1. rejeita HMAC inválido ANTES do consumo do nonce (nonce não é tocado nem consumido)', async () => {
    const supabaseMock = createSupabaseMock();
    const nonce = 'unique-nonce-hmac-test';

    // Cria requisição com assinatura HMAC forjada/inválida
    const req = createSignedRequest(validBody, {
      nonce,
      signature:
        '0000000000000000000000000000000000000000000000000000000000000000',
    });

    const res = await handleIngestOfertas(req, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('invalid_signature');

    // Validação estrita: a tabela de nonces não foi tocada (0 inserts)
    expect(supabaseMock.nonceInsertCalls).toHaveLength(0);
    expect(supabaseMock.consumedNonces.has(`${collectorId}:${nonce}`)).toBe(
      false,
    );
  });

  it('2. aceita nonce compartilhado uma única vez sob concorrência (segunda chamada simultânea retorna 409)', async () => {
    const consumedNonces = new Set<string>();
    const supabaseMock = createSupabaseMock({ consumedNonces });
    const sharedNonce = 'concurrent-nonce-12345';

    const req1 = createSignedRequest(validBody, { nonce: sharedNonce });
    const req2 = createSignedRequest(validBody, { nonce: sharedNonce });

    // Dispara as duas requisições concorrentemente
    const [res1, res2] = await Promise.all([
      handleIngestOfertas(req1, {
        storage,
        supabaseClient: supabaseMock as any,
        secret,
      }),
      handleIngestOfertas(req2, {
        storage,
        supabaseClient: supabaseMock as any,
        secret,
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    const conflictJson = await conflictRes.json();
    expect(conflictJson.error).toBe('nonce_already_consumed');
  });

  it('3. retorna resultado anterior com reused_existing = true em reenvio legítimo com novo nonce e mesma chave de operação', async () => {
    const operationKey = 'op-replay-identical-001';
    let rpcCallCount = 0;

    const initialBadgeExpiresAt = '2026-10-18T10:00:00.000Z';
    const initialAuditId = 'a1b2c3d4-1111-4000-8000-000000000001';

    const supabaseMock = createSupabaseMock({
      rpcHandler: async (_name, params) => {
        rpcCallCount++;
        expect(params.p_operation_key).toBe(operationKey);

        if (rpcCallCount === 1) {
          return {
            data: [
              {
                approved: true,
                badge_status: 'verified',
                reason: 'approved',
                effective_price_cents: 299900,
                median_30d_cents: 350000,
                audit_id: initialAuditId,
                badge_expires_at: initialBadgeExpiresAt,
                reused_existing: false,
              },
            ],
            error: null,
          };
        }

        // Segunda chamada (idempotente): reuso do registro existente
        return {
          data: [
            {
              approved: true,
              badge_status: 'verified',
              reason: 'approved',
              effective_price_cents: 299900,
              median_30d_cents: 350000,
              audit_id: initialAuditId,
              badge_expires_at: initialBadgeExpiresAt,
              reused_existing: true,
            },
          ],
          error: null,
        };
      },
    });

    // 1º envio com nonce-A
    const req1 = createSignedRequest(
      { ...validBody, operation_key: operationKey },
      { nonce: 'nonce-A' },
    );
    const res1 = await handleIngestOfertas(req1, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.reused_existing).toBe(false);
    expect(json1.audit_id).toBe(initialAuditId);

    // 2º envio legítimo com novo nonce-B e MESMA operation_key
    const req2 = createSignedRequest(
      { ...validBody, operation_key: operationKey },
      { nonce: 'nonce-B' },
    );
    const res2 = await handleIngestOfertas(req2, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.reused_existing).toBe(true);
    expect(json2.audit_id).toBe(initialAuditId);
    expect(json2.badge_expires_at).toBe(initialBadgeExpiresAt);
  });

  it('4. retorna 409 quando a mesma operation_key for enviada com payload diferente (conflito)', async () => {
    const operationKey = 'op-conflict-001';

    const supabaseMock = createSupabaseMock({
      rpcHandler: async (_name, params) => {
        expect(params.p_operation_key).toBe(operationKey);
        // Simula exceção 23505 da migration: operation_key_payload_conflict
        return {
          data: null,
          error: {
            code: '23505',
            message: `operation_key_payload_conflict: operation ${operationKey} already executed with different evidence hash 1111111111111111111111111111111111111111111111111111111111111111`,
          },
        };
      },
    });

    const divergentBody = {
      ...validBody,
      advertised_sku: 'SKU-DIVERGENT-999',
      operation_key: operationKey,
    };

    const req = createSignedRequest(divergentBody, {
      nonce: 'nonce-divergent-1',
    });
    const res = await handleIngestOfertas(req, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('operation_key_payload_conflict');
    expect(json.message).toContain('operation_key_payload_conflict');
  });

  it('5. recupera transação confirmada com resposta perdida sem duplicar auditoria nem renovar datas', async () => {
    const operationKey = 'op-lost-response-001';
    const originalAuditId = 'b2c3d4e5-2222-4000-8000-000000000002';
    const originalExpiresAt = '2026-10-17T15:30:00.000Z';

    const supabaseMock = createSupabaseMock({
      rpcHandler: async (_name, params) => {
        // A RPC identifica que a transação já foi confirmada anteriormente no banco
        expect(params.p_operation_key).toBe(operationKey);
        return {
          data: [
            {
              approved: true,
              badge_status: 'verified',
              reason: 'approved',
              effective_price_cents: 299900,
              median_30d_cents: 350000,
              audit_id: originalAuditId,
              badge_expires_at: originalExpiresAt,
              reused_existing: true,
            },
          ],
          error: null,
        };
      },
    });

    const req = createSignedRequest(
      { ...validBody, operation_key: operationKey },
      { nonce: 'nonce-retry-lost-response' },
    );
    const res = await handleIngestOfertas(req, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.reused_existing).toBe(true);
    expect(json.audit_id).toBe(originalAuditId);
    expect(json.badge_expires_at).toBe(originalExpiresAt);
  });

  it('6. retorna 503 quando storage estiver indisponível, sem conceder selo nem chamar RPC', async () => {
    const brokenStorage: EvidenceStorageAdapter = {
      putEvidence: async () => {
        throw new EvidenceStorageUnavailableError('Simulated storage outage');
      },
      getEvidence: async () => null,
      hasEvidence: async () => false,
    };

    const supabaseMock = createSupabaseMock();
    const req = createSignedRequest(validBody, { nonce: 'nonce-storage-down' });

    const res = await handleIngestOfertas(req, {
      storage: brokenStorage,
      supabaseClient: supabaseMock as any,
      secret,
    });

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('storage_unavailable');

    // Validação de segurança fail-closed: RPC NÃO foi chamada
    expect(supabaseMock.rpcCalls).toHaveLength(0);
  });

  it('rejeita cabeçalhos ausentes com 400', async () => {
    const req = new Request('http://localhost:3000/api/ingest/ofertas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const res = await handleIngestOfertas(req, { storage, secret });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('missing_collector_headers');
  });

  it('rejeita timestamp fora da janela de 300s com 401', async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 500;
    const req = createSignedRequest(validBody, { timestamp: expiredTimestamp });

    const res = await handleIngestOfertas(req, { storage, secret });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('timestamp_out_of_window');
  });

  it('rejeita payload em streaming que excede o limite máximo com 413', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('a'.repeat(300_000)));
        controller.enqueue(encoder.encode('b'.repeat(300_000)));
        controller.close();
      },
    });

    const req = new Request('http://localhost:3000/api/ingest/ofertas', {
      method: 'POST',
      headers: {
        'x-collector-id': 'col-01',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-nonce': 'nonce-stream-overflow',
        'x-signature-sha256': 'sig',
      },
      body: stream,
      // @ts-expect-error duplex
      duplex: 'half',
    });

    const res = await handleIngestOfertas(req, { storage, secret });
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe('payload_too_large');
  });

  it('sanitiza vazamento de erro de banco de dados no retorno 422 da RPC', async () => {
    const supabaseMock = createSupabaseMock({
      rpcHandler: async () => {
        return {
          data: null,
          error: {
            message:
              'violates foreign key constraint "fk_offers_merchants" on table "offers"',
            code: '23503',
          },
        };
      },
    });

    const req = createSignedRequest(validBody);
    const res = await handleIngestOfertas(req, {
      storage,
      supabaseClient: supabaseMock as any,
      secret,
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('evaluation_transaction_failed');
    // Garante que não vazou o nome da tabela nem da constraint
    expect(json.message).not.toContain('fk_offers_merchants');
    expect(json.message).not.toContain('offers');
    expect(json.message).toBe(
      'Não foi possível concluir a avaliação da oferta no banco de dados.',
    );
    expect(json.code).toBeUndefined();
  });

  it('não expõe mensagem de exceção interna ou stack trace em erro 500 não tratado no POST', async () => {
    const brokenReq = {
      headers: {
        get: () => {
          throw new Error(
            'postgresql://postgres:secret@127.0.0.1:54322/postgres relation "offers" failed\n    at internal (/app/route.ts:10:2)',
          );
        },
      },
    } as unknown as Request;

    const res = await POST(brokenReq);
    expect(res.status).toBe(500);
    expect(res.headers.get('cache-control')).toBe('private, no-store');

    const json = await res.json();
    expect(json).toEqual({
      error: 'internal_error',
      message: 'Erro interno ao processar a ingestão da oferta.',
    });
    expect(JSON.stringify(json)).not.toContain('postgresql://');
    expect(JSON.stringify(json)).not.toContain('offers');
    expect(JSON.stringify(json)).not.toContain('/app/route.ts');
    expect(json.details).toBeUndefined();
  });
});
