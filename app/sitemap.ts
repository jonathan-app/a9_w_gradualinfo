import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';
import { createPublicClient } from '@/lib/supabase/server';
import { getPublishedPosts } from '@/lib/services/posts';

/**
 * app/sitemap.ts
 *
 * Lista dinâmica das rotas públicas do boilerplate. Inclui as rotas estáticas
 * e busca os artigos publicados no banco para indexação.
 *
 * @fileoverview Conteúdo de `/sitemap.xml`.
 * @module app/sitemap
 * @description `force-dynamic` porque a lista vem do banco: artigo publicado
 *   hoje precisa aparecer no sitemap sem um novo deploy.
 * @dependencies lib/supabase/server (cliente público), lib/services/posts
 *   (consulta dos publicados), lib/site-config (SITE_ORIGIN).
 */
export const dynamic = 'force-dynamic';

/**
 * Monta o sitemap do site.
 *
 * @returns Home + um item por artigo publicado (teto de 1000). `lastModified`
 *   usa `published_at`, que é o que muda de fato no conteúdo — `updated_at`
 *   pularia a revisão de metadados e faria o buscador re-ralar sem motivo.
 *   Prioridade 1 na home e 0.8 nos artigos, weekly nos dois.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  // Busca os artigos publicados (limite de 1000 para um sitemap razoável)
  // No futuro, se houver muitos artigos, a paginação do sitemap pode ser necessária.
  const posts = await getPublishedPosts(supabase, 1000);

  const postsSitemap: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_ORIGIN}/artigos/${post.slug}`,
    // `published_at!` é seguro: o filtro `.lte('published_at', ...)` da consulta
    // descarta NULL, então todo post daqui tem data preenchida.
    lastModified: post.published_at!,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_ORIGIN,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...postsSitemap,
  ];
}
