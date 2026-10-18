/**
 * @fileoverview Testes do sitemap em índice e dos filhos por editoria.
 * @module __tests__/unit/sitemap
 * @description Comprova o índice `sitemapindex` (filho reservado `geral`
 *   primeiro, um filho por editoria publicada, guarda de colisão de slug), o
 *   conteúdo dos filhos (cobertura exata dos publicados, lastmod, home no
 *   reservado), o escaping e a degradação sob ContentUnavailableError —
 *   seo/AC-04, seo/AC-05, seo/AC-06.
 * @dependencies vitest, @/app/sitemap.xml/route, @/app/sitemap/[editoria]/route,
 *   @/lib/seo/sitemap (mock das deps de dados).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));
vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(() => ({})),
}));
const getPublishedPosts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/posts', () => ({
  getPublishedPosts,
}));
vi.mock('@/lib/errors/content', () => ({
  ContentUnavailableError: class ContentUnavailableError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ContentUnavailableError';
    }
  },
}));

import { GET as getIndex } from '@/app/sitemap.xml/route';
import { GET as getChild } from '@/app/sitemap/[editoria]/route';
import { ContentUnavailableError } from '@/lib/errors/content';
import {
  buildSitemapChildren,
  escapeXml,
  renderUrlset,
} from '@/lib/seo/sitemap';

const ORIGIN = 'https://gradualinfo.com.br';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo Um',
  content: 'x',
  excerpt: 'resumo',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'a',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00+00:00',
  updated_at: '2026-01-15T12:00:00+00:00',
  created_at: '2026-01-15T12:00:00+00:00',
};

function post(overrides: Partial<typeof basePost>): typeof basePost {
  return { ...basePost, ...overrides };
}

/** Extrai os `<loc>` de um documento XML do sitemap. */
function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]!);
}

/** Contexto de rota do segmento dinâmico `[editoria]`. */
function childContext(editoria: string) {
  return { params: Promise.resolve({ editoria }) };
}

/** Constrói os filhos a partir do índice e devolve todas as URLs cobertas. */
async function allUrlsFromIndex(indexXml: string): Promise<string[]> {
  const urls: string[] = [];
  for (const child of locs(indexXml)) {
    const file = child.slice(child.lastIndexOf('/') + 1);
    const response = await getChild(new Request(child), childContext(file));
    expect(response.status).toBe(200);
    urls.push(...locs(await response.text()));
  }
  return urls;
}

describe('índice /sitemap.xml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista o filho geral primeiro e um filho por editoria em ordem alfabética', async () => {
    getPublishedPosts.mockResolvedValue([
      post({ id: '1', slug: 'um', editoria: 'Tecnologia' }),
      post({ id: '2', slug: 'dois', editoria: 'Mão na Massa' }),
      post({ id: '3', slug: 'tres', editoria: 'Android' }),
    ]);

    const response = await getIndex();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/xml; charset=utf-8',
    );
    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
    expect(locs(xml)).toEqual([
      `${ORIGIN}/sitemap/geral.xml`,
      `${ORIGIN}/sitemap/android.xml`,
      `${ORIGIN}/sitemap/mao-na-massa.xml`,
      `${ORIGIN}/sitemap/tecnologia.xml`,
    ]);
  });

  it('não gera filho para editoria sem artigo publicado', async () => {
    getPublishedPosts.mockResolvedValue([
      post({ id: '1', slug: 'um', editoria: 'Tecnologia' }),
    ]);

    const xml = await (await getIndex()).text();
    expect(locs(xml)).toHaveLength(2);
    expect(xml).not.toContain('mao-na-massa');
  });

  it('resolve colisão de slug de editoria deterministicamente', async () => {
    getPublishedPosts.mockResolvedValue([
      post({ id: '1', slug: 'um', editoria: 'C++' }),
      post({ id: '2', slug: 'dois', editoria: 'C--' }),
    ]);

    // Ordem alfabética fixa quem fica com o slug limpo: "C++" < "C--".
    const xml = await (await getIndex()).text();
    expect(locs(xml)).toEqual([
      `${ORIGIN}/sitemap/geral.xml`,
      `${ORIGIN}/sitemap/c.xml`,
      `${ORIGIN}/sitemap/c-2.xml`,
    ]);
  });

  it('dobra a editoria chamada Geral no filho reservado', async () => {
    getPublishedPosts.mockResolvedValue([
      post({ id: '1', slug: 'um', editoria: 'Geral' }),
    ]);

    const xml = await (await getIndex()).text();
    expect(locs(xml)).toEqual([`${ORIGIN}/sitemap/geral.xml`]);
    expect(xml).not.toContain('geral-2');
  });

  it('cobre exatamente home e artigos publicados, cada um uma vez', async () => {
    getPublishedPosts.mockResolvedValue([
      post({ id: '1', slug: 'um' }),
      post({ id: '2', slug: 'dois', editoria: 'Mão na Massa' }),
      post({ id: '3', slug: 'tres', editoria: '' }),
    ]);

    const urls = await allUrlsFromIndex(await (await getIndex()).text());
    expect(new Set(urls)).toEqual(
      new Set([
        ORIGIN,
        `${ORIGIN}/artigos/um`,
        `${ORIGIN}/artigos/dois`,
        `${ORIGIN}/artigos/tres`,
      ]),
    );
    expect(urls).toHaveLength(4);
  });

  it('degrada para o filho geral sob ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(
      new ContentUnavailableError('Sanity fora'),
    );

    const response = await getIndex();
    expect(response.status).toBe(200);
    expect(locs(await response.text())).toEqual([
      `${ORIGIN}/sitemap/geral.xml`,
    ]);
  });

  it('relança erro que não é ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(new Error('bug'));
    await expect(getIndex()).rejects.toThrow('bug');
  });
});

describe('filho /sitemap/<editoria>.xml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde o filho reservado com a home e lastmod do maior published_at', async () => {
    getPublishedPosts.mockResolvedValue([
      post({
        id: '1',
        slug: 'um',
        editoria: 'Tecnologia',
        published_at: '2026-01-10T12:00:00+00:00',
      }),
      post({
        id: '2',
        slug: 'dois',
        editoria: '',
        published_at: '2026-02-01T09:30:00Z',
      }),
    ]);

    const response = await getChild(
      new Request(`${ORIGIN}/sitemap/geral.xml`),
      childContext('geral.xml'),
    );
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('<urlset');
    // Primeira URL é a home, com o lastmod do artigo mais novo de todo o site.
    expect(xml.indexOf(`<loc>${ORIGIN}</loc>`)).toBeLessThan(
      xml.indexOf('<lastmod>'),
    );
    expect(xml).toContain(
      `<loc>${ORIGIN}</loc><lastmod>2026-02-01T09:30:00Z</lastmod>`,
    );
    // Artigo sem editoria não some do sitemap: cai no filho reservado.
    expect(xml).toContain(`<loc>${ORIGIN}/artigos/dois</loc>`);
    expect(xml).not.toContain('/artigos/um');
  });

  it('responde o filho da editoria com os artigos dela e lastmod igual a published_at', async () => {
    getPublishedPosts.mockResolvedValue([
      post({
        id: '1',
        slug: 'um',
        editoria: 'Tecnologia',
        published_at: '2026-01-15T12:00:00+00:00',
      }),
      post({ id: '2', slug: 'dois', editoria: 'Mão na Massa' }),
    ]);

    const response = await getChild(
      new Request(`${ORIGIN}/sitemap/tecnologia.xml`),
      childContext('tecnologia.xml'),
    );
    expect(response.status).toBe(200);
    const xml = await response.text();
    // O "+" do fuso é valor legítimo de lastmod: não é escapado.
    expect(xml).toContain(
      `<url><loc>${ORIGIN}/artigos/um</loc><lastmod>2026-01-15T12:00:00+00:00</lastmod></url>`,
    );
    expect(xml).not.toContain('/artigos/dois');
  });

  it('devolve 404 para editoria desconhecida', async () => {
    getPublishedPosts.mockResolvedValue([post({})]);

    const response = await getChild(
      new Request(`${ORIGIN}/sitemap/inexistente.xml`),
      childContext('inexistente.xml'),
    );
    expect(response.status).toBe(404);
  });

  it('devolve 404 para segmento sem sufixo .xml', async () => {
    const response = await getChild(
      new Request(`${ORIGIN}/sitemap/tecnologia`),
      childContext('tecnologia'),
    );
    expect(response.status).toBe(404);
    expect(getPublishedPosts).not.toHaveBeenCalled();
  });

  it('devolve 503 para editoria indisponível, mas mantém o filho geral', async () => {
    getPublishedPosts.mockRejectedValue(
      new ContentUnavailableError('Sanity fora'),
    );

    const reserved = await getChild(
      new Request(`${ORIGIN}/sitemap/geral.xml`),
      childContext('geral.xml'),
    );
    expect(reserved.status).toBe(200);
    const xml = await reserved.text();
    expect(xml).toContain(`<loc>${ORIGIN}</loc>`);
    expect(xml).not.toContain('<lastmod>');

    const editoria = await getChild(
      new Request(`${ORIGIN}/sitemap/tecnologia.xml`),
      childContext('tecnologia.xml'),
    );
    expect(editoria.status).toBe(503);
    expect(editoria.headers.get('retry-after')).toBe('3600');
  });

  it('relança erro que não é ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(new Error('bug'));
    await expect(
      getChild(
        new Request(`${ORIGIN}/sitemap/tecnologia.xml`),
        childContext('tecnologia.xml'),
      ),
    ).rejects.toThrow('bug');
  });
});

describe('construtores', () => {
  it('escapa os caracteres reservados de XML', () => {
    expect(escapeXml(`<a & b> "c" 'd'`)).toBe(
      '&lt;a &amp; b&gt; &quot;c&quot; &apos;d&apos;',
    );
  });

  it('escapa o loc e preserva o lastmod no urlset', () => {
    const xml = renderUrlset([
      {
        loc: `${ORIGIN}/artigos/a&b`,
        lastmod: '2026-01-15T12:00:00+00:00',
      },
    ]);
    expect(xml).toContain(`<loc>${ORIGIN}/artigos/a&amp;b</loc>`);
    expect(xml).toContain('<lastmod>2026-01-15T12:00:00+00:00</lastmod>');
  });

  it('mantém o filho reservado mesmo sem artigos', () => {
    const children = buildSitemapChildren([]);
    expect(children).toHaveLength(1);
    expect(children[0]?.id).toBe('geral');
    expect(children[0]?.urls).toEqual([{ loc: ORIGIN, lastmod: undefined }]);
  });
});
