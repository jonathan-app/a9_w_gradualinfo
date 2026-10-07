/**
 * @fileoverview Inicialização do Sentry no servidor (`instrumentation.ts`).
 * @module instrumentation
 * @description O Next chama `register()` uma vez, quando o runtime sobe, antes de atender a
 *   primeira requisição — é o ponto certo para instrumentação que precisa estar ativa antes do
 *   primeiro erro. Junto com `instrumentation-client.ts`, forma o init do Sentry v11: a v11
 *   tirou o `withSentryConfig` do next.config, então estes dois arquivos são o init inteiro.
 * @dependencies @sentry/nextjs (import dinâmico), `NEXT_PUBLIC_SENTRY_DSN`.
 *
 * Sem DSN configurado nada é inicializado — e é o que permite build e CI rodarem sem depender
 * da rede do Sentry. O import é dinâmico porque só entra no bundle se houver DSN.
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) return;

  const Sentry = await import('@sentry/nextjs');

  Sentry.init({
    dsn,
    enabled: true,
    // 10% das requisições em produção: amostra suficiente para achar regressão
    // sem pagar o custo de cada transação.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  });
}
