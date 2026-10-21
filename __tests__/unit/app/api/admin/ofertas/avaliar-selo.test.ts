/**
 * @fileoverview Testes unitários para avaliar-selo/route.ts
 * @module __tests__/unit/app/api/admin/ofertas/avaliar-selo
 * @description Testa handleAvaliarSelo com validação de UUID, autenticação webhook/admin, canônico de evidência e RPC.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'actor-1', email: 'actor@example.com', role: 'editor' },
  })),
}));

vi.mock('@/lib/admin/audit-service', () => ({
  recordAdminAudit: vi.fn(async () => {}),
}));

vi.mock('@/lib/offers/evidence-canonicalizer', () => ({
  digestEvidence: vi.fn(() => ({
    sha256: 'hash-teste',
    canonicalBytes: new Uint8Array([1, 2, 3]),
    byteSize: 3,
    storagePath: 'evidences/sha256/hash-teste.json',
  })),
  InvalidEvidenceFormatError: class InvalidEvidenceFormatError extends Error {},
}));

vi.mock('@/lib/offers/storage/storage-factory', () => ({
  getOffersEvidenceStorage: vi.fn(() => ({
    putEvidence: vi.fn(async () => ({ reused_existing: false })),
  })),
}));

vi.mock('@/lib/offers/service-client', () => ({
  getOffersServiceClient: vi.fn(() => null),
}));

vi.mock('@/lib/offers/webhook-auth', () => ({
  verifyWebhookSignature: vi.fn(async () => ({
    valid: false,
    reason: 'invalid_signature',
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: null,
            error: { code: 'PGRST116' },
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/utils/api-response', () => ({
  apiErrorResponse: vi.fn((status: number, error: string, message: string) => {
    return new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  sanitizeRpcErrorMessage: vi.fn((msg: string) => msg),
}));

vi.mock('@/lib/utils/http-stream', () => ({
  readLimitedTextBody: vi.fn(async () => ({ ok: true, text: '' })),
}));

import { handleAvaliarSelo } from '@/app/api/admin/ofertas/[id]/avaliar-selo/route';

const OFFER_ID = '00000000-0000-4000-8000-000000000001';

describe('handleAvaliarSelo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando offerId não é UUID válido', async () => {
    const request = new Request(
      `http://localhost/api/admin/ofertas/não-é-uuid/avaliar-selo`,
      {
        method: 'POST',
        duplex: 'half',
      },
    );
    const response = await handleAvaliarSelo(request, {
      params: Promise.resolve({ id: 'não-é-uuid' }),
    });
    expect(response.status).toBe(400);
  });

  it('retorna 401 quando autenticação webhook falha', async () => {
    const request = new Request(
      `http://localhost/api/admin/ofertas/${OFFER_ID}/avaliar-selo`,
      {
        method: 'POST',
        headers: { 'x-gradualinfo-signature': 'invalida' },
        duplex: 'half',
      },
    );
    const response = await handleAvaliarSelo(request, {
      params: Promise.resolve({ id: OFFER_ID }),
    });
    expect(response.status).toBe(401);
  });

  it('retorna 400 quando corpo não é JSON válido', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'editor' },
    } as any);

    const request = new Request(
      `http://localhost/api/admin/ofertas/${OFFER_ID}/avaliar-selo`,
      {
        method: 'POST',
        body: 'não é json',
        duplex: 'half',
      },
    );
    const response = await handleAvaliarSelo(request, {
      params: Promise.resolve({ id: OFFER_ID }),
    });
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando advertised_sku está faltando', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'editor' },
    } as any);
    const { readLimitedTextBody } = await import('@/lib/utils/http-stream');
    vi.mocked(readLimitedTextBody).mockResolvedValueOnce({
      ok: true,
      text: JSON.stringify({
        raw_proof: { proof_type: 'selector_text_extract', content: 'conteúdo' },
      }),
    } as any);

    const request = new Request(
      `http://localhost/api/admin/ofertas/${OFFER_ID}/avaliar-selo`,
      {
        method: 'POST',
        duplex: 'half',
      },
    );
    const response = await handleAvaliarSelo(request, {
      params: Promise.resolve({ id: OFFER_ID }),
    });
    expect(response.status).toBe(400);
  });

  it('retorna 404 quando oferta não encontrada', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'editor' },
    } as any);
    const { readLimitedTextBody } = await import('@/lib/utils/http-stream');
    vi.mocked(readLimitedTextBody).mockResolvedValueOnce({
      ok: true,
      text: JSON.stringify({
        advertised_sku: 'SKU-123',
        raw_proof: { proof_type: 'selector_text_extract', content: 'conteúdo' },
      }),
    } as any);

    const request = new Request(
      `http://localhost/api/admin/ofertas/${OFFER_ID}/avaliar-selo`,
      {
        method: 'POST',
        duplex: 'half',
      },
    );
    const response = await handleAvaliarSelo(request, {
      params: Promise.resolve({ id: OFFER_ID }),
    });
    expect(response.status).toBe(404);
  });
});
