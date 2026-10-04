import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format';

/**
 * app/exemplo/page.tsx — página de referência
 *
 * Serve a três propósitos: mostra uma rota com `metadata` própria, demonstra as
 * funções de formatação de lib/utils e serve de destino para o teste de ponta
 * a ponta (e2e/home.spec.ts) e para o Lighthouse (ver lighthouserc.js).
 *
 * Ela é estática de propósito: `generateStaticParams` não é necessário sem
 * entrada dinâmica, e o Next pré-renderiza em build.
 */
export const metadata: Metadata = {
  title: 'Exemplo',
  description: 'Página de referência do boilerplate: rotas, formatação e UI.',
};

export default function ExemploPage() {
  // Valores fixos: esta página não consulta dado, é um exemplo de formatação.
  const exemplo = {
    precoCentavos: 12990,
    itens: 1234,
    publicadoEm: new Date('2026-01-15T12:00:00.000Z'),
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Exemplo</h1>
        <p className="max-w-prose text-muted-foreground">
          Uma rota estática com <code>metadata</code> própria, usando os
          utilitários de formatação do projeto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formatação</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Moeda</dt>
              <dd className="font-medium">
                {formatCurrency(exemplo.precoCentavos)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Número</dt>
              <dd className="font-medium">{formatNumber(exemplo.itens)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium">{formatDate(exemplo.publicadoEm)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <p>
        <Link
          href="/"
          className="text-brand-600 underline-offset-4 hover:underline">
          Voltar para o início
        </Link>
      </p>
    </div>
  );
}
