'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * app/error.tsx — erro de renderização dentro de um segmento
 *
 * Client Component por obrigação: o App Router mostra esta tela depois que a
 * renderização do servidor falhou, ou seja, já no browser.
 *
 * `reset()` tenta renderizar de novo sem recarregar a página — é o que salva
 * o usuário de uma navegação desnecessária quando o erro é passageiro.
 *
 * @fileoverview Tela de erro de renderização dentro de um segmento.
 * @module app/error
 * @dependencies react (useEffect), components/ui/button.
 */
/**
 * Fronteira de erro do segmento.
 *
 * @param props.error - Erro da renderização; `digest` é o identificador gerado
 *   no servidor e é o que se reporte em suporte — o resto da pilha não vai para
 *   a tela.
 * @param props.reset - Re-renderiza o segmento sem recarregar a página.
 * @returns Cartão com explicação, diagnóstico (só quando há `digest`) e o botão
 *   "Tentar novamente".
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção isto alimenta o Sentry (ver next.config.ts). O `digest` é o
    // identificador que o servidor e o browser compartilham do mesmo erro.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-border p-6">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        A página não pôde ser renderizada. Tentar de novo resolve na maioria dos
        casos.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Código de diagnóstico: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
