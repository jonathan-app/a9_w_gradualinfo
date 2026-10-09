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

/**
 * Ativa a análise de bundle somente quando ANALYZE=true (ver o script
 * `bundle:analyze`). Em produção o wrapper é transparente.
 */
const withBundleAnalyzer = createBundleAnalyzer({
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
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
    const isProduction = env.isProduction;
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'Content-Security-Policy',
        // 'unsafe-eval' só fora de produção: o dev server do React precisa dele, e em
        // produção ele abriria eval para qualquer script injetado — por isso some da string.
        value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://va.vercel-scripts.com https://www.googletagmanager.com`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co https://*.sentry.io https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
          "frame-src 'self' https://www.googletagmanager.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          // Sem `form-action`: o Chromium (regressão M132+, crbug 393431137) bloqueia o envio do form
          // e o redirect posterior mesmo para a MESMA origem quando a porta é custom/localhost,
          // tornando o login do painel inoperante. A mitigação de CSRF não depende dessa
          // diretiva: login/logout/preview validam Origin/Referer contra SITE_ORIGIN no servidor
          // (AC-05) — remover a diretiva é seguro aqui e mantém default-src 'self' intacto.
        ].join('; '),
      },
    ];

    // HSTS só em produção com host real em https: fixar `max-age` para localhost prende o
    // dev server ao TLS e o aviso de certificado não confiável não tem volta fácil — por isso
    // a checagem de protocolo e de host antes de emitir o header.
    if (
      isProduction &&
      new URL(env.siteUrl).protocol === 'https:' &&
      !['localhost', '127.0.0.1'].includes(new URL(env.siteUrl).hostname)
    ) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      { source: '/', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      {
        source: '/sitemap.xml',
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
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
