import Link from 'next/link';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';

/**
 * components/layout/site-header.tsx — cabeçalho
 *
 * Server Component: só link e navegação. O único pedaço interativo (o
 * alternador de tema) é uma folha client — o cabeçalho inteiro não paga o
 * custo de hidratação.
 *
 * `<nav aria-label>` nomeia a região de navegação para quem navega por leitor
 * de tela; sem isso o leitor anuncia "navigation" sem dizer de quê.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Gradualinfo
        </Link>

        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Início</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/exemplo">Exemplo</Link>
          </Button>
        </nav>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
