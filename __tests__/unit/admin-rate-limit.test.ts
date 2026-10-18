// @vitest-environment node
/**
 * @fileoverview Regressões do DO administrativo e do protocolo fechado.
 * @module __tests__/unit/admin-rate-limit
 * @description Usa SQLite Node em processo, sem confundir com integração Cloudflare.
 * @dependencies vitest, node:sqlite, lib/admin/rate-limit.
 */
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const context = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: context.get,
}));
import {
  AdminRateLimitDO,
  type AdminRateState,
} from '@/lib/admin/rate-limit-do';
import {
  consumeAdminRateLimit,
  adminRateLimitResponse,
} from '@/lib/admin/rate-limit';

let db: DatabaseSync;
let state: AdminRateState;
let object: AdminRateLimitDO;
let failWrite = false;
const setAlarm = vi.fn();
const deleteAlarm = vi.fn();
function request(operation: string) {
  return new Request('http://admin-rate-limit/consume', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operation }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  failWrite = false;
  db = new DatabaseSync(':memory:');
  let tail = Promise.resolve();
  state = {
    storage: {
      sql: {
        exec(query, ...bindings) {
          if (failWrite && query.startsWith('INSERT'))
            throw new Error('synthetic I/O');
          const statement = db.prepare(query);
          const rows = query.startsWith('SELECT')
            ? statement.all(...bindings)
            : (statement.run(...bindings), []);
          return { toArray: () => rows } as ReturnType<
            AdminRateState['storage']['sql']['exec']
          >;
        },
      },
      transactionSync(callback) {
        db.exec('BEGIN');
        try {
          const result = callback();
          db.exec('COMMIT');
          return result;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
      setAlarm,
      deleteAlarm,
    },
    blockConcurrencyWhile(callback) {
      const result = tail.then(callback);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
  object = new AdminRateLimitDO(state);
  const stub = { fetch: vi.fn((req: Request) => object.fetch(req)) };
  context.get.mockReturnValue({
    env: {
      ADMIN_RATE_LIMIT_DO: {
        idFromName: vi.fn(() => 'singleton'),
        get: () => stub,
      },
    },
  });
});
afterEach(() => {
  db.close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Quota em SQLite, runtime Cloudflare não executado', () => {
  it('dez consumos concorrentes permitem cinco e recusam cinco', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => object.fetch(request('login'))),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(5);
    expect(db.prepare('SELECT count FROM quotas').get()?.count).toBe(5);
  });
  it('preserva quota após recriar objeto e mantém MFA independente', async () => {
    for (let i = 0; i < 5; i++) await object.fetch(request('login'));
    object = new AdminRateLimitDO(state);
    expect((await object.fetch(request('login'))).status).toBe(429);
    expect((await object.fetch(request('mfa'))).status).toBe(200);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM quotas').get()?.total,
    ).toBe(2);
  });
  it('não prolonga janela recusada e reabre na expiração exata sem alarme', async () => {
    for (let i = 0; i < 5; i++) await object.fetch(request('login'));
    vi.mocked(Date.now).mockReturnValue(159999);
    const denied = await object.fetch(request('login'));
    expect(denied.status).toBe(429);
    expect(denied.headers.get('retry-after')).toBe('1');
    expect(db.prepare('SELECT expires_at FROM quotas').get()?.expires_at).toBe(
      160000,
    );
    vi.mocked(Date.now).mockReturnValue(160000);
    expect((await object.fetch(request('login'))).status).toBe(200);
  });
  it('limpa registros vencidos e reagenda apenas o próximo prazo', async () => {
    await object.fetch(request('login'));
    vi.mocked(Date.now).mockReturnValue(130000);
    await object.fetch(request('mfa'));
    vi.mocked(Date.now).mockReturnValue(160000);
    await object.alarm();
    expect(setAlarm).toHaveBeenLastCalledWith(190000);
    vi.mocked(Date.now).mockReturnValue(190000);
    await object.alarm();
    expect(deleteAlarm).toHaveBeenCalled();
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM quotas').get()?.total,
    ).toBe(0);
  });
  it('falha de gravação reverte consumo e falha de alarme preserva consumo com 503', async () => {
    failWrite = true;
    expect((await object.fetch(request('login'))).status).toBe(503);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM quotas').get()?.total,
    ).toBe(0);
    failWrite = false;
    setAlarm.mockRejectedValueOnce(new Error('synthetic alarm'));
    expect((await object.fetch(request('login'))).status).toBe(503);
    expect(db.prepare('SELECT count FROM quotas').get()?.count).toBe(1);
  });
  it('propaga falha do callback de alarme para retry da plataforma', async () => {
    await object.fetch(request('login'));
    setAlarm.mockRejectedValueOnce(new Error('synthetic alarm'));
    await expect(object.alarm()).rejects.toThrow('synthetic alarm');
  });
  it('rejeita operações e bytes excedentes sem criar quotas', async () => {
    expect((await object.fetch(request('arbitrary'))).status).toBe(400);
    const huge = new Request('http://admin-rate-limit/consume', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '1' },
      body: ' '.repeat(129),
    });
    expect((await object.fetch(huge)).status).toBe(400);
    expect(
      (await object.fetch(new Request('http://admin-rate-limit/consume')))
        .status,
    ).toBe(405);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM quotas').get()?.total,
    ).toBe(0);
  });
});
describe('Adaptador e respostas externas', () => {
  it('dois consumidores compartilham o binding e a quota', async () => {
    const decisions = await Promise.all(
      Array.from({ length: 6 }, () => consumeAdminRateLimit('login')),
    );
    expect(decisions.filter((d) => d.status === 200)).toHaveLength(5);
    expect(decisions[5]).toEqual({ status: 429, retryAfter: 60 });
    expect(
      context.get().env.ADMIN_RATE_LIMIT_DO.idFromName,
    ).toHaveBeenCalledWith('admin-auth-rate-limit:v1');
  });
  it('binding ausente e erro de contexto falham 503', async () => {
    context.get.mockReturnValue({ env: {} });
    expect(await consumeAdminRateLimit('login')).toEqual({
      status: 503,
      retryAfter: 5,
    });
    context.get.mockImplementation(() => {
      throw new Error('synthetic context');
    });
    expect((await consumeAdminRateLimit('login')).status).toBe(503);
  });
  it.each([
    () =>
      Response.json(
        { allowed: false, retryAfter: 1 },
        { status: 429, headers: { 'Retry-After': '2' } },
      ),
    () =>
      Response.json(
        { allowed: false, retryAfter: 1.5 },
        { status: 429, headers: { 'Retry-After': '1.5' } },
      ),
    () => Response.json({ allowed: true, extra: true }),
    () => Response.json({ allowed: true, padding: 'x'.repeat(256) }),
    () => new Response('not json'),
  ])('resposta inesperada falha fechado', async (factory) => {
    context.get.mockReturnValue({
      env: {
        ADMIN_RATE_LIMIT_DO: {
          idFromName: () => 'singleton',
          get: () => ({ fetch: async () => factory() }),
        },
      },
    });
    expect((await consumeAdminRateLimit('login')).status).toBe(503);
  });
  it('deadline cobre corpo que não termina, mesmo depois de resposta 200', async () => {
    vi.useFakeTimers();
    context.get.mockReturnValue({
      env: {
        ADMIN_RATE_LIMIT_DO: {
          idFromName: () => 'singleton',
          get: () => ({
            fetch: async () =>
              new Response(
                new ReadableStream({
                  start(controller) {
                    controller.enqueue(new TextEncoder().encode('{'));
                  },
                }),
                { headers: { 'Content-Type': 'application/json' } },
              ),
          }),
        },
      },
    });
    const result = consumeAdminRateLimit('login');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await result).toEqual({ status: 503, retryAfter: 5 });
  });
  it.each([429, 503] as const)(
    'formulário mantém HTTP %s e JSON tem mesmo Retry-After',
    async (status) => {
      const decision = { status, retryAfter: status === 429 ? 60 : 5 };
      const html = adminRateLimitResponse(
        new Request('https://example.invalid', {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        }),
        decision,
        'login',
      )!;
      expect(html.status).toBe(status);
      expect(html.headers.get('location')).toBeNull();
      expect(html.headers.get('cache-control')).toBe('private, no-store');
      expect(html.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      const json = adminRateLimitResponse(
        new Request('https://example.invalid', {
          headers: { accept: 'application/json' },
        }),
        decision,
        'mfa',
      )!;
      expect((await json.json()).retryAfter).toBe(
        Number(json.headers.get('retry-after')),
      );
    },
  );
});
