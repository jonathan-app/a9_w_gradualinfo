/**
 * @fileoverview Testes do middleware de sessão (`lib/supabase/middleware.ts`).
 * @module __tests__/unit/supabase-middleware
 * @description Comprova headers em rotas protegidas e de preview, renovação
 *   condicionada ao cookie de sessão e bloqueio de artigo inacessível.
 * @dependencies vitest, next/server, @/lib/supabase/middleware.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
    supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake' },
    adminUserId: '11111111-1111-4111-8111-111111111111',
  },
  isSanityConfigured: true,
}));
vi.mock('@/lib/preview/config', () => ({
  previewCookieOptions: { httpOnly: true, sameSite: 'lax' as const, path: '/' },
}));
vi.mock('@/lib/preview/session', () => ({
  PREVIEW_COOKIE: 'gradualinfo-preview',
}));

const getUser = vi.hoisted(() => vi.fn(async () => ({ data: { user: null } })));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser },
  }),
}));

const probeSanityAvailability = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/sanity/client', () => ({
  probeSanityAvailability,
}));

const loggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: loggerError },
}));

const isArticleAccessible = vi.hoisted(() => vi.fn(async () => true));
const verifyPreviewSession = vi.hoisted(() => vi.fn(async () => false));
vi.mock('@/lib/preview/auth', () => {
  class PreviewStoreUnavailableError extends Error {}
  class ContentUnavailableError extends Error {}
  return {
    isArticleAccessible,
    verifyPreviewSession,
    PreviewStoreUnavailableError,
    ContentUnavailableError,
  };
});

import { updateSession } from '@/lib/supabase/middleware';

function makeRequest(path: string, cookies?: Record<string, string>) {
  const headers = new Headers();
  if (cookies) {
    for (const [k, v] of Object.entries(cookies)) {
      headers.set('cookie', `${k}=${v}`);
    }
  }
  return new NextRequest(`https://gradualinfo.com.br${path}`, { headers });
}

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    probeSanityAvailability.mockResolvedValue(undefined);
    isArticleAccessible.mockResolvedValue(true);
    verifyPreviewSession.mockResolvedValue(false);
  });

  it('chama getUser quando há cookie de sessão', async () => {
    await updateSession(makeRequest('/', { 'sb-xyz-auth-token': 'token' }));
    expect(getUser).toHaveBeenCalled();
  });

  it('não chama getUser sem cookie de sessão', async () => {
    await updateSession(makeRequest('/'));
    expect(getUser).not.toHaveBeenCalled();
  });

  it('sobrevive a falha do getUser', async () => {
    getUser.mockRejectedValue(new Error('rede'));
    const res = await updateSession(
      makeRequest('/', { 'sb-xyz-auth-token': 'token' }),
    );
    expect(res.status).toBe(200);
  });

  it('marca private no-store em /artigos/<slug>', async () => {
    const res = await updateSession(makeRequest('/artigos/meu-artigo'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('marca private no-store em /preview', async () => {
    const res = await updateSession(makeRequest('/preview'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('marca private no-store em /api/preview', async () => {
    const res = await updateSession(makeRequest('/api/preview'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('marca noindex no admin-dashboard', async () => {
    const res = await updateSession(makeRequest('/admin-dashboard'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('marca noindex em /api/admin', async () => {
    const res = await updateSession(makeRequest('/api/admin/auth/login'));
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('retorna 503 quando o Sanity falha na home e registra o motivo', async () => {
    const { ContentUnavailableError } = await import('@/lib/preview/auth');
    probeSanityAvailability.mockRejectedValue(
      new ContentUnavailableError('timeout de 800ms'),
    );
    const res = await updateSession(makeRequest('/'));
    expect(res.status).toBe(503);
    expect(loggerError).toHaveBeenCalledWith(
      'sanity/probe',
      expect.objectContaining({
        path: '/',
        message: 'timeout de 800ms',
        cfRay: null,
      }),
    );
  });

  it('relança erro não ContentUnavailableError da sonda', async () => {
    probeSanityAvailability.mockRejectedValue(new Error('bug grave'));
    await expect(updateSession(makeRequest('/'))).rejects.toThrow('bug grave');
  });

  it('retorna 404 quando artigo não é acessível e sem preview', async () => {
    isArticleAccessible.mockResolvedValue(false);
    const res = await updateSession(makeRequest('/artigos/nao-existe'));
    expect(res.status).toBe(404);
  });

  it('retorna 503 quando DO indisponível em artigo', async () => {
    isArticleAccessible.mockRejectedValue(
      new (await import('@/lib/preview/auth')).PreviewStoreUnavailableError(),
    );
    const res = await updateSession(makeRequest('/artigos/qualquer'));
    expect(res.status).toBe(503);
  });

  it('retorna 503 quando conteúdo indisponível em artigo', async () => {
    isArticleAccessible.mockRejectedValue(
      new (await import('@/lib/preview/auth')).ContentUnavailableError(),
    );
    const res = await updateSession(makeRequest('/artigos/qualquer'));
    expect(res.status).toBe(503);
  });

  it('acessa artigo via preview quando rascunho', async () => {
    isArticleAccessible
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    verifyPreviewSession.mockResolvedValue(true);
    const res = await updateSession(
      makeRequest('/artigos/rascunho', {
        'gradualinfo-preview': 'token',
      }),
    );
    expect(res.status).toBe(200);
    expect(verifyPreviewSession).toHaveBeenCalled();
  });

  it('relança erro inesperado em artigo', async () => {
    isArticleAccessible.mockRejectedValue(new Error('inesperado'));
    await expect(updateSession(makeRequest('/artigos/x'))).rejects.toThrow(
      'inesperado',
    );
  });

  it('não faz probe em rotas que não são a home', async () => {
    await updateSession(makeRequest('/outra-rota'));
    expect(probeSanityAvailability).not.toHaveBeenCalled();
  });
});
