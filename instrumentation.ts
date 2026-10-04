/**
 * instrumentation.ts — inicialização no servidor
 *
 * O Next chama `register()` uma vez, quando o runtime sobe, antes de atender a
 * primeira requisição. É o ponto certo para ligar instrumentação que precisa
 * estar ativa antes do primeiro erro.
 *
 * O Sentry v11 não usa mais `withSentryConfig` no next.config: ele se
 * inicializa por aqui, no servidor, e em instrumentation-client.ts, no browser.
 *
 * Sem DSN configurado nada é inicializado — e é o que permite build e CI
 * rodarem sem depender da rede do Sentry.
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
