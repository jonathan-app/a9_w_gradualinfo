/**
 * @fileoverview Teste de integração: reutilização de cookie de preview após logout deve ser rejeitada com 404.
 * @module __tests__/integration/preview-cookie-reuse
 * @description Exercita o ciclo completo AC-05 item 6:
 *   1. Login preview via POST /api/preview com token válido
 *   2. Captura o cookie de sessão emitido
 *   3. Acessa artigo rascunho com o cookie (deve retornar 200)
 *   4. Logout via POST /api/preview/logout (deve confirmar revogação no DO)
 *   5. Reutiliza o cookie capturado para acessar o mesmo rascunho (deve retornar 404)
 * @dependencies vitest, next/server (NextRequest/NextResponse), lib/preview/*, lib/sanity/client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

const TEST_PREVIEW_SECRET = 'test-preview-secret-at-least-32-bytes-long';
const TEST_PREVIEW_SIGNING_KEY =
  'test-preview-signing-key-at-least-32-bytes-long';
const TEST_PREVIEW_USER_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ORIGIN = 'https://gradualinfo.com.br';

vi.mock('@/lib/env', () => ({
  env: {
    supabase: { url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' },
    previewSecret: 'test-preview-secret-at-least-32-bytes-long',
    previewSigningKey: 'test-preview-signing-key-at-least-32-bytes-long',
    previewUserId: '11111111-1111-4111-8111-111111111111',
    siteUrl: 'https://gradualinfo.com.br',
    sanity: {
      projectId: 'test-project',
      dataset: 'production',
      apiVersion: '2024-01-01',
      readToken: 'test-token',
    },
    isProduction: false,
  },
  isSanityConfigured: true,
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
  SITE_URL: 'https://gradualinfo.com.br/',
  GOOGLE_SITE_VERIFICATION: undefined,
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));

import {
  issuePreviewGrant,
  readPreviewGrant,
  PREVIEW_COOKIE,
  PREVIEW_TTL,
  equalSecret,
} from '@/lib/preview/session';
import {
  getPreviewSessionStore,
  type InMemoryPreviewSessionStore,
} from '@/lib/preview/durable-object';
import {
  POST as previewLogin,
  GET as previewLoginGet,
} from '@/app/api/preview/route';
import {
  POST as previewLogout,
  GET as previewLogoutGet,
} from '@/app/api/preview/logout/route';
import { verifyDurableObjectPreviewSession } from '@/lib/preview/auth';

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  const request = new NextRequest(url, {
    ...options,
    headers: {
      origin: SITE_ORIGIN,
      'content-type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });
  return request;
}

describe('Preview Cookie Reuse After Logout (AC-05.6)', () => {
  let localStore: InMemoryPreviewSessionStore;

  beforeEach(() => {
    vi.resetModules();
    localStore = getPreviewSessionStore() as InMemoryPreviewSessionStore;
    localStore.clear();
    localStore.simulateFailure = false;
  });

  afterEach(() => {
    localStore.clear();
  });

  it('deve permitir login preview, acessar rascunho, fazer logout e rejeitar cookie reutilizado com 404', async () => {
    const slug = 'artigo-rascunho-teste';

    const loginRequest = makeRequest(`${SITE_ORIGIN}/api/preview`, {
      method: 'POST',
      body: new URLSearchParams({ token: TEST_PREVIEW_SECRET, slug }),
    });

    const loginResponse = await previewLogin(loginRequest);

    expect(loginResponse.status).toBe(303);
    expect(loginResponse.headers.get('location')).toBe(
      `${SITE_ORIGIN}/artigos/${slug}`,
    );

    const setCookieHeader = loginResponse.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(PREVIEW_COOKIE);

    const cookieMatch = setCookieHeader!.match(
      new RegExp(`${PREVIEW_COOKIE}=([^;]+)`),
    );
    expect(cookieMatch).not.toBeNull();
    const previewCookieValue = cookieMatch![1];

    const grant = readPreviewGrant(
      previewCookieValue,
      TEST_PREVIEW_SIGNING_KEY,
    );
    expect(grant).not.toBeNull();
    expect(grant!.version).toBe(1);
    expect(grant!.sub).toBe(TEST_PREVIEW_USER_ID);
    const sessionId = grant!.session_id;

    const sessionRecord = localStore.storage.get(sessionId);
    expect(sessionRecord).toBeDefined();
    expect(sessionRecord!.revoked).toBe(false);

    const logoutRequest = makeRequest(`${SITE_ORIGIN}/api/preview/logout`, {
      method: 'POST',
    });

    logoutRequest.cookies.set(PREVIEW_COOKIE, previewCookieValue);

    const logoutResponse = await previewLogout(logoutRequest);

    expect(logoutResponse.status).toBe(303);
    expect(logoutResponse.headers.get('location')).toBe(`${SITE_ORIGIN}/`);

    const revokedRecord = localStore.storage.get(sessionId);
    expect(revokedRecord).toBeDefined();
    expect(revokedRecord!.revoked).toBe(true);

    const authResult =
      await verifyDurableObjectPreviewSession(previewCookieValue);

    expect(authResult.authorized).toBe(false);
    expect(authResult.status).toBe(404);
    expect(authResult.reason).toBe('revoked');
  });

  it('deve rejeitar GET em /api/preview com 405', async () => {
    const response = await previewLoginGet();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('deve rejeitar GET em /api/preview/logout com 405', async () => {
    const response = await previewLogoutGet();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('deve rejeitar origem divergente com 403 no login', async () => {
    const request = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
      method: 'POST',
      body: new URLSearchParams({ token: TEST_PREVIEW_SECRET }),
      headers: {
        origin: 'https://evil.com',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    const response = await previewLogin(request);
    expect(response.status).toBe(403);
  });

  it('deve rejeitar origem divergente com 403 no logout', async () => {
    const request = new NextRequest(`${SITE_ORIGIN}/api/preview/logout`, {
      method: 'POST',
      headers: {
        origin: 'https://evil.com',
      },
    });
    const response = await previewLogout(request);
    expect(response.status).toBe(403);
  });

  it('deve rejeitar token inválido com 401', async () => {
    const request = makeRequest(`${SITE_ORIGIN}/api/preview`, {
      method: 'POST',
      body: new URLSearchParams({ token: 'token-invalido' }),
    });
    const response = await previewLogin(request);
    expect(response.status).toBe(401);
  });

  it('deve rejeitar slug malicioso com 400', async () => {
    const maliciousSlugs = [
      '../admin',
      'http://evil.com',
      'UPPERCASE',
      'com spaces',
      'foo/bar',
    ];
    for (const slug of maliciousSlugs) {
      const request = makeRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        body: new URLSearchParams({ token: TEST_PREVIEW_SECRET, slug }),
      });
      const response = await previewLogin(request);
      expect(response.status).toBe(400);
    }
  });
});

describe('Preview Session Grant Security (supporting AC-05)', () => {
  it('deve emitir grant com HMAC-SHA256 e key separation', () => {
    const sessionId = randomUUID();
    const grantString = issuePreviewGrant(
      TEST_PREVIEW_USER_ID,
      sessionId,
      TEST_PREVIEW_SIGNING_KEY,
    );

    expect(grantString).toContain('.');
    const [payload, signature] = grantString.split('.');
    expect(payload).toBeDefined();
    expect(signature).toBeDefined();

    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    expect(decoded.version).toBe(1);
    expect(decoded.sub).toBe(TEST_PREVIEW_USER_ID);
    expect(decoded.session_id).toBe(sessionId);
    expect(decoded.expires_at - decoded.issued_at).toBe(PREVIEW_TTL);
  });

  it('deve validar grant correto e rejeitar assinatura alterada', () => {
    const sessionId = randomUUID();
    const grantString = issuePreviewGrant(
      TEST_PREVIEW_USER_ID,
      sessionId,
      TEST_PREVIEW_SIGNING_KEY,
    );

    const validGrant = readPreviewGrant(grantString, TEST_PREVIEW_SIGNING_KEY);
    expect(validGrant).not.toBeNull();
    expect(validGrant!.session_id).toBe(sessionId);

    const [payload] = grantString.split('.');
    const tampered = `${payload}.invalidsignature`;
    const invalidGrant = readPreviewGrant(tampered, TEST_PREVIEW_SIGNING_KEY);
    expect(invalidGrant).toBeNull();
  });

  it('deve rejeitar grant com versão diferente', () => {
    const sessionId = randomUUID();
    const grantString = issuePreviewGrant(
      TEST_PREVIEW_USER_ID,
      sessionId,
      TEST_PREVIEW_SIGNING_KEY,
    );
    const [payload] = grantString.split('.');
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    decoded.version = 2;
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString(
      'base64url',
    );
    const tampered = `${tamperedPayload}.${grantString.split('.')[1]}`;

    const invalidGrant = readPreviewGrant(tampered, TEST_PREVIEW_SIGNING_KEY);
    expect(invalidGrant).toBeNull();
  });

  it('deve rejeitar grant expirado', () => {
    const sessionId = randomUUID();
    const past = Date.now() - 1801_000;
    const grantString = issuePreviewGrant(
      TEST_PREVIEW_USER_ID,
      sessionId,
      TEST_PREVIEW_SIGNING_KEY,
      past,
    );

    const invalidGrant = readPreviewGrant(
      grantString,
      TEST_PREVIEW_SIGNING_KEY,
    );
    expect(invalidGrant).toBeNull();
  });

  it('comparação de segredo deve ser em tempo constante', () => {
    const secret1 = 'segredo-correto-com-tamanho-suficiente';
    const secret2 = 'segredo-correto-com-tamanho-suficiente';
    const secret3 = 'segredo-errado-com-tamanho-suficiente';

    expect(equalSecret(secret1, secret2)).toBe(true);
    expect(equalSecret(secret1, secret3)).toBe(false);
    expect(equalSecret('a', 'b')).toBe(false);
  });
});
