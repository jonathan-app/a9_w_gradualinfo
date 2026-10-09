// @vitest-environment node
/**
 * @fileoverview Testes de segurança, autorização e revogação imediata de preview (spec 0006).
 * @module __tests__/unit/preview-security.test
 * @description Comprova os contratos estritos de segurança da spec 0006:
 *   - Entrada e saída exclusivas por POST (GET -> 405 com Allow: POST);
 *   - Validação de origem e isolamento de segredo fora da URL;
 *   - Criação da sessão no Durable Object antes de emitir cookie;
 *   - TESTE MANDATÓRIO: Reutilização da cópia do cookie após logout é rejeitada com 404;
 *   - Semântica discriminada de falha fechada: 404 para sessão inválida/revogada em rascunho,
 *     503 para DO indisponível durante autorização, e 200 direto para artigo público.
 * @dependencies vitest, app/api/preview/route, app/api/preview/logout/route,
 *   lib/preview/auth, lib/preview/durable-object, lib/site-config.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { TEST_SECRET, TEST_SIGNING_KEY, TEST_USER_ID } = vi.hoisted(() => ({
  TEST_SECRET: 'teste-segredo-preview-1234567890123456',
  TEST_SIGNING_KEY: 'chave-assinatura-preview-1234567890123456',
  TEST_USER_ID: '00000000-0000-4000-8000-000000000000',
}));

vi.mock('@/lib/env', () => ({
  env: {
    previewSecret: TEST_SECRET,
    previewSigningKey: TEST_SIGNING_KEY,
    previewUserId: TEST_USER_ID,
    isProduction: false,
    supabase: {
      url: 'http://127.0.0.1:54321',
      anonKey: 'fake-anon-key',
    },
    sanity: {
      projectId: 'test-project',
      dataset: 'production',
      apiVersion: '2024-01-01',
      readToken: 'test-token',
    },
  },
  isSupabaseConfigured: true,
  isSanityConfigured: true,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://example.invalid',
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));

import {
  POST as previewLoginPost,
  GET as previewLoginGet,
} from '@/app/api/preview/route';
import {
  POST as previewLogoutPost,
  GET as previewLogoutGet,
} from '@/app/api/preview/logout/route';
import {
  verifyDurableObjectPreviewSession,
  evaluateArticleAccess,
} from '@/lib/preview/auth';
import {
  getLocalPreviewSessionStore,
  type InMemoryPreviewSessionStore,
} from '@/lib/preview/durable-object';
import { PREVIEW_COOKIE } from '@/lib/preview/session';
import { SITE_ORIGIN } from '@/lib/site-config';

describe('Contrato de Segurança e Revogação de Preview (spec 0006)', () => {
  let localStore: InMemoryPreviewSessionStore;

  beforeEach(() => {
    localStore = getLocalPreviewSessionStore();
    localStore.clear();
    vi.clearAllMocks();
  });

  describe('1. Verificação de Métodos e Origem (POST Exclusivo, Segredo no Corpo)', () => {
    it('rejeita GET em /api/preview com 405 e cabeçalho Allow: POST', async () => {
      const res = previewLoginGet();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('POST');
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });

    it('rejeita GET em /api/preview/logout com 405 e cabeçalho Allow: POST', async () => {
      const res = previewLogoutGet();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('POST');
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });

    it('rejeita requisições com origem divergente de SITE_ORIGIN com 403', async () => {
      const req = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: 'https://evil-site.com',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token: TEST_SECRET }).toString(),
      });

      const res = await previewLoginPost(req);
      expect(res.status).toBe(403);
    });

    it('rejeita token incorreto com 401 em tempo constante', async () => {
      const req = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token: 'senha-errada' }).toString(),
      });

      const res = await previewLoginPost(req);
      expect(res.status).toBe(401);
    });
  });

  describe('2. Criação da Sessão Antes de Emitir o Cookie e Emissão Válida', () => {
    it('cria a sessão no Durable Object antes de retornar o cookie', async () => {
      const req = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: TEST_SECRET,
          slug: 'artigo-teste-seguro',
        }).toString(),
      });

      const res = await previewLoginPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe(
        `${SITE_ORIGIN}/artigos/artigo-teste-seguro`,
      );

      const setCookie = res.cookies.get(PREVIEW_COOKIE);
      expect(setCookie).toBeDefined();
      expect(setCookie?.value).toBeTruthy();

      // Confirma que a sessão foi registrada no DO e está válida
      const auth = await verifyDurableObjectPreviewSession(setCookie?.value);
      expect(auth.authorized).toBe(true);
      expect(auth.status).toBe(200);
      expect(auth.sessionId).toBeDefined();
    });

    it('falha com 503 se o Durable Object estiver indisponível durante o login', async () => {
      localStore.simulateFailure = true;

      const req = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: TEST_SECRET,
        }).toString(),
      });

      const res = await previewLoginPost(req);
      expect(res.status).toBe(503);
      expect(res.cookies.get(PREVIEW_COOKIE)).toBeUndefined();
    });
  });

  describe('3. Teste Mandatório: Reutilização da Cópia do Cookie Após Logout', () => {
    it('rejeita ativamente cópia de cookie pós-logout com status 404', async () => {
      // Passo 1: Autentica via POST em /api/preview
      const loginReq = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: TEST_SECRET,
          slug: 'rascunho-secreto',
        }).toString(),
      });

      const loginRes = await previewLoginPost(loginReq);
      expect(loginRes.status).toBe(303);

      // Passo 2: Captura uma cópia do cookie emitido
      const capturedCookie = loginRes.cookies.get(PREVIEW_COOKIE)!.value;
      expect(capturedCookie).toBeTruthy();

      // Verifica que a cópia é inicialmente válida e autoriza rascunho
      const preLogoutAccess = await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: capturedCookie,
      });
      expect(preLogoutAccess.accessible).toBe(true);
      expect(preLogoutAccess.status).toBe(200);
      expect(preLogoutAccess.isPreview).toBe(true);

      // Passo 3: Executa POST em /api/preview/logout
      const logoutReq = new NextRequest(`${SITE_ORIGIN}/api/preview/logout`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
        },
      });
      // Injeta o cookie na requisição de logout
      logoutReq.cookies.set(PREVIEW_COOKIE, capturedCookie);

      const logoutRes = await previewLogoutPost(logoutReq);
      expect(logoutRes.status).toBe(303);
      expect(logoutRes.headers.get('location')).toBe(`${SITE_ORIGIN}/`);

      // Passo 4: Realiza nova verificação enviando a CÓPIA capturada do cookie original
      const postLogoutAccess = await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: capturedCookie, // Apresentação da cópia salva
      });

      // Passo 5: Comprova que o DO consulta o registro de revogação e recusa com 404
      expect(postLogoutAccess.accessible).toBe(false);
      expect(postLogoutAccess.status).toBe(404);
      expect(postLogoutAccess.isPreview).toBe(false);
    });
  });

  describe('4. Semântica da Falha Fechada Discriminada (404 vs 503 vs 200)', () => {
    it('artigo não público com sessão ausente/inválida responde 404', async () => {
      const access = await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: 'cookie-invalido-ou-forjado',
      });
      expect(access.accessible).toBe(false);
      expect(access.status).toBe(404);
    });

    it('artigo não público com Durable Object indisponível responde 503 sem entregar rascunho', async () => {
      // Simula login para ter um cookie estruturalmente assinado
      const loginReq = new NextRequest(`${SITE_ORIGIN}/api/preview`, {
        method: 'POST',
        headers: {
          origin: SITE_ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token: TEST_SECRET }).toString(),
      });
      const loginRes = await previewLoginPost(loginReq);
      const validCookie = loginRes.cookies.get(PREVIEW_COOKIE)!.value;

      // Simula indisponibilidade do armazenamento
      localStore.simulateFailure = true;

      const access = await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: validCookie,
      });

      // Falha fechada: 503 (infra indisponível), rascunho não acessível
      expect(access.accessible).toBe(false);
      expect(access.status).toBe(503);
      expect(access.isPreview).toBe(false);
    });

    it('artigo público permanece acessível com 200 independente de sessão ou status do DO', async () => {
      // Mesmo com DO quebrado
      localStore.simulateFailure = true;

      const publicAccess = await evaluateArticleAccess({
        isPublicArticle: true,
        previewCookieValue: undefined,
      });

      expect(publicAccess.accessible).toBe(true);
      expect(publicAccess.status).toBe(200);
      expect(publicAccess.isPreview).toBe(false);
    });
  });
});
