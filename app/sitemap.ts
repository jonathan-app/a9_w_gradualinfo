import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';

/**
 * app/sitemap.ts
 *
 * Lista estática das rotas públicas do boilerplate. Ao adicionar rota, inclua
 * aqui — sitemap incompleto não é erro de build, mas é página fora do índice.
 */
export default function sitemap(): MetadataRoute.Sitemap {
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
  ];
}
