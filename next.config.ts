import createBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

/**
 * next.config.ts
 *
 * O build tem dois caminhos (ver `package.json`):
 *   pnpm build:next → build do Next puro, usado no typecheck e na CI rápida
 *   pnpm build      → o OpenNext empacota a saída do Next para a Cloudflare
 *
 * Este arquivo alimenta os dois. O que é específico da Cloudflare (wrangler,
 * open-next.config.ts) fica lá; aqui fica só o que o Next entende.
 *
 * O Sentry NÃO é configurado aqui: a v11 do @sentry/nextjs tirou o
 * `withSentryConfig` e se inicializa por `instrumentation.ts` (servidor) e
 * `instrumentation-client.ts` (browser).
 */

/**
 * Ativa a análise de bundle somente quando ANALYZE=true (ver o script
 * `bundle:analyze`). Em produção o wrapper é transparente.
 */
const withBundleAnalyzer = createBundleAnalyzer({
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

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

  // Headers de segurança em todas as respostas. `X-Frame-Options: DENY` bloqueia
  // o app de ser embutido em iframe de terceiro (clickjacking).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
