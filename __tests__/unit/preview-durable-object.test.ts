/**
 * @fileoverview Testes unitários do armazenamento de sessões via Durable Object (spec 0006).
 * @module __tests__/unit/preview-durable-object.test
 * @description Valida ciclo de vida, persistência e consistência forte do repositório
 *   de sessões de preview: criação antes do cookie, validação por session_id, expiração,
 *   revogação imediata e tolerância a falhas.
 * @dependencies vitest, lib/preview/durable-object.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPreviewSessionStore,
  PreviewSessionDO,
} from '@/lib/preview/durable-object';

describe('PreviewSessionStore (Consistência Forte e Revogação por session_id)', () => {
  let store: InMemoryPreviewSessionStore;

  beforeEach(() => {
    store = new InMemoryPreviewSessionStore();
    store.clear();
  });

  it('cria sessão com revoked: false e prazos calculados', async () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const nowSec = 1700000000;
    await store.createSession({
      session_id: sessionId,
      issued_at: nowSec,
      expires_at: nowSec + 1800,
    });

    const validation = await store.validateSession(sessionId, nowSec * 1000);
    expect(validation.valid).toBe(true);
    expect(validation.revoked).toBe(false);
    expect(validation.expired).toBe(false);
    expect(validation.record?.session_id).toBe(sessionId);
  });

  it('invalida sessão quando expires_at é ultrapassado', async () => {
    const sessionId = '22222222-2222-4222-8222-222222222222';
    const nowSec = 1700000000;
    await store.createSession({
      session_id: sessionId,
      issued_at: nowSec,
      expires_at: nowSec + 1800,
    });

    // 1 segundo antes de expirar: válido
    const validCheck = await store.validateSession(
      sessionId,
      (nowSec + 1799) * 1000,
    );
    expect(validCheck.valid).toBe(true);

    // No momento ou após expires_at: expirado
    const expiredCheck = await store.validateSession(
      sessionId,
      (nowSec + 1800) * 1000,
    );
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.expired).toBe(true);
  });

  it('revoga imediatamente uma sessão ativa', async () => {
    const sessionId = '33333333-3333-4333-8333-333333333333';
    const nowSec = 1700000000;
    await store.createSession({
      session_id: sessionId,
      issued_at: nowSec,
      expires_at: nowSec + 1800,
    });

    const initial = await store.validateSession(sessionId, nowSec * 1000);
    expect(initial.valid).toBe(true);

    const revoked = await store.revokeSession(sessionId, (nowSec + 60) * 1000);
    expect(revoked).toBe(true);

    const postRevocation = await store.validateSession(
      sessionId,
      (nowSec + 60) * 1000,
    );
    expect(postRevocation.valid).toBe(false);
    expect(postRevocation.revoked).toBe(true);
    expect(postRevocation.record?.revoked).toBe(true);
  });

  it('lança erro quando simulateFailure está ativo (simulando DO indisponível)', async () => {
    store.simulateFailure = true;
    await expect(
      store.createSession({
        session_id: 'fail-session',
        issued_at: 1000,
        expires_at: 2800,
      }),
    ).rejects.toThrow('Falha simulada de I/O');

    await expect(store.validateSession('fail-session')).rejects.toThrow(
      'Falha simulada de conectividade',
    );

    await expect(store.revokeSession('fail-session')).rejects.toThrow(
      'Falha simulada de I/O',
    );
  });
});

describe('PreviewSessionDO (Classe Cloudflare Durable Object)', () => {
  let mockStorage: Map<string, any>;
  let doInstance: PreviewSessionDO;

  beforeEach(() => {
    mockStorage = new Map<string, any>();
    const mockState = {
      storage: {
        get: async (key: string) => mockStorage.get(key),
        put: async (key: string, val: any) => mockStorage.set(key, val),
        delete: async (key: string) => mockStorage.delete(key),
      },
    };
    doInstance = new PreviewSessionDO(mockState, {});
  });

  it('atende rota /session/create e persiste no storage', async () => {
    const sessionId = '44444444-4444-4444-8444-444444444444';
    const req = new Request('http://do/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        issued_at: 1700000000,
        expires_at: 1700001800,
      }),
    });

    const res = await doInstance.fetch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const stored = mockStorage.get(sessionId);
    expect(stored).toBeDefined();
    expect(stored.session_id).toBe(sessionId);
    expect(stored.revoked).toBe(false);
  });

  it('atende rota /session/validate e detecta sessão válida ou inexistente', async () => {
    const sessionId = '55555555-5555-4555-8555-555555555555';
    mockStorage.set(sessionId, {
      session_id: sessionId,
      issued_at: 1000,
      expires_at: 2800,
      revoked: false,
    });

    const reqValid = new Request(
      `http://do/session/validate?id=${sessionId}&now=1500000`,
    );
    const resValid = await doInstance.fetch(reqValid);
    expect(resValid.status).toBe(200);
    const bodyValid = await resValid.json();
    expect(bodyValid.valid).toBe(true);

    const reqMissing = new Request(
      'http://do/session/validate?id=missing&now=1500000',
    );
    const resMissing = await doInstance.fetch(reqMissing);
    const bodyMissing = await resMissing.json();
    expect(bodyMissing.valid).toBe(false);
  });

  it('atende rota /session/revoke e grava revoked: true síncronamente', async () => {
    const sessionId = '66666666-6666-4666-8666-666666666666';
    mockStorage.set(sessionId, {
      session_id: sessionId,
      issued_at: 1000,
      expires_at: 2800,
      revoked: false,
    });

    const reqRevoke = new Request('http://do/session/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, now: 1500000 }),
    });

    const resRevoke = await doInstance.fetch(reqRevoke);
    expect(resRevoke.status).toBe(200);

    const updated = mockStorage.get(sessionId);
    expect(updated.revoked).toBe(true);
  });
});
