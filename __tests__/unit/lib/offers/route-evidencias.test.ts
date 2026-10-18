/**
 * @fileoverview Testes unitários para a rota /api/admin/evidencias/[hash] (Spec 0017 / Fatia 4).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { handleGetEvidencia } from '@/app/api/admin/evidencias/[hash]/route';
import {
  MemoryEvidenceStorageAdapter,
  resetEvidenceStorage,
} from '@/lib/offers/storage/memory-adapter';

// Mock de assertAdminApiAuth
vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(),
}));

import { assertAdminApiAuth } from '@/lib/admin/auth';

describe('handleGetEvidencia (GET /api/admin/evidencias/[hash])', () => {
  let storage: MemoryEvidenceStorageAdapter;
  const sampleHash =
    'ecfc4cb89268b70aa557c4abf8dbe05f2a9dc3980a82a68bbfb731dfa169d15b';
  const sampleBytes = Buffer.from('{"status":"verified_sample"}', 'utf8');

  beforeEach(() => {
    vi.clearAllMocks();
    resetEvidenceStorage();
    storage = new MemoryEvidenceStorageAdapter();
  });

  it('rejeita com a resposta do guard quando a autenticação admin AAL2 falha', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: false,
      response: new Response('Acesso negado', { status: 403 }),
    });

    const req = new Request(
      `https://gradualinfo.com.br/api/admin/evidencias/${sampleHash}`,
    );
    const res = await handleGetEvidencia(
      req,
      { params: Promise.resolve({ hash: sampleHash }) },
      { storage },
    );

    expect(res.status).toBe(403);
  });

  it('retorna 400 se o hash não tiver formato de 64 caracteres hexadecimais', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-uuid' } as any,
    });

    const req = new Request(
      'https://gradualinfo.com.br/api/admin/evidencias/invalid-hash',
    );
    const res = await handleGetEvidencia(
      req,
      { params: Promise.resolve({ hash: 'invalid-hash' }) },
      { storage },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_evidence_hash');
  });

  it('retorna 404 se a evidência não existir no storage WORM', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-uuid' } as any,
    });

    const req = new Request(
      `https://gradualinfo.com.br/api/admin/evidencias/${sampleHash}`,
    );
    const res = await handleGetEvidencia(
      req,
      { params: Promise.resolve({ hash: sampleHash }) },
      { storage },
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('evidence_not_found');
  });

  it('retorna 503 se o storage de evidências estiver indisponível', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-uuid' } as any,
    });

    storage.setSimulateUnavailable(true);

    const req = new Request(
      `https://gradualinfo.com.br/api/admin/evidencias/${sampleHash}`,
    );
    const res = await handleGetEvidencia(
      req,
      { params: Promise.resolve({ hash: sampleHash }) },
      { storage },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('storage_unavailable');
  });

  it('retorna 200 com URL assinada temporária para evidência existente', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: true,
      user: { id: 'admin-uuid' } as any,
    });

    await storage.putEvidence(sampleHash, sampleBytes, 730);

    const req = new Request(
      `https://gradualinfo.com.br/api/admin/evidencias/${sampleHash}`,
    );
    const res = await handleGetEvidencia(
      req,
      { params: Promise.resolve({ hash: sampleHash }) },
      { storage },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evidence_hash).toBe(sampleHash);
    expect(json.storage_path).toBe(`evidences/sha256/${sampleHash}.json`);
    expect(json.byte_size).toBe(sampleBytes.length);
    expect(json.download_url).toContain(
      'mock_signature=worm_compliance_verified',
    );
    expect(json.expires_in_seconds).toBe(900);
  });
});
