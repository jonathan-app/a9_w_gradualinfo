// @vitest-environment node
/**
 * @fileoverview Regressões de bloqueio e renovação no proxy de autenticação.
 * @module __tests__/unit/supabase-proxy
 * @description Verifica o contrato HTTP de proteção antes do streaming.
 * @dependencies vitest, next/server, next/experimental/testing/server e proxy.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

const mocks = vi.hoisted(() => ({
  accessible: vi.fn(),
  preview: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/preview/auth', () => ({
  isArticleAccessible: mocks.accessible,
  verifyPreviewSession: mocks.preview,
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (values: unknown[]) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          { name: 'sb-test-auth-token', value: 'renewed', options: {} },
        ]);
        return mocks.refresh();
      },
    },
  }),
}));
import { config, proxy } from '@/proxy';

describe('proteção de rotas no proxy (preview/AC-03 e AC-05)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.preview.mockResolvedValue(false);
    mocks.accessible.mockResolvedValue(false);
    mocks.refresh.mockResolvedValue({ data: { user: null }, error: null });
  });

  it.each([
    '/artigos/rascunho',
    '/artigos/rascunho.png',
    '/preview/entrada.txt',
    '/api/preview/entrada.xml',
    '/api/preview/logout',
  ])('executa proteção para %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      true,
    );
  });

  it.each([
    '/_next/static/main.js',
    '/logo.png',
    '/favicon.ico',
    '/api/health',
  ])('dispensa sessão para %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      false,
    );
  });

  it('bloqueia artigo com 404, sem continuidade e preserva cookie renovado', async () => {
    const request = new NextRequest(
      'https://example.invalid/artigos/rascunho',
      {
        headers: { cookie: 'sb-test-auth-token=antigo' },
      },
    );
    const response = await proxy(request);
    expect(response.status).toBe(404);
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://example.invalid/_not-found',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('renewed');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
    expect(request.cookies.get('sb-test-auth-token')?.value).toBe('renewed');
  });

  it('permite artigo público e conserva cache privado', async () => {
    mocks.accessible.mockResolvedValue(true);
    const response = await proxy(
      new NextRequest('https://example.invalid/artigos/publicado'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('falha de Auth não libera artigo privado', async () => {
    mocks.refresh.mockRejectedValue(new Error('Auth indisponível'));
    const response = await proxy(
      new NextRequest('https://example.invalid/artigos/rascunho', {
        headers: { cookie: 'sb-test-auth-token=antigo' },
      }),
    );
    expect(response.status).toBe(404);
    expect(mocks.accessible).toHaveBeenCalledWith(
      expect.anything(),
      'rascunho',
      false,
    );
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
