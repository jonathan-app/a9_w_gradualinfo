/**
 * @fileoverview Construtores de dados estruturados (JSON-LD) do portal.
 * @module lib/seo/structured-data
 * @description Monta os blocos schema.org consumidos pela home (WebSite e
 *   Organization) e pelo artigo (Article e BreadcrumbList) a partir da
 *   configuração de site e do post publicado. Os valores institucionais vêm de
 *   `lib/site-config.ts` e a imagem do resolvedor de capa; a injeção segura no
 *   documento fica em `components/shared/json-ld.tsx`, único caminho de script.
 * @dependencies @/lib/site-config, @/lib/editorial-images, @/lib/services/posts.
 */
import { coverImageUrl } from '@/lib/editorial-images';
import type { Post } from '@/lib/services/posts';
import {
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOGO,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_URL,
} from '@/lib/site-config';

const SCHEMA_CONTEXT = 'https://schema.org';

/**
 * Nó de Organization reutilizável dentro de outros blocos.
 *
 * Fica sem `@context` de propósito: quando embutido como `publisher`, o
 * contexto do bloco externo já vale para ele.
 *
 * @returns Organização canônica com nome, url, logo absoluto e descrição.
 */
function organizationNode() {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description: SITE_DESCRIPTION,
  };
}

/**
 * Constrói o bloco Organization da home.
 *
 * @returns Bloco schema.org completo, alimentado por `lib/site-config.ts`.
 */
export function organizationJsonLd() {
  return { '@context': SCHEMA_CONTEXT, ...organizationNode() };
}

/**
 * Constrói o bloco WebSite da home, com a ação de busca interna.
 *
 * @returns Bloco schema.org com publisher e SearchAction apontando para
 *   `/busca?q={search_term_string}` — o marcador entre chaves é literal do
 *   schema.org e não pode ser codificado na URL.
 */
export function websiteJsonLd() {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: SITE_LANGUAGE,
    publisher: organizationNode(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/busca?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Constrói o bloco Article de um post publicado.
 *
 * @param post - Post no formato consumido pela UI, com data pública real.
 * @param url - Canonical absoluto do artigo (o chamador decide o momento de emitir).
 * @returns Article completo: headline, description, url, mainEntityOfPage,
 *   imagem 1200x630 declarada como no Open Graph, datas, autor e publisher.
 */
export function articleJsonLd(post: Post, url: string) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: [
      {
        '@type': 'ImageObject',
        url: coverImageUrl(post.cover_image_url),
        width: 1200,
        height: 630,
      },
    ],
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author_name },
    publisher: organizationNode(),
    inLanguage: SITE_LANGUAGE,
  };
}

/**
 * Constrói um bloco BreadcrumbList.
 *
 * @param items - Trilha na ordem de navegação; a posição é derivada do índice.
 * @returns Bloco schema.org com um ListItem por item, sem página intermediária
 *   inventada: o contrato usa dois itens (início e o artigo).
 */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
