import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { GoogleAnalytics } from '@/components/shared/google-analytics';
import { GoogleTagManager } from '@/components/shared/google-tag-manager';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { env } from '@/lib/env';
import { GOOGLE_SITE_VERIFICATION } from '@/lib/site-config';
import './globals.css';

/**
 * app/layout.tsx — o Invólucro (root layout)
 *
 * Server Component por padrão. Ele é renderizado UMA vez no servidor e o
 * resultado é reenviado ao browser; o que for interativo precisa virar Client
 * Component explicitamente com 'use client'.
 *
 * Fontes: `app/globals.css` aponta `--font-sans`/`--font-mono` para
 * `--font-geist-sans`/`--font-geist-mono`, mas nada no projeto define essas
 * variáveis (não há `next/font`, `@font-face` nem import de Google Fonts), então
 * na prática vale o fallback `ui-sans-serif, system-ui` / `ui-monospace` — sem
 * requisição externa e sem layout shift, ao preço de não ter fonte própria.
 *
 * @fileoverview Root layout: o invólucro único de toda página do App Router.
 * @module app/layout
 * @dependencies ThemeProvider, SiteHeader, SiteFooter, GoogleAnalytics,
 *   GoogleTagManager, lib/env (siteUrl), lib/site-config (verificação do
 *   Google), app/globals.css (tokens, tema e fonte).
 */
/**
 * Metadados base do site, herdados por todas as rotas.
 *
 * `metadataBase` resolve os URLs relativos (canonical e OG) contra o domínio de
 * produção; `title.template` é o que monta "Página | Gradualinfo" nas rotas
 * filhas; `verification.google` publica a meta de verificação do Search
 * Console.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'Gradualinfo',
    template: '%s | Gradualinfo',
  },
  description:
    'Guias de tecnologia para estudantes de programação tomarem decisões sobre equipamentos e ferramentas.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Gradualinfo',
  },
  robots: { index: true, follow: true },
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
};

/**
 * Layout raiz — o App Router exige este arquivo, e é o único que renderiza
 * `<html>`.
 *
 * @param props.children - Conteúdo da rota atual.
 * @returns Documento completo: analytics antes do app (para não perder a
 *   pageview de quem já sai cedo), skip-link como primeiro elemento focável,
 *   `<main id="conteudo">` como destino do salto e header/footer em volta.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning`: o next-themes escreve a classe `dark`/`light`
    // no <html> antes do React hidratar. A diferença entre o HTML do servidor
    // e o do cliente neste atributo é esperada, não é bug.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://www.googletagmanager.com"
          crossOrigin=""
        />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <GoogleTagManager />
        <GoogleAnalytics />
        <ThemeProvider>
          {/* `skip` leva o foco ao conteúdo, permitindo pular o menu com o
              primeiro Tab. É requisito de acessibilidade, não enfeite. */}
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">
            Pular para o conteúdo
          </a>
          <SiteHeader />
          <main
            id="conteudo"
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
