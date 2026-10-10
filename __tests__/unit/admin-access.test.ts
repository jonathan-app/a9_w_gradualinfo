/**
 * @fileoverview Provas unitárias da admissão Access com assinaturas sintéticas.
 * @module __tests__/unit/admin-access
 * @description Testa falsificação, audiência, host, cache e isolamento sem conta real.
 * @dependencies vitest, jose, lib/admin/access, lib/env.
 */
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, type JWK } from 'jose';
import { createAccessAdmission, classifyAdminPath } from '@/lib/admin/access';
import { readAdminAccessConfig } from '@/lib/env';
import { guardAdminAccess } from '@/lib/admin/access-guard';
const context = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => context,
}));

const bindings = {
  ADMIN_ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
  ADMIN_ACCESS_AUD: 'synthetic-audience',
  ADMIN_ACCESS_OWNER_EMAIL: 'owner@example.test',
  ADMIN_ACCESS_HOSTS: 'admin.example.test',
};
let privateKey: CryptoKey;
let publicKey: JWK;
beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  publicKey = {
    ...(await exportJWK(pair.publicKey)),
    kid: 'test-key',
    alg: 'RS256',
  };
});
afterEach(() => vi.useRealTimers());
async function signed(
  overrides: Record<string, unknown> = {},
  kid = 'test-key',
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    type: 'app',
    email: 'owner@example.test',
    sub: 'synthetic-owner',
    iat: now,
    exp: now + 3600,
    iss: bindings.ADMIN_ACCESS_ISSUER,
    aud: bindings.ADMIN_ACCESS_AUD,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .sign(privateKey);
}
const req = (token?: string, host = 'admin.example.test') =>
  new Request(`https://${host}/api/admin/auth/login`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      ...(token ? { 'cf-access-jwt-assertion': token } : {}),
    },
  });
/** Codifica um segmento JWT em base64url sem preenchimento. */
const b64 = (value: string): string =>
  Buffer.from(value, 'utf-8').toString('base64url');
const keysFetch = () =>
  vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json({ keys: [publicKey] }));
const status = (
  value: Awaited<ReturnType<ReturnType<typeof createAccessAdmission>>>,
) => (value instanceof Response ? value.status : 200);

describe('admissão Access', () => {
  it('chave RSA inutilizável é indisponibilidade técnica, não credencial negada', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ keys: [{ ...publicKey, n: 'AA', e: 'AA' }] }),
      );
    expect(
      status(
        await createAccessAdmission(fetcher)(req(await signed()), bindings),
      ),
    ).toBe(503);
  });
  it('deadline total encerra espera mesmo quando emissor ignora cancelamento', async () => {
    const token = await signed();
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => {}));
    const result = createAccessAdmission(fetcher)(req(token), bindings);
    await vi.advanceTimersByTimeAsync(2000);
    expect(status(await result)).toBe(503);
  });
  it('lê bindings no cold start sem depender de process.env', () => {
    expect(readAdminAccessConfig(bindings)?.audience).toBe(
      'synthetic-audience',
    );
    expect(readAdminAccessConfig({})).toBeNull();
  });
  it('nega configuração incompleta antes de buscar chaves', async () => {
    const fetcher = keysFetch();
    expect(status(await createAccessAdmission(fetcher)(req(), {}))).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('nega ausência de asserção sem consultar JWKS', async () => {
    const fetcher = keysFetch();
    expect(status(await createAccessAdmission(fetcher)(req(), bindings))).toBe(
      403,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('aceita assinatura real sintética e retorna apenas contexto interno congelado', async () => {
    const result = await createAccessAdmission(keysFetch())(
      req(await signed()),
      bindings,
    );
    expect(status(result)).toBe(200);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('token');
  });
  it.each([
    { aud: 'other-app' },
    { iss: 'https://other.cloudflareaccess.com' },
    { email: 'intruder@example.test' },
    { type: 'service' },
    { exp: 1 },
    { iat: Math.floor(Date.now() / 1000) + 60 },
    { exp: Math.floor(Date.now() / 1000) + 4000 },
    { sub: '' },
    { iat: 'wrong-type' },
  ])('recusa claims divergentes %j', async (overrides) => {
    expect(
      status(
        await createAccessAdmission(keysFetch())(
          req(await signed(overrides)),
          bindings,
        ),
      ),
    ).toBe(403);
  });
  it('recusa host desconhecido mesmo com token da mesma aplicação', async () => {
    const fetcher = keysFetch();
    expect(
      status(
        await createAccessAdmission(fetcher)(
          req(await signed(), 'other.example.test'),
          bindings,
        ),
      ),
    ).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('recusa Host conflitante e não aceita forwarded como identidade', async () => {
    const request = req(await signed());
    request.headers.set('host', 'other.example.test');
    request.headers.set('x-forwarded-host', 'admin.example.test');
    expect(
      status(await createAccessAdmission(keysFetch())(request, bindings)),
    ).toBe(403);
  });
  it('usa cache válido para proprietário sob tráfego de kid desconhecido', async () => {
    const fetcher = keysFetch();
    const admit = createAccessAdmission(fetcher);
    expect(status(await admit(req(await signed()), bindings))).toBe(200);
    expect(
      status(await admit(req(await signed({}, 'random-kid')), bindings)),
    ).toBe(403);
    expect(status(await admit(req(await signed()), bindings))).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('JWKS com chaves elegíveis ambíguas falha 503', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ keys: [publicKey, publicKey] }));
    expect(
      status(
        await createAccessAdmission(fetcher)(req(await signed()), bindings),
      ),
    ).toBe(503);
  });
  it('falha de rede não libera token', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('synthetic-network-failure'));
    expect(
      status(
        await createAccessAdmission(fetcher)(req(await signed()), bindings),
      ),
    ).toBe(503);
  });
  it('header forjado sem contexto Worker não concede admissão', () => {
    context.env = { ...bindings };
    const response = guardAdminAccess(req('synthetic-forged-assertion'));
    expect(response?.status).toBe(503);
  });
  it('guarda exige contexto congelado da mesma rota e método', () => {
    context.env = {
      ...bindings,
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        version: 1,
        allowed: true,
        authority: 'admin.example.test',
        method: 'POST',
        pathname: '/api/admin/auth/login',
        deadline: performance.now() + 2000,
      }),
    };
    expect(guardAdminAccess(req())).toBeNull();
    expect(
      guardAdminAccess(
        new Request('https://admin.example.test/api/admin/preview', {
          method: 'POST',
        }),
      )?.status,
    ).toBe(403);
  });
  it('recusa token com alg none mesmo sem assinatura', async () => {
    const header = b64(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = b64(
      JSON.stringify({
        type: 'app',
        email: 'owner@example.test',
        sub: 'synthetic-owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: bindings.ADMIN_ACCESS_ISSUER,
        aud: bindings.ADMIN_ACCESS_AUD,
      }),
    );
    const token = `${header}.${payload}.`;
    expect(
      status(await createAccessAdmission(keysFetch())(req(token), bindings)),
    ).toBe(403);
  });
  it('recusa token com alg HS256 em vez de RS256', async () => {
    const header = b64(JSON.stringify({ alg: 'HS256', kid: 'test-key' }));
    const payload = b64(
      JSON.stringify({
        type: 'app',
        email: 'owner@example.test',
        sub: 'synthetic-owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: bindings.ADMIN_ACCESS_ISSUER,
        aud: bindings.ADMIN_ACCESS_AUD,
      }),
    );
    const token = `${header}.${payload}.invalid-signature`;
    expect(
      status(await createAccessAdmission(keysFetch())(req(token), bindings)),
    ).toBe(403);
  });
  it('recusa assinatura corrompida mesmo com header e claims válidos', async () => {
    const token = await signed();
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    const corrupted = `${parts[0]}.${parts[1]}.${'A'.repeat(64)}`;
    expect(
      status(
        await createAccessAdmission(keysFetch())(req(corrupted), bindings),
      ),
    ).toBe(403);
  });
  it('recusa header jku que apontaria para chave controlada pelo atacante', async () => {
    const token = await signed();
    const header = b64(
      JSON.stringify({
        alg: 'RS256',
        kid: 'test-key',
        jku: 'https://evil.example/jwks.json',
      }),
    );
    const parts = token.split('.');
    const rewritten = `${header}.${parts[1]}.${parts[2]}`;
    expect(
      status(
        await createAccessAdmission(keysFetch())(req(rewritten), bindings),
      ),
    ).toBe(403);
  });
  it('recusa header x5u que apontaria para certificado externo', async () => {
    const token = await signed();
    const header = b64(
      JSON.stringify({
        alg: 'RS256',
        kid: 'test-key',
        x5u: 'https://evil.example/cert.pem',
      }),
    );
    const parts = token.split('.');
    const rewritten = `${header}.${parts[1]}.${parts[2]}`;
    expect(
      status(
        await createAccessAdmission(keysFetch())(req(rewritten), bindings),
      ),
    ).toBe(403);
  });
  it('recusa token com nbf no futuro além da tolerância de 5s', async () => {
    const future = Math.floor(Date.now() / 1000) + 30;
    const token = await signed({ nbf: future });
    expect(
      status(await createAccessAdmission(keysFetch())(req(token), bindings)),
    ).toBe(403);
  });
  it('recusa token expirado há mais de 5s (tolerância estrita, não 60s)', async () => {
    vi.useFakeTimers();
    const expired = Math.floor(Date.now() / 1000) - 10;
    const token = await signed({ exp: expired, iat: expired - 3600 });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      status(await createAccessAdmission(keysFetch())(req(token), bindings)),
    ).toBe(403);
  });
  it('aceita token com expiração dentro da tolerância de 5s', async () => {
    vi.useFakeTimers();
    const edge = Math.floor(Date.now() / 1000) + 3;
    const token = await signed({ exp: edge });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      status(await createAccessAdmission(keysFetch())(req(token), bindings)),
    ).toBe(200);
  });
  it.each(['/admin-dashboard/asset.svg', '/api/admin/auth/login'])(
    'protege caminhos com extensões e API %s',
    (path) => {
      expect(classifyAdminPath(path)).toBe('protected');
    },
  );
  it.each([
    '/%61dmin-dashboard',
    '/%2561dmin-dashboard',
    '/api%2fadmin',
    '//admin-dashboard',
    '/public/../%61dmin-dashboard',
  ])('recusa variante ambígua %s', (path) => {
    expect(classifyAdminPath(path)).toBe('ambiguous');
  });
  it.each([
    '/',
    '/artigos/publico',
    '/_next/static/app.js',
    '/admin-dashboard-outro',
  ])('preserva caminho público %s', (path) => {
    expect(classifyAdminPath(path)).toBe('public');
  });
});
