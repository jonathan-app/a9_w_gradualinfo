import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';

/**
 * app/robots.ts
 *
 * Gera robots.txt com as rotas sensíveis fora do índice. Orienta rastreadores;
 * não protege nada por si só — proteção é RLS e auth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
