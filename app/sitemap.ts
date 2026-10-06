import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';
import { getPublishedPosts } from '@/lib/services/posts';

/**
 * app/sitemap.ts
 *
 * Lista dinâmica das rotas públicas do boilerplate. Inclui as rotas estáticas
 * e busca os artigos publicados no banco para indexação.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Busca os artigos publicados (limite de 1000 para um sitemap razoável)
  // No futuro, se houver muitos artigos, a paginação do sitemap pode ser necessária.
  const posts = await getPublishedPosts(supabase, 1000);

  const postsSitemap: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_ORIGIN}/artigos/${post.slug}`,
    lastModified: post.published_at || new Date(),
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
    {
      url: `${SITE_ORIGIN}/exemplo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postsSitemap,
  ];
}
