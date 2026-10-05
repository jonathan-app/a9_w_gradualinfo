import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * app/page.tsx — a home
 *
 * Server Component: nada aqui precisa de interatividade, então não há 'use
 * client' e o JavaScript enviado ao browser não inclui esta árvore.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Gradualinfo</h1>
        <p className="max-w-prose text-muted-foreground">
          Next.js 16 com App Router, React 19, TypeScript 6, Tailwind CSS 4 e
          Supabase. A base já vem com sessão renovada no proxy, design system,
          testes unitários e de ponta a ponta, e o portão de qualidade completo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="/exemplo">Ver página de exemplo</a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://github.com/gradualinfo/gradualinfo"
              target="_blank"
              rel="noreferrer noopener">
              Repositório
            </a>
          </Button>
        </div>
      </section>

      {!isSupabaseConfigured && (
        <Card className="border-brand-500/40 bg-brand-50/60 dark:bg-brand-500/10">
          <CardHeader>
            <CardTitle>Supabase ainda não configurado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Copie <code>.env.example</code> para <code>.env.local</code> e
              preencha as variáveis. O build e a CI passam sem elas; só a
              autenticação precisa delas.
            </p>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="stack" className="flex flex-col gap-4">
        <h2 id="stack" className="text-2xl font-semibold tracking-tight">
          O que já vem pronto
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: 'Sessão sempre renovada',
              body: 'proxy.ts (o middleware do Next 16) revalida o token a cada requisição, então ninguém é deslogado no meio da navegação.',
            },
            {
              title: 'Design system com tokens',
              body: 'Tailwind 4 configurado em CSS: trocar a paleta é editar o @theme, não caçar classes.',
            },
            {
              title: 'Testes em duas camadas',
              body: 'Vitest para unidade e componente; Playwright para o que só quebra em browser de verdade.',
            },
            {
              title: 'Qualidade como gate',
              body: 'Types, lint, formatação e testes rodam antes de qualquer commit merges na main.',
            },
          ].map((item) => (
            <li key={item.title}>
              <Card>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.body}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
