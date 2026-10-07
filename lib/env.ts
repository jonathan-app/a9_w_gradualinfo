/**
 * lib/env.ts — leitura única e tipada das variáveis de ambiente
 *
 * Por que este arquivo existe
 * - Um lugar só para saber o nome de cada variável (o `.env.example` documenta,
 *   este arquivo tipa).
 * - O build (`pnpm build:next`) e a CI rodam SEM `.env`. Se a leitura lançar
 *   erro quando falta variável, o build quebra sem necessidade. Então cada
 *   valor tem um padrão local: o build passa e `pnpm supabase:start` funciona
 *   sem configuração.
 *
 * Por que os defaults existem e não são secretos
 * A URL padrão é a do Supabase local e a chave é um JWT de mentira, com
 * assinatura inválida de propósito. Ela só serve para o código ter o que
 * ler durante o build. Qualquer chamada autenticada contra ela é rejeitada
 * pelo servidor — que é exatamente o comportamento desejado.
 *
 * Cuidado com o prefixo NEXT_PUBLIC_: o Next substitui a referência por uma
 * string literal no bundle. Ler `process.env` inteiro em código de cliente
 * vazaria todas as variáveis.
 */

/** JWT inválido de propósito: existe só para o build ter o que ler. */
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsLWRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.local-development-placeholder-signature';

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_ANON_KEY,
  },
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: process.env.NEXT_PUBLIC_LOCALE ?? 'pt-BR',
  previewToken: process.env.SUPABASE_PREVIEW_TOKEN ?? '',
  previewPassword: process.env.SUPABASE_PREVIEW_PASSWORD ?? '',
  previewEmail: process.env.SUPABASE_PREVIEW_EMAIL ?? '',
  previewUserId: process.env.SUPABASE_PREVIEW_USER_ID ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

/**
 * `true` quando as variáveis reais existem. Serve para decidir entre renderizar
 * a UI autenticada e um aviso de "Supabase não configurado" — em vez de
 * deixar o usuário bater num erro de rede.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
