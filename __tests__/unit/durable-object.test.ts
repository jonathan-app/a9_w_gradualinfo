/**
 * @fileoverview Testes do armazenamento de sessões de preview.
 * @module __tests__/unit/durable-object
 * @description Comprova ciclo de vida em memória, revogação, expiração,
 *   simulação de falha e o stub do Durable Object com estado fake.
 * @dependencies vitest, @/lib/preview/durable-object.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  InMemoryPreviewSessionStore,
  CloudflareDurableObjectSessionStore,
  PreviewSessionDO,
  getLocalPreviewSessionStore,
  getPreviewSessionStore,
} from '@/lib/preview/durable-object';

describe('InMemoryPreviewSessionStore', () => {
  let store: InMemoryPreviewSessionStore;

  beforeEach(() => {
    store = new InMemoryPreviewSessionStore();
  });

  it('cria e valida sessão válida', async () => {
    const now = Date.now();
    await store.createSession({
      session_id: 'abc',
      issued_at: Math.floor(now / 1000),
      expires_at: Math.floor(now / 1000) + 1800,
    });
    const result = await store.validateSession('abc', now);
    expect(result.valid).toBe(true);
    expect(result.revoked).toBe(false);
    expect(result.expired).toBe(false);
    expect(result.record?.session_id).toBe('abc');
  });

  it('retorna inválida para sessão inexistente', async () => {
    const result = await store.validateSession('nope');
    expect(result.valid).toBe(false);
  });

  it('expira sessão quando o tempo passa', async () => {
    const now = Date.now();
    await store.createSession({
      session_id: 'abc',
      issued_at: Math.floor(now / 1000),
      expires_at: Math.floor(now / 1000) + 10,
    });
    const result = await store.validateSession('abc', now + 20_000);
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('revoga sessão existente', async () => {
    const now = Date.now();
    await store.createSession({
      session_id: 'abc',
      issued_at: Math.floor(now / 1000),
      expires_at: Math.floor(now / 1000) + 1800,
    });
    expect(await store.revokeSession('abc', now)).toBe(true);
    const result = await store.validateSession('abc', now);
    expect(result.revoked).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('revoga sessão inexistente criando registro de revogação', async () => {
    const now = Date.now();
    expect(await store.revokeSession('fantasma', now)).toBe(true);
    const result = await store.validateSession('fantasma', now);
    expect(result.revoked).toBe(true);
  });

  it('lança falha simulada na criação', async () => {
    store.simulateFailure = true;
    await expect(
      store.createSession({ session_id: 'x', issued_at: 0, expires_at: 1 }),
    ).rejects.toThrow();
  });

  it('lança falha simulada na validação', async () => {
    store.simulateFailure = true;
    await expect(store.validateSession('x')).rejects.toThrow();
  });

  it('lança falha simulada na revogação', async () => {
    store.simulateFailure = true;
    await expect(store.revokeSession('x')).rejects.toThrow();
  });

  it('clear limpa estado e simulação', async () => {
    store.simulateFailure = true;
    store.clear();
    expect(store.simulateFailure).toBe(false);
    await expect(
      store.createSession({ session_id: 'y', issued_at: 0, expires_at: 1 }),
    ).resolves.toBeUndefined();
  });
});

describe('getPreviewSessionStore e getLocalPreviewSessionStore', () => {
  it('retorna o singleton local fora do runtime Cloudflare', () => {
    const a = getPreviewSessionStore();
    const b = getLocalPreviewSessionStore();
    expect(a).toBe(b);
  });
});

describe('CloudflareDurableObjectSessionStore', () => {
  function makeNamespace(handler: (req: Request) => Promise<Response>) {
    return {
      idFromName: vi.fn(() => 'fake-id'),
      get: vi.fn(() => ({ fetch: handler })),
    };
  }

  it('cria sessão via stub', async () => {
    const ns = makeNamespace(async () =>
      Response.json({ success: true }, { status: 200 }),
    );
    const store = new CloudflareDurableObjectSessionStore(ns);
    await store.createSession({ session_id: 'a', issued_at: 1, expires_at: 2 });
    expect(ns.idFromName).toHaveBeenCalledWith('global-preview-sessions');
  });

  it('lança erro quando criação retorna não OK', async () => {
    const ns = makeNamespace(async () => new Response('fail', { status: 500 }));
    const store = new CloudflareDurableObjectSessionStore(ns);
    await expect(
      store.createSession({ session_id: 'a', issued_at: 1, expires_at: 2 }),
    ).rejects.toThrow('HTTP 500');
  });

  it('valida sessão via stub', async () => {
    const ns = makeNamespace(async () =>
      Response.json({ valid: true, revoked: false, expired: false }),
    );
    const store = new CloudflareDurableObjectSessionStore(ns);
    const result = await store.validateSession('abc', 1000);
    expect(result.valid).toBe(true);
  });

  it('lança erro quando validação retorna não OK', async () => {
    const ns = makeNamespace(async () => new Response('x', { status: 502 }));
    const store = new CloudflareDurableObjectSessionStore(ns);
    await expect(store.validateSession('abc')).rejects.toThrow('HTTP 502');
  });

  it('revoga sessão via stub', async () => {
    const ns = makeNamespace(async () => Response.json({ success: true }));
    const store = new CloudflareDurableObjectSessionStore(ns);
    expect(await store.revokeSession('abc', 1000)).toBe(true);
  });

  it('retorna false quando revogação retorna success false', async () => {
    const ns = makeNamespace(async () => Response.json({ success: false }));
    const store = new CloudflareDurableObjectSessionStore(ns);
    expect(await store.revokeSession('abc')).toBe(false);
  });

  it('lança erro quando revogação retorna não OK', async () => {
    const ns = makeNamespace(async () => new Response('x', { status: 500 }));
    const store = new CloudflareDurableObjectSessionStore(ns);
    await expect(store.revokeSession('abc')).rejects.toThrow('HTTP 500');
  });
});

describe('PreviewSessionDO', () => {
  function makeState() {
    const map = new Map<string, unknown>();
    return {
      storage: {
        get: vi.fn(async (k: string) => map.get(k)),
        put: vi.fn(async (k: string, v: unknown) => {
          map.set(k, v);
        }),
      },
    };
  }

  it('cria sessão via fetch', async () => {
    const state = makeState();
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(
      new Request('http://do/session/create', {
        method: 'POST',
        body: JSON.stringify({ session_id: 'a', issued_at: 1, expires_at: 2 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(state.storage.put).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ session_id: 'a', revoked: false }),
    );
  });

  it('valida sessão existente', async () => {
    const state = makeState();
    state.storage.get.mockResolvedValueOnce({
      session_id: 'a',
      issued_at: 1,
      expires_at: 9999999999,
      revoked: false,
    });
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(
      new Request('http://do/session/validate?id=a&now=1000'),
    );
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it('retorna 400 sem id', async () => {
    const state = makeState();
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(new Request('http://do/session/validate'));
    expect(res.status).toBe(400);
  });

  it('retorna inválida para sessão inexistente', async () => {
    const state = makeState();
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(
      new Request('http://do/session/validate?id=nope'),
    );
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it('revoga sessão existente', async () => {
    const state = makeState();
    state.storage.get.mockResolvedValueOnce({
      session_id: 'a',
      issued_at: 1,
      expires_at: 9999999999,
      revoked: false,
    });
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(
      new Request('http://do/session/revoke', {
        method: 'POST',
        body: JSON.stringify({ session_id: 'a' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(state.storage.put).toHaveBeenCalled();
  });

  it('revoga sessão inexistente criando registro', async () => {
    const state = makeState();
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(
      new Request('http://do/session/revoke', {
        method: 'POST',
        body: JSON.stringify({ session_id: 'nova' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(state.storage.put).toHaveBeenCalled();
  });

  it('retorna 404 para rota desconhecida', async () => {
    const state = makeState();
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(new Request('http://do/outra'));
    expect(res.status).toBe(404);
  });

  it('retorna 500 em erro interno sem expor mensagem da exceção', async () => {
    const state = makeState();
    state.storage.get.mockRejectedValue(new Error('boom_internal_do_leak'));
    const do_ = new PreviewSessionDO(state as never);
    const res = await do_.fetch(new Request('http://do/session/validate?id=x'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'internal_error' });
    expect(JSON.stringify(body)).not.toContain('boom_internal_do_leak');
  });
});
