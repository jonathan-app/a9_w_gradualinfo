/**
 * @fileoverview Filho do sitemap (`/sitemap/<editoria>.xml`) com os artigos da editoria.
 * @module app/sitemap/[editoria]/route
 * @description Um filho por editoria com pelo menos um artigo publicado, mais o
 *   filho reservado `geral` (`/sitemap/geral.xml`) carregando a home. O sufixo
 *   `.xml` faz parte do segmento na URL e é removido aqui antes de casar com os
 *   identificadores derivados do slug da editoria.
 * @dependencies @/lib/services/posts, @/lib/supabase/server (cliente público),
 *   @/lib/seo/sitemap (construtores), @/lib/errors/content.
 */
import { ContentUnavailableError } from '@/lib/errors/content';
import {
  buildSitemapChildren,
  HOME_SITEMAP_ID,
  renderUrlset,
} from '@/lib/seo/sitemap';
import { getPublishedPosts, type Post } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';

// Mesmo motivo do índice: conteúdo publicado a qualquer momento.
export const dynamic = 'force-dynamic';

const XML_SUFFIX = '.xml';

/**
 * Responde o filho do sitemap para a slug pedida.
 *
 * @param _request - Requisição; não é lida.
 * @param context - Contém `params`, a Promise do segmento dinâmico (Next 16).
 * @returns `urlset` 200 do filho; 404 para segmento sem sufixo `.xml` ou
 *   editoria sem artigos publicados; 503 para editoria quando a fonte está
 *   indisponível — 200 só para o filho reservado `geral`, que não depende do
 *   conteúdo — seo/AC-04, seo/AC-05.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ editoria: string }> },
): Promise<Response> {
  const { editoria } = await context.params;
  if (!editoria.endsWith(XML_SUFFIX)) {
    return new Response(null, { status: 404 });
  }
  const id = editoria.slice(0, -XML_SUFFIX.length);

  let posts: Post[] = [];
  try {
    posts = await getPublishedPosts(createPublicClient(), 1000);
  } catch (error) {
    if (!(error instanceof ContentUnavailableError)) throw error;
    // Fonte fora do ar não confirma a lista de uma editoria: 503 manda o
    // rastreador voltar depois em vez de negar o filho. O filho reservado
    // segue respondendo porque a home não depende do conteúdo.
    if (id !== HOME_SITEMAP_ID) {
      return new Response(null, {
        status: 503,
        headers: { 'retry-after': '3600' },
      });
    }
  }

  const child = buildSitemapChildren(posts).find((item) => item.id === id);
  if (!child) {
    return new Response(null, { status: 404 });
  }

  return new Response(renderUrlset(child.urls), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
