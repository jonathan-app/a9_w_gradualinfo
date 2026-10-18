/**
 * @fileoverview Testes de render da página de artigo (`app/artigos/[slug]/page.tsx`).
 * @module __tests__/unit/app-article-page
 * @description Comprova o gate de dados estruturados: artigo publicado emite
 *   Article e BreadcrumbList com canonical único, rascunho e publicação futura
 *   não emitem nada, slug inexistente vira 404 via notFound e a falha das
 *   leituras relacionadas não derruba o artigo — seo/AC-03, seo/AC-09.
 * @dependencies @testing-library/react, vitest, @/app/artigos/[slug]/page
 *   (deps de dados, sessão, navegação e filhos pesados mockados).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
  SITE_URL: 'https://gradualinfo.com.br/',
  SITE_NAME: 'Gradualinfo',
  SITE_DESCRIPTION: 'Descrição da marca.',
  SITE_LOGO: 'https://gradualinfo.com.br/icon.png',
  SITE_LANGUAGE: 'pt-BR',
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
}));

const getPostBySlug = vi.hoisted(() => vi.fn());
const getPublishedPosts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/posts', () => ({
  getPostBySlug,
  getPublishedPosts,
}));
vi.mock('@/lib/editorial-images', () => ({
  coverImageUrl: () => 'https://gradualinfo.com.br/capa.jpg',
  approvedCoverImageUrl: () => null,
}));
vi.mock('@/components/shared/editorial-cover', () => ({
  EditorialCover: () => <div data-testid="article-cover" />,
}));
vi.mock('@/components/editorial/article-body', () => ({
  ArticleBody: () => <div data-testid="article-body" />,
}));
vi.mock('@/components/editorial/article-share', () => ({
  ArticleShare: () => <div data-testid="article-share" />,
}));

import ArticlePage from '@/app/artigos/[slug]/page';
import { notFound } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo Um',
  content: 'x',
  excerpt: 'resumo',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'Equipe GradualInfo',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00+00:00',
  updated_at: '2026-01-16T12:00:00+00:00',
  created_at: '2026-01-15T12:00:00+00:00',
};

/**
 * Monta as props de rota do segmento dinâmico.
 *
 * @param slug - Segmento de URL pedido.
 * @returns Props no formato do Next 16 (params como Promise).
 */
function pageProps(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

/** Lê os blocos JSON-LD presentes no container renderizado. */
function jsonLdBlocks(container: HTMLElement): Record<string, unknown>[] {
  return Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map(
    (script) =>
      JSON.parse(script.textContent ?? '{}') as Record<string, unknown>,
  );
}

describe('ArticlePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emite Article e BreadcrumbList com canonical único para artigo publicado', async () => {
    getPostBySlug.mockResolvedValue(basePost);
    getPublishedPosts.mockResolvedValue([]);

    const { container } = render(await ArticlePage(pageProps('artigo-1')));

    const articleUrl = 'https://gradualinfo.com.br/artigos/artigo-1';
    const blocks = jsonLdBlocks(container);
    expect(blocks).toHaveLength(2);

    const article = blocks.find((block) => block['@type'] === 'Article');
    expect(article).toMatchObject({
      '@type': 'Article',
      headline: 'Artigo Um',
      url: articleUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    });

    const breadcrumb = blocks.find(
      (block) => block['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumb).toMatchObject({
      itemListElement: [
        {
          position: 1,
          name: 'Início',
          item: 'https://gradualinfo.com.br/',
        },
        { position: 2, name: 'Artigo Um', item: articleUrl },
      ],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Artigo Um' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Em revisão')).toBeNull();
    expect(screen.queryByText('Outras leituras para você')).toBeNull();
  });

  it('não emite JSON-LD para rascunho e o marca em revisão', async () => {
    getPostBySlug.mockResolvedValue({
      ...basePost,
      slug: 'rascunho-1',
      status: 'rascunho',
      published_at: null,
    });
    getPublishedPosts.mockResolvedValue([]);

    const { container } = render(await ArticlePage(pageProps('rascunho-1')));

    expect(jsonLdBlocks(container)).toHaveLength(0);
    expect(container.querySelector('time')).toBeNull();
    expect(screen.getByText('Em revisão')).toBeInTheDocument();
  });

  it('não emite JSON-LD para publicação futura', async () => {
    getPostBySlug.mockResolvedValue({
      ...basePost,
      slug: 'agendado-1',
      published_at: '2999-01-01T00:00:00+00:00',
    });
    getPublishedPosts.mockResolvedValue([]);

    const { container } = render(await ArticlePage(pageProps('agendado-1')));

    expect(jsonLdBlocks(container)).toHaveLength(0);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Artigo Um' }),
    ).toBeInTheDocument();
  });

  it('devolve 404 quando o slug não existe', async () => {
    getPostBySlug.mockResolvedValue(null);

    await expect(ArticlePage(pageProps('nao-existe'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(vi.mocked(notFound)).toHaveBeenCalled();
  });

  it('degrada leituras relacionadas com Sentry e mantém o artigo', async () => {
    getPostBySlug.mockResolvedValue(basePost);
    getPublishedPosts.mockRejectedValue(new Error('falha nas relacionadas'));

    const { container } = render(await ArticlePage(pageProps('artigo-1')));

    expect(jsonLdBlocks(container)).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Artigo Um' }),
    ).toBeInTheDocument();
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledTimes(1);
  });

  it('mostra outras leituras priorizando a mesma editoria', async () => {
    getPostBySlug.mockResolvedValue(basePost);
    getPublishedPosts.mockResolvedValue([
      basePost,
      {
        ...basePost,
        id: '2',
        slug: 'artigo-2',
        title: 'Artigo Dois',
        editoria: 'Tecnologia',
      },
      {
        ...basePost,
        id: '3',
        slug: 'artigo-3',
        title: 'Artigo Três',
        editoria: 'Android',
      },
    ]);

    render(await ArticlePage(pageProps('artigo-1')));

    expect(screen.getByText('Outras leituras para você')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Artigo Dois/ }),
    ).toBeInTheDocument();
  });
});
