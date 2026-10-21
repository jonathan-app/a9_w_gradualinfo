/**
 * app/robots.ts
 * @fileoverview Conteúdo de `/robots.txt`.
 * @module app/robots
 * @description Gera robots.txt com as rotas sensíveis fora do índice. Orienta
 *   rastreadores; não protege nada por si só — proteção é RLS e auth.
 * @dependencies next (MetadataRoute), lib/site-config (SITE_ORIGIN).
 */
import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';
/**
 * Monta as regras de rastreamento do site.
 *
 * @returns Uma regra única para todos os user-agents: `/` liberado, `/api/`
 *   bloqueado — desindexar a API evita que resposta de endpoint apareça como
 *   página de conteúdo nos resultados — e a URL do sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin-dashboard/'],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
