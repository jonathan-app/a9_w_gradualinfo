import * as Sentry from '@sentry/nextjs';

/**
 * instrumentation-client.ts — inicialização no browser
 *
 * O Next carrega este arquivo antes do bundle do cliente, o que faz o Sentry
 * capturar erro do primeiro paint — inclusive o erro de hidratação, que
 * acontece antes de qualquer componente montar.
 *
 * O import é estático de propósito: é assim que o SDK entra no bundle e
 * alcança os erros de módulo. O `init` continua condicional — sem DSN nada é
 * inicializado, e é isso que deixa o build e a CI rodarem sem rede do Sentry.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    // Replay de sessão grava o que o usuário digitou. Em produto com dado
    // pessoal isso é decisão de privacidade, não de performance: só liga com
    // máscara de texto e após revisão jurídica.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
