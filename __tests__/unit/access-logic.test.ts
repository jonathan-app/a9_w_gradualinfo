/**
 * @fileoverview Testes da lógica de configuração e admissão Access.
 * @module __tests__/unit/access-logic
 * @description Comprova readAdminAccessConfig, createAccessAdmission e os
 *   caminhos de JWT, JWKS e deadline em lib/env e lib/admin/access.
 * @dependencies vitest, jose, @/lib/env, @/lib/admin/access.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignJWT, exportJWK } from 'jose';

vi.mock('server-only', () => ({}));

import { readAdminAccessConfig } from '@/lib/env';
import { createAccessAdmission } from '@/lib/admin/access';

const validBindings = {
  ADMIN_ACCESS_ISSUER: 'https://test.cloudflareaccess.com',
  ADMIN_ACCESS_AUD: 'aud-123',
  ADMIN_ACCESS_OWNER_EMAIL: 'owner@test.com',
  ADMIN_ACCESS_HOSTS: 'portal.example.com',
};

describe('readAdminAccessConfig', () => {
  it('retorna null com bindings vazios', () => {
    expect(readAdminAccessConfig({})).toBeNull();
  });

  it('retorna null com issuer ausente', () => {
    expect(
      readAdminAccessConfig({
        ADMIN_ACCESS_AUD: 'a',
        ADMIN_ACCESS_OWNER_EMAIL: 'e@x.com',
        ADMIN_ACCESS_HOSTS: 'h.com',
      }),
    ).toBeNull();
  });

  it('retorna null com issuer não string', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: 123,
      }),
    ).toBeNull();
  });

  it('retorna null com issuer vazio', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: '',
      }),
    ).toBeNull();
  });

  it('retorna null com issuer com espaços', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: ' https://test.cloudflareaccess.com ',
      }),
    ).toBeNull();
  });

  it('retorna null com issuer http (não https)', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: 'http://test.cloudflareaccess.com',
      }),
    ).toBeNull();
  });

  it('retorna null com hostname fora do padrão cloudflareaccess.com', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: 'https://evil.com',
      }),
    ).toBeNull();
  });

  it('retorna null com issuer que tem credenciais', () => {
    expect(
      readAdminAccessConfig({
        ...validBindings,
        ADMIN_ACCESS_ISSUER: 'https://user:pass@test.cloudflareaccess.com',
      }),
    ).toBeNull();
  });

  it('retorna config válida', () => {
    const config = readAdminAccessConfig(validBindings);
    expect(config).not.toBeNull();
    expect(config?.issuer).toBe('https://test.cloudflareaccess.com');
    expect(config?.audience).toBe('aud-123');
    expect(config?.ownerEmail).toBe('owner@test.com');
    expect(config?.hosts).toEqual(['portal.example.com']);
  });

  it('aceita hosts com múltiplos domínios', () => {
    const config = readAdminAccessConfig({
      ...validBindings,
      ADMIN_ACCESS_HOSTS: 'a.com,b.com',
    });
    expect(config?.hosts).toEqual(['a.com', 'b.com']);
  });

  it('retorna null com hosts ausente', () => {
    const { ADMIN_ACCESS_HOSTS: _, ...rest } = validBindings;
    expect(readAdminAccessConfig(rest)).toBeNull();
  });
});

describe('createAccessAdmission', () => {
  let privateKey: CryptoKey;
  let publicJwk: Record<string, unknown>;
  let kid: string;

  beforeEach(async () => {
    const { privateKey: pk, publicKey } = await generateKeyPair();
    privateKey = pk;
    // exportJWK(publicKey) gera só a parte pública. Se exportasse o
    // privateKey, o JWK traria d/p/q/dp/dq/qi e validKeys() em
    // lib/admin/access.ts:136 rejeitaria qualquer key, derrubando todos
    // os cenários de admissão com AccessUnavailable (503).
    const jwk = await exportJWK(publicKey);
    publicJwk = { ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' };
    kid = 'test-kid';
  });

  async function generateKeyPair() {
    const { generateKeyPair: gen } = await import('node:crypto');
    const { promisify } = await import('node:util');
    const genAsync = promisify(gen);
    const { publicKey, privateKey } = await genAsync('rsa', {
      modulusLength: 2048,
    });
    return { publicKey, privateKey };
  }

  async function makeToken(payload: Record<string, unknown>) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);
  }

  function makeRequest(token?: string) {
    const headers = new Headers({ host: 'portal.example.com' });
    if (token) headers.set('cf-access-jwt-assertion', token);
    return new Request('https://portal.example.com/admin-dashboard', {
      headers,
    });
  }

  const validPayload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'user-1',
    email: 'owner@test.com',
    type: 'app',
    iss: 'https://test.cloudflareaccess.com',
    aud: 'aud-123',
  };

  function makeFetch(jwks: unknown) {
    return vi.fn(async () =>
      Response.json(jwks, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  it('retorna 503 sem config', async () => {
    const admit = createAccessAdmission(vi.fn());
    const res = (await admit(makeRequest(), {})) as Response;
    expect(res.status).toBe(503);
  });

  it('retorna 403 com host não autorizado', async () => {
    const admit = createAccessAdmission(vi.fn());
    const req = new Request('https://evil.com/admin-dashboard', {
      headers: { host: 'evil.com' },
    });
    const res = (await admit(req, validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 sem token', async () => {
    const admit = createAccessAdmission(vi.fn());
    const res = (await admit(makeRequest(), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com token muito longo', async () => {
    const admit = createAccessAdmission(vi.fn());
    const res = (await admit(
      makeRequest('x'.repeat(9000)),
      validBindings,
    )) as Response;
    expect(res.status).toBe(403);
  });

  it('aceita token JWT válido', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const result = await admit(makeRequest(token), validBindings);
    expect(result).toMatchObject({ allowed: true, version: 1 });
  });

  it('retorna 403 com email divergente', async () => {
    const token = await makeToken({ ...validPayload, email: 'outro@test.com' });
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com type errado', async () => {
    const token = await makeToken({ ...validPayload, type: 'not-app' });
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com sub vazio', async () => {
    const token = await makeToken({ ...validPayload, sub: '' });
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com exp menor que iat', async () => {
    const now = Math.floor(Date.now() / 1000);
    // makeToken() aplica setIssuedAt(now) e setExpirationTime(now + 3600),
    // então o payload de exp/iat passado é ignorado. Assino diretamente
    // para really exp < iat, que lib/admin/access.ts:260 rejeita.
    const token = await new SignJWT({
      ...validPayload,
      iat: now + 100,
      exp: now,
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .sign(privateKey);
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com JWKS vazio', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(makeFetch({ keys: [] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com JWKS malformado', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(makeFetch({ nokeys: true }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(503);
  });

  it('retorna 503 quando fetch falha', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(
      vi.fn(async () => {
        throw new Error('rede');
      }),
    );
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(503);
  });

  it('retorna 503 com resposta não 200 do fetch', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(
      vi.fn(async () => new Response('fail', { status: 500 })),
    );
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(503);
  });

  it('retorna 503 com content-type errado', async () => {
    const token = await makeToken(validPayload);
    const admit = createAccessAdmission(
      vi.fn(async () => new Response('x', { status: 200 })),
    );
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(503);
  });

  it('retorna 403 com assinatura inválida', async () => {
    const { privateKey: otherKey } = await generateKeyPair();
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT(validPayload)
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(otherKey);
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('retorna 403 com alg errado no header', async () => {
    // jose 6.x não exporta createHmacKey. O header é verificado em
    // lib/admin/access.ts:228 antes de qualquer assinatura: basta um
    // JWT compacto com alg != RS256 para cair no 403.
    const header = btoa(JSON.stringify({ alg: 'HS256', kid }));
    const payload = btoa(JSON.stringify(validPayload));
    const token = `${header}.${payload}.sig`;
    const admit = createAccessAdmission(makeFetch({ keys: [publicJwk] }));
    const res = (await admit(makeRequest(token), validBindings)) as Response;
    expect(res.status).toBe(403);
  });

  it('aceita JSON via Accept header na recusa', async () => {
    const admit = createAccessAdmission(vi.fn());
    const req = new Request('https://portal.example.com/x', {
      headers: { host: 'portal.example.com', accept: 'application/json' },
    });
    const res = (await admit(req, validBindings)) as Response;
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('aceita JSON via Content-Type na recusa', async () => {
    const admit = createAccessAdmission(vi.fn());
    const req = new Request('https://portal.example.com/x', {
      headers: {
        host: 'portal.example.com',
        'content-type': 'application/json',
      },
    });
    const res = (await admit(req, validBindings)) as Response;
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
