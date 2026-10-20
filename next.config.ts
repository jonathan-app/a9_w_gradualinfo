/**
 * @fileoverview Configuração do Next — o que o Next entende, nos dois caminhos de build.
 * @module next.config
 * @description O build tem dois caminhos (ver `package.json`):
 *   `pnpm build:next` → build do Next puro, usado no typecheck e na CI rápida;
 *   `pnpm build` → o OpenNext empacota a saída do Next para a Cloudflare Workers.
 *   Este arquivo alimenta os dois. O que é específico da Cloudflare (wrangler,
 *   open-next.config.ts) fica lá; aqui fica só o que o Next entende.
 * @dependencies @next/bundle-analyzer (análise sob demanda), ./lib/env (variáveis tipadas).
 *
 * O Sentry NÃO é configurado aqui: a v11 do @sentry/nextjs tirou o `withSentryConfig` e se
 * inicializa por `instrumentation.ts` (servidor) e `instrumentation-client.ts` (browser).
 */
import createBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import { env } from './lib/env';
import { securityHeaders } from './lib/security-headers';

/**
 * Ativa a análise de bundle somente quando ANALYZE=true (ver o script
 * `bundle:analyze`). Em produção o wrapper é transparente.
 */
const withBundleAnalyzer = createBundleAnalyzer({
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  // A prévia editorial tem saída própria e não disputa o cache do build.
  distDir: env.editorialLocal ? '.next-editorial' : '.next',
  reactStrictMode: true,
  experimental: {
    authInterrupts: true,
  },

  // Sem esta lista, o dev server bloqueia qualquer recurso de `/_next/*` pedido
  // por um host diferente do que ele considera de origem — é o que acontece
  // com `127.0.0.1:3100` (baseURL do Playwright) acessando `localhost:3000`.
  // O sintoma é silencioso e confuso: a página abre, mas o HMR nunca conecta.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Não anuncia a tecnologia do servidor em cada resposta.
  poweredByHeader: false,

  // O Image do Next, em produção, pede o otimizador. Na Cloudflare quem serve
  // a imagem é o bucket (R2), então o CDN do projeto assume esse papel.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },

  // Headers de segurança em todas as respostas.
  async headers() {
    // O conjunto mora em lib/security-headers: as respostas montadas à mão no
    // proxy e no guarda usam o mesmo mapa, e assim os dois caminhos não divergem.
    const securityHeaderList = Object.entries(
      securityHeaders({ isProduction: env.isProduction, siteUrl: env.siteUrl }),
    ).map(([key, value]) => ({ key, value }));

    return [
      // A home é ISR no OpenNext; `no-store` impede o cache de borda de
      // misturar HTML e RSC, que compartilham a URL mas não o corpo.
      { source: '/', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // Filhos do índice, incluindo /sitemap/geral.xml: derivam de conteúdo
        // publicado a qualquer momento e não podem ser servidos de cache.
        source: '/sitemap/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/admin-dashboard/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaderList,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
