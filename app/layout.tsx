import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { env } from '@/lib/env';
import './globals.css';

/**
 * app/layout.tsx — o Invólucro (root layout)
 *
 * Server Component por padrão. Ele é renderizado UMA vez no servidor e o
 * resultado é reenviado ao browser; o que for interativo precisa virar Client
 * Component explicitamente com 'use client'.
 *
 * Por que a fonte vem por `next/font`: o arquivo é baixado no build e servido
 * pelo próprio Next, sem requisição ao Google — sem risco de bloqueio, sem
 * layout shift e com `font-display: swap` já configurado.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'Gradualinfo',
    template: '%s | Gradualinfo',
  },
  description:
    'Boilerplate profissional com Next.js 16, React 19, TypeScript, Tailwind CSS 4 e Supabase.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Gradualinfo',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning`: o next-themes escreve a classe `dark`/`light`
    // no <html> antes do React hidratar. A diferença entre o HTML do servidor
    // e o do cliente neste atributo é esperada, não é bug.
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
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
