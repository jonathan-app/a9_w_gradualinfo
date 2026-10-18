/**
 * @fileoverview Testes de coerência de canonical, robots e títulos por página.
 * @module __tests__/unit/seo-metadata
 * @description Prova a cobertura da auditoria no `check:all`: canonical e
 *   robots da home, do artigo e do 404; `/busca` com noindex e follow e sem
 *   canonical; preview e painel fora do índice; e o template do layout com a
 *   grafia canônica uma única vez — seo/AC-06, seo/AC-08.
 * @dependencies vitest, metadados exportados por app/**, app/robots
 *   (deps de dados mockadas).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
  createPublicClient: vi.fn(() => ({})),
}));
const getPostBySlug = vi.hoisted(() => vi.fn());
const getPublishedPosts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/posts', () => ({
  getPostBySlug,
  getPublishedPosts,
}));
vi.mock('@/lib/editorial-images', () => ({
  approvedCoverImageUrl: () => null,
  coverImageUrl: () => 'https://gradualinfo.com.br/capa.jpg',
}));
vi.mock('@/lib/admin/access-guard', () => ({
  requireAdminAccessPage: vi.fn(async () => undefined),
}));

import { metadata as rootMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as buscaMetadata } from '@/app/busca/page';
import { metadata as previewMetadata } from '@/app/preview/page';
import { metadata as adminMetadata } from '@/app/admin-dashboard/layout';
import { generateMetadata as articleMetadata } from '@/app/artigos/[slug]/page';
import robots from '@/app/robots';
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site-config';

const basePost = {
  id: '1',
  slug: 'fixture-publicado',
  title: 'Fixture publicado',
  content: 'x',
  excerpt: 'Exemplo local',
  cover_image_url: '',
  editoria: 'Mão na Massa',
  author_name: 'Equipe GradualInfo',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  created_at: '2026-01-15T12:00:00Z',
};

describe('metadados de SEO por página', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublishedPosts.mockResolvedValue([]);
    getPostBySlug.mockImplementation(async (_client: unknown, slug: string) => {
      if (slug === 'fixture-publicado') return basePost;
      if (slug === 'fixture-rascunho') {
        return {
          ...basePost,
          slug,
          status: 'rascunho' as const,
          published_at: null,
        };
      }
      return null;
    });
  });

  it('layout publica a grafia canônica no título, na descrição e no Open Graph', () => {
    const title = rootMetadata.title as {
      default: string;
      template: string;
    };
    expect(title.default).toBe(SITE_NAME);
    expect(title.template).toBe(`%s | ${SITE_NAME}`);
    expect(rootMetadata.description).toBe(SITE_DESCRIPTION);
    expect(rootMetadata.openGraph?.siteName).toBe(SITE_NAME);
  });

  it('home tem canonical no apex', () => {
    expect(homeMetadata.alternates?.canonical).toBe(SITE_ORIGIN);
  });

  it('artigo publicado tem canonical absoluto e não é noindex', async () => {
    const metadata = await articleMetadata(
      { params: Promise.resolve({ slug: 'fixture-publicado' }) },
      {} as never,
    );
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_ORIGIN}/artigos/fixture-publicado`,
    );
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph?.type).toBe('article');
  });

  it('rascunho e 404 de artigo saem do índice', async () => {
    const draft = await articleMetadata(
      { params: Promise.resolve({ slug: 'fixture-rascunho' }) },
      {} as never,
    );
    expect(draft.robots).toMatchObject({ index: false, follow: false });

    const missing = await articleMetadata(
      { params: Promise.resolve({ slug: 'slug-inexistente' }) },
      {} as never,
    );
    expect(missing.robots).toMatchObject({ index: false, follow: false });
  });

  it('/busca mantém noindex com follow, sem canonical e sem sufixo duplicado', () => {
    expect(buscaMetadata.title).toBe('Pesquisa de artigos');
    expect(String(buscaMetadata.title)).not.toContain('|');
    expect(buscaMetadata.robots).toMatchObject({
      index: false,
      follow: true,
    });
    expect(buscaMetadata.alternates?.canonical).toBeUndefined();
  });

  it('painel administrativo e preview ficam fora do índice, sem sufixo duplicado', () => {
    expect(adminMetadata.title).toBe('Painel Administrativo');
    expect(String(adminMetadata.title)).not.toContain('|');
    expect(adminMetadata.robots?.index).toBe(false);
    expect(previewMetadata.robots?.index).toBe(false);
  });

  it('robots.txt bloqueia API e painel e aponta para o índice do sitemap', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallow = rules.flatMap((rule) => rule.disallow ?? []);
    expect(disallow).toContain('/api/');
    expect(disallow).toContain('/admin-dashboard/');
    expect(result.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
  });
});
