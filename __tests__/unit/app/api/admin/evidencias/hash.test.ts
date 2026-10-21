/**
 * @fileoverview Testes unitários para evidencias/[hash]/route.ts
 * @module __tests__/unit/app/api/admin/evidencias/hash
 * @description Testa GET /api/admin/evidencias/[hash] com validação de hash SHA-256, busca de evidência e URL assinada.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'actor-1', email: 'actor@example.com', role: 'admin' },
  })),
}));

vi.mock('@/lib/offers/storage/memory-adapter', () => ({
  getEvidenceStorage: vi.fn(() => ({
    headEvidence: vi.fn(async () => ({ exists: false, byte_size: 0 })),
    getPresignedUrl: vi.fn(
      async () => 'https://storage.example.com/signed-url',
    ),
  })),
}));

vi.mock('@/lib/offers/storage/evidence-storage-adapter', () => ({
  EvidenceNotFoundError: class EvidenceNotFoundError extends Error {},
  EvidenceStorageUnavailableError: class EvidenceStorageUnavailableError extends Error {},
}));

vi.mock('@/lib/utils/api-response', () => ({
  apiErrorResponse: vi.fn((status: number, error: string, message: string) => {
    return new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

import { handleGetEvidencia } from '@/app/api/admin/evidencias/[hash]/route';

describe('handleGetEvidencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando hash não é SHA-256 válido', async () => {
    const request = new Request(
      'http://localhost/api/admin/evidencias/não-é-hash',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetEvidencia(request, {
      params: Promise.resolve({ hash: 'não-é-hash' }),
    });
    expect(response.status).toBe(400);
  });

  it('retorna 404 quando evidência não existe', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'admin' },
    } as any);
    const { getEvidenceStorage } =
      await import('@/lib/offers/storage/memory-adapter');
    vi.mocked(getEvidenceStorage).mockReturnValueOnce({
      headEvidence: vi.fn(async () => ({ exists: false, byte_size: 0 })),
    } as any);

    const request = new Request(
      'http://localhost/api/admin/evidencias/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetEvidencia(request, {
      params: Promise.resolve({
        hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      }),
    });
    expect(response.status).toBe(404);
  });

  it('retorna 200 com URL assinada quando evidência existe', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'admin' },
    } as any);
    const { getEvidenceStorage } =
      await import('@/lib/offers/storage/memory-adapter');
    vi.mocked(getEvidenceStorage).mockReturnValueOnce({
      headEvidence: vi.fn(async () => ({ exists: true, byte_size: 1024 })),
      getPresignedUrl: vi.fn(
        async () => 'https://storage.example.com/signed-url',
      ),
    } as any);

    const request = new Request(
      'http://localhost/api/admin/evidencias/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetEvidencia(request, {
      params: Promise.resolve({
        hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.evidence_hash).toBe(
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );
    expect(body.download_url).toBe('https://storage.example.com/signed-url');
    expect(body.expires_in_seconds).toBe(900);
  });

  it('retorna 503 quando storage está indisponível', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'actor-1', email: 'actor@example.com', role: 'admin' },
    } as any);
    const { getEvidenceStorage } =
      await import('@/lib/offers/storage/memory-adapter');
    vi.mocked(getEvidenceStorage).mockReturnValueOnce({
      headEvidence: vi.fn(async () => {
        throw new (
          await import('@/lib/offers/storage/evidence-storage-adapter')
        ).EvidenceStorageUnavailableError();
      }),
    } as any);

    const request = new Request(
      'http://localhost/api/admin/evidencias/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetEvidencia(request, {
      params: Promise.resolve({
        hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      }),
    });
    expect(response.status).toBe(503);
  });
});
