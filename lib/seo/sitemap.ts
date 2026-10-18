/**
 * @fileoverview Construtores do sitemap: agrupamento por editoria e XML.
 * @module lib/seo/sitemap
 * @description Deriva os filhos do sitemap do conjunto de artigos que a leitura
 *   editorial vigente já publica — o filtro de visibilidade mora no serviço, e
 *   aqui não se refiltra. O filho reservado `geral` carrega a home e os artigos
 *   sem editoria; cada editoria ganha um identificador por slug determinístico
 *   com guarda de colisão por sufixo. Todo valor que entra no XML passa por
 *   `escapeXml`.
 * @dependencies @/lib/site-config, @/lib/utils/format, @/lib/services/posts.
 */
import type { Post } from '@/lib/services/posts';
import { SITE_ORIGIN } from '@/lib/site-config';
import { slugify } from '@/lib/utils/format';

/** Identificador do filho reservado: a home e os artigos sem editoria. */
export const HOME_SITEMAP_ID = 'geral';

/** Uma linha `<url>` do filho do sitemap. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

/** Um filho do índice: o identificador vira `/sitemap/<id>.xml`. */
export interface SitemapChild {
  id: string;
  urls: SitemapUrl[];
}

/**
 * Escapa um valor para texto XML.
 *
 * Aspas simples e duplas também são escapadas: o mesmo helper serve atributo
 * e conteúdo, e escolher entre os dois é bug esperando acontecer.
 *
 * @param value - Valor bruto vindo do banco ou da configuração.
 * @returns Valor seguro para entrar no documento XML.
 */
export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

/**
 * Encontra o maior `published_at` de uma lista, preservando o valor original.
 *
 * @param posts - Artigos publicados.
 * @returns O valor do mais novo, ou `undefined` quando nenhum tem data.
 */
function newestPublished(posts: Post[]): string | undefined {
  let newest: string | undefined;
  for (const post of posts) {
    if (!post.published_at) continue;
    if (!newest || Date.parse(post.published_at) > Date.parse(newest)) {
      newest = post.published_at;
    }
  }
  return newest;
}

/**
 * Atribui um identificador determinístico a cada nome de editoria.
 *
 * A ordenação alfabética fixa quem fica com o slug limpo quando dois nomes
 * colidem ("C++" e "C--" viram `c` e `c-2`); nomes que geram o identificador
 * reservado (`geral`) são dobrados no filho da home.
 *
 * @param names - Nomes de editoria já normalizados e sem vazios.
 * @returns Mapa do nome para o identificador do filho.
 */
function editoriaIdMap(names: string[]): Map<string, string> {
  const ids = new Map<string, string>();
  const taken = new Set<string>();
  for (const name of [...new Set(names)].sort()) {
    const base = slugify(name);
    if (base === HOME_SITEMAP_ID) {
      ids.set(name, HOME_SITEMAP_ID);
      continue;
    }
    let candidate = base;
    let suffix = 2;
    while (taken.has(candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    taken.add(candidate);
    ids.set(name, candidate);
  }
  return ids;
}

/**
 * Endereço público de um artigo no sitemap.
 *
 * @param post - Artigo publicado.
 * @returns Loc absoluto a partir de `SITE_ORIGIN` e lastmod igual a `published_at`.
 */
function postUrl(post: Post): SitemapUrl {
  return {
    loc: `${SITE_ORIGIN}/artigos/${post.slug}`,
    lastmod: post.published_at ?? undefined,
  };
}

/**
 * Agrupa os artigos publicados em filhos do sitemap.
 *
 * @param posts - Artigos publicados, na ordem da leitura vigente.
 * @returns O filho reservado `geral` primeiro (home com lastmod do maior
 *   `published_at`, mais artigos sem editoria), seguido de um filho por
 *   editoria em ordem alfabética; editoria sem artigo não gera filho, e cada
 *   artigo aparece em exatamente um filho.
 */
export function buildSitemapChildren(posts: Post[]): SitemapChild[] {
  const names = posts
    .map((post) => post.editoria.trim())
    .filter((name) => name.length > 0);
  const ids = editoriaIdMap(names);

  const groups = new Map<string, Post[]>([[HOME_SITEMAP_ID, []]]);
  for (const post of posts) {
    const name = post.editoria.trim();
    const id = (name && ids.get(name)) || HOME_SITEMAP_ID;
    const list = groups.get(id) ?? [];
    list.push(post);
    groups.set(id, list);
  }

  const geral: SitemapChild = {
    id: HOME_SITEMAP_ID,
    urls: [
      { loc: SITE_ORIGIN, lastmod: newestPublished(posts) },
      ...(groups.get(HOME_SITEMAP_ID) ?? []).map(postUrl),
    ],
  };

  const editorias: SitemapChild[] = [];
  for (const name of [...new Set(names)].sort()) {
    const id = ids.get(name);
    if (!id || id === HOME_SITEMAP_ID) continue;
    editorias.push({ id, urls: (groups.get(id) ?? []).map(postUrl) });
  }

  return [geral, ...editorias];
}

/**
 * Serializa o índice em formato `sitemapindex`.
 *
 * @param children - Filhos derivados de `buildSitemapChildren`.
 * @returns Documento XML completo do índice, com os locs escapados.
 */
export function renderSitemapIndex(children: SitemapChild[]): string {
  const entries = children
    .map(
      (child) =>
        `<sitemap><loc>${escapeXml(`${SITE_ORIGIN}/sitemap/${child.id}.xml`)}</loc></sitemap>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

/**
 * Serializa as URLs de um filho em formato `urlset`.
 *
 * @param urls - URLs do filho.
 * @returns Documento XML completo do filho, com loc e lastmod escapados.
 */
export function renderUrlset(urls: SitemapUrl[]): string {
  const entries = urls
    .map(
      (url) =>
        `<url><loc>${escapeXml(url.loc)}</loc>${
          url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : ''
        }</url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}
