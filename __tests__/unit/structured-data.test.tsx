/**
 * @fileoverview Testes dos construtores de dados estruturados e do bloco seguro.
 * @module __tests__/unit/structured-data
 * @description Comprova os quatro blocos schema.org (WebSite com SearchAction,
 *   Organization, Article completo e BreadcrumbList) e que todo JSON-LD passa
 *   pela serialização segura de `components/shared/json-ld` — seo/AC-02,
 *   seo/AC-03, seo/AC-09.
 * @dependencies @testing-library/react, vitest, @/lib/seo/structured-data
 *   (site-config e resolvedor de capa mockados).
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/site-config', () => ({
  SITE_NAME: 'Gradualinfo',
  SITE_URL: 'https://gradualinfo.com.br/',
  SITE_ORIGIN: 'https://gradualinfo.com.br',
  SITE_DESCRIPTION: 'Descrição canônica da marca.',
  SITE_LOGO: 'https://gradualinfo.com.br/icon.png',
  SITE_LANGUAGE: 'pt-BR',
}));
vi.mock('@/lib/editorial-images', () => ({
  coverImageUrl: () => 'https://gradualinfo.com.br/capa.jpg',
}));

import { JsonLd } from '@/components/shared/json-ld';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo/structured-data';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo Um',
  content: 'x',
  excerpt: 'Resumo do artigo',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'Equipe GradualInfo',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-16T12:00:00Z',
  created_at: '2026-01-15T12:00:00Z',
};

describe('organizationJsonLd', () => {
  it('sai inteiro da configuração de site, com logo absoluto', () => {
    expect(organizationJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gradualinfo',
      url: 'https://gradualinfo.com.br/',
      logo: 'https://gradualinfo.com.br/icon.png',
      description: 'Descrição canônica da marca.',
    });
  });
});

describe('websiteJsonLd', () => {
  it('traz publisher e SearchAction com o marcador literal do schema.org', () => {
    const block = websiteJsonLd();
    expect(block).toMatchObject({
      '@type': 'WebSite',
      name: 'Gradualinfo',
      url: 'https://gradualinfo.com.br/',
      inLanguage: 'pt-BR',
    });
    expect(block.publisher).toMatchObject({ '@type': 'Organization' });
    expect(block.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://gradualinfo.com.br/busca?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    });
  });
});

describe('articleJsonLd', () => {
  it('completa headline, url, mainEntityOfPage, imagem 1200x630 e publisher', () => {
    const url = 'https://gradualinfo.com.br/artigos/artigo-1';
    expect(articleJsonLd(basePost, url)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Artigo Um',
      description: 'Resumo do artigo',
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image: [
        {
          '@type': 'ImageObject',
          url: 'https://gradualinfo.com.br/capa.jpg',
          width: 1200,
          height: 630,
        },
      ],
      datePublished: '2026-01-15T12:00:00Z',
      dateModified: '2026-01-16T12:00:00Z',
      author: { '@type': 'Person', name: 'Equipe GradualInfo' },
      inLanguage: 'pt-BR',
    });
    expect(articleJsonLd(basePost, url).publisher).toMatchObject({
      '@type': 'Organization',
      name: 'Gradualinfo',
    });
  });
});

describe('breadcrumbJsonLd', () => {
  it('numera posições na ordem da trilha, com dois itens', () => {
    const url = 'https://gradualinfo.com.br/artigos/artigo-1';
    const block = breadcrumbJsonLd([
      { name: 'Início', url: 'https://gradualinfo.com.br/' },
      { name: 'Artigo Um', url },
    ]);
    expect(block).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: 'https://gradualinfo.com.br/',
        },
        { '@type': 'ListItem', position: 2, name: 'Artigo Um', item: url },
      ],
    });
  });
});

describe('JsonLd', () => {
  it('serializa com escape e devolve o dado fiel ao parser', () => {
    const malicious = '</script><script>alert(1)</script> & "aspas"';
    const { container } = render(
      <JsonLd
        data={articleJsonLd(
          { ...basePost, title: malicious },
          'https://gradualinfo.com.br/artigos/artigo-1',
        )}
      />,
    );

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(1);
    expect(container.querySelectorAll('script')).toHaveLength(1);

    const raw = scripts[0]?.textContent ?? '';
    expect(raw).not.toContain('</script>');
    // O dado continua fiel para o buscador: o parse recupera a string crua.
    const parsed = JSON.parse(raw) as { headline: string };
    expect(parsed.headline).toBe(malicious);
  });
});
