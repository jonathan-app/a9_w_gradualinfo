// @vitest-environment node
/**
 * @fileoverview Regressões da distinção entre indisponibilidade e sessão inválida.
 * @module __tests__/unit/preview-failure-status
 * @description Exercita autorização, serviço e resposta do proxy sem abrir portas.
 * @dependencies vitest, next/server, lib/preview, lib/services/posts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  validate: vi.fn(),
  post: vi.fn(),
  getUser: vi.fn(),
  cookie: { value: '' },
}));
vi.mock('@/lib/env', () => ({
  env: {
    supabase: { url: 'http://localhost:54321', anonKey: 'test' },
    sanity: { projectId: 'test', dataset: 'production' },
    previewSigningKey: 'test-only-signing-key',
    previewToken: 'test-only-signing-key',
  },
}));
vi.mock('@/lib/preview/config', () => ({
  isPreviewConfigured: () => true,
  previewCookieOptions: {},
}));
vi.mock('@/lib/preview/durable-object', () => ({
  getPreviewSessionStore: () => ({ validateSession: mocks.validate }),
}));
vi.mock('@/lib/sanity/client', () => ({ getSanityPostBySlug: mocks.post }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: mocks.cookie.value }) }),
}));
import { issuePreviewGrant } from '@/lib/preview/session';
import {
  evaluateArticleAccess,
  isArticleAccessible,
  verifyPreviewSession,
  PreviewStoreUnavailableError,
  ContentUnavailableError,
} from '@/lib/preview/auth';
import { updateSession } from '@/lib/supabase/middleware';
import { getPostBySlug } from '@/lib/services/posts';

const client = { auth: { getUser: mocks.getUser } } as unknown as Parameters<
  typeof verifyPreviewSession
>[0];

describe('Falha fechada com status distinto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.cookie.value = issuePreviewGrant(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'test-only-signing-key',
    );
    mocks.post.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: null } });
  });

  it.each(['invalid', 'expired', 'revoked'])(
    'sessão %s resulta em 404 sem fallback de auth',
    async (reason) => {
      mocks.validate.mockResolvedValue({
        valid: false,
        expired: reason === 'expired',
        revoked: reason === 'revoked',
      });
      expect(
        await evaluateArticleAccess({
          isPublicArticle: false,
          previewCookieValue: mocks.cookie.value,
        }),
      ).toMatchObject({ status: 404, accessible: false });
      expect(await verifyPreviewSession(client, mocks.cookie.value)).toBe(
        false,
      );
      expect(mocks.getUser).not.toHaveBeenCalled();
      const response = await updateSession(
        new NextRequest('http://localhost/artigos/rascunho', {
          headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
        }),
      );
      expect(response.status).toBe(404);
    },
  );

  it('cookie inválido resulta em 404 sem consultar o DO', async () => {
    expect(
      await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: 'invalid',
      }),
    ).toMatchObject({ status: 404 });
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('falha do DO preserva 503 no proxy sem conteúdo de rascunho', async () => {
    mocks.validate.mockRejectedValue(new Error('I/O indisponível'));
    expect(
      await evaluateArticleAccess({
        isPublicArticle: false,
        previewCookieValue: mocks.cookie.value,
      }),
    ).toMatchObject({ status: 503, accessible: false });
    await expect(
      verifyPreviewSession(client, mocks.cookie.value),
    ).rejects.toBeInstanceOf(PreviewStoreUnavailableError);
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/rascunho', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toContain(
      'Serviço temporariamente indisponível',
    );
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('rascunho', { isPreview: false });
    await expect(getPostBySlug(client, 'rascunho')).rejects.toBeInstanceOf(
      PreviewStoreUnavailableError,
    );
  });

  it('falha da fonte de conteúdo preserva 503 no proxy sem conteúdo de rascunho', async () => {
    mocks.post.mockRejectedValue(
      new Error('Falha na consulta ao Sanity (HTTP 404): dataset inexistente'),
    );
    await expect(
      isArticleAccessible(client, 'rascunho', false),
    ).rejects.toBeInstanceOf(ContentUnavailableError);
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/rascunho', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const body = await response.text();
    expect(body).toContain('Serviço temporariamente indisponível');
    expect(body).not.toContain('Artigo');
    // A checagem pública falha fechada antes de tocar o DO: indisponibilidade
    // de conteúdo não exige que o armazenamento de sessão também esteja de pé.
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('artigo público ignora DO indisponível no proxy e no serviço', async () => {
    mocks.validate.mockRejectedValue(new Error('I/O indisponível'));
    const publicPost = { id: 'public', title: 'Artigo público' };
    mocks.post.mockResolvedValue(publicPost);
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/publico', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await getPostBySlug(client, 'publico')).toBe(publicPost);
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('sanity/AC-05: artigo público é acessível sem consultar o Durable Object', async () => {
    mocks.validate.mockResolvedValue({ valid: true });
    expect(
      await evaluateArticleAccess({ isPublicArticle: true }),
    ).toMatchObject({ accessible: true, status: 200, isPreview: false });
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('sanity/AC-05: o DO é consultado em cada autorização, sem cache intermediário', async () => {
    const draft = { id: 'drafts.1', title: 'Rascunho' };
    mocks.validate.mockResolvedValue({ valid: true });
    // Cada requisição consulta duas vezes: leitura pública (sem rascunho) e
    // perna de preview (com rascunho). Quatro valores, um par por requisição.
    mocks.post
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft);

    const request = () =>
      new NextRequest('http://localhost/artigos/rascunho', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      });
    const first = await updateSession(request());
    const second = await updateSession(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.validate).toHaveBeenCalledTimes(2);
  });

  it('sanity/AC-06: artigo público responde com private, no-store', async () => {
    mocks.post.mockResolvedValue({ id: 'public', title: 'Artigo público' });
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/publico', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('sanity/AC-06: rascunho bloqueado responde 404 real com private, no-store', async () => {
    mocks.post.mockResolvedValue(null);
    mocks.validate.mockResolvedValue({ valid: false });
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/rascunho', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('sanity/AC-06: falha da fonte na perna de preview também vira 503', async () => {
    // A leitura pública encontra nada (slug é rascunho); a perna de preview
    // então falha, e o 503 precisa sair mesmo tendo o DO respondido antes.
    mocks.validate.mockResolvedValue({ valid: true });
    mocks.post
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(
        new Error('Falha na consulta ao Sanity (HTTP 504)'),
      );
    const response = await updateSession(
      new NextRequest('http://localhost/artigos/rascunho', {
        headers: { cookie: `gradualinfo-preview=${mocks.cookie.value}` },
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.text();
    expect(body).toContain('Serviço temporariamente indisponível');
    expect(body).not.toContain('Rascunho');
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
