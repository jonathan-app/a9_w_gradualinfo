/**
 * @fileoverview Índice do sitemap (`/sitemap.xml`) em formato `sitemapindex`.
 * @module app/sitemap.xml/route
 * @description Route handler no lugar do especial `app/sitemap.ts` porque o
 *   `generateSitemaps` do Next 16 gera apenas os filhos (`/sitemap/<id>.xml`) e
 *   não produz o índice em `/sitemap.xml` (verificado no loader e no
 *   `resolve-route-data` do pacote; decisão registrada na spec 0023).
 * @dependencies @/lib/services/posts, @/lib/supabase/server (cliente público),
 *   @/lib/seo/sitemap (construtores), @/lib/errors/content.
 */
import { ContentUnavailableError } from '@/lib/errors/content';
import { buildSitemapChildren, renderSitemapIndex } from '@/lib/seo/sitemap';
import { getPublishedPosts, type Post } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';

// Sem pré-render: publicado um artigo, o índice mudou — congelar no build
// serviria a lista antiga até o próximo deploy.
export const dynamic = 'force-dynamic';

/**
 * Responde o índice do sitemap, com um filho por editoria publicada.
 *
 * @returns `sitemapindex` 200 com `/sitemap/geral.xml` e um filho por editoria;
 *   com a fonte editorial indisponível, degrada para apenas o filho reservado
 *   `geral` (a home), nunca 500 — seo/AC-05.
 */
export async function GET(): Promise<Response> {
  let posts: Post[] = [];
  try {
    // Mesmo teto da leitura antiga; acima de 1000 posts o sitemap precisa de
    // paginação (follow-up registrado na spec 0023).
    posts = await getPublishedPosts(createPublicClient(), 1000);
  } catch (error) {
    if (!(error instanceof ContentUnavailableError)) throw error;
  }

  return new Response(renderSitemapIndex(buildSitemapChildren(posts)), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
