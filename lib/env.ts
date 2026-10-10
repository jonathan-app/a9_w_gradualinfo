/**
 * lib/env.ts — leitura única e tipada das variáveis de ambiente
 * @fileoverview Leitura tipada de variáveis de ambiente com default local.
 * @module lib/env
 * @description Centraliza configuração pública e leitura explícita de Access no Worker.
 * @dependencies Env original do Worker e variáveis Node para configurações existentes.
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

/**
 * Leitura tipada de todas as variáveis do app. Cada entrada usa `??` — falta
 * de `.env` nunca lança, cai no default documentado no cabeçalho. `as const`
 * mantém os defaults estreitos para o type checker e impede reatribuição.
 */
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_ANON_KEY,
  },
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // Leitura no servidor ainda aceita a variável sem o prefixo NEXT_PUBLIC_;
  // a pública é a fonte preferida porque é a única que existe no bundle do browser.
  googleSiteVerification:
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ??
    process.env.GOOGLE_SITE_VERIFICATION ??
    '',
  locale: process.env.NEXT_PUBLIC_LOCALE ?? 'pt-BR',
  previewToken: process.env.SUPABASE_PREVIEW_TOKEN ?? '',
  previewPassword: process.env.SUPABASE_PREVIEW_PASSWORD ?? '',
  editorialImageBucket: process.env.SUPABASE_EDITORIAL_IMAGE_BUCKET ?? '',
  previewEmail: process.env.SUPABASE_PREVIEW_EMAIL ?? '',
  previewUserId: process.env.SUPABASE_PREVIEW_USER_ID ?? '',
  // Contrato de preview spec 0006 (segredo e chave de assinatura HMAC-SHA256)
  previewSecret:
    process.env.PREVIEW_SECRET ?? process.env.SUPABASE_PREVIEW_TOKEN ?? '',
  previewSigningKey:
    process.env.PREVIEW_SIGNING_KEY ??
    process.env.PREVIEW_SECRET ??
    'local-development-preview-signing-key-placeholder',
  // Configurações do Sanity (armazenamento editorial único na entrega online)
  sanity: {
    projectId:
      process.env.SANITY_PROJECT_ID ??
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
      '',
    dataset:
      process.env.SANITY_DATASET ??
      process.env.NEXT_PUBLIC_SANITY_DATASET ??
      'production',
    apiVersion: process.env.SANITY_API_VERSION ?? '2024-01-01',
    readToken: process.env.SANITY_API_READ_TOKEN ?? '',
  },
  // ID de produção embutido: um build de produção sem a variável definida
  // continua medindo, em vez de enviar string vazia e perder o evento.
  gaMeasurementId:
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
    (process.env.NODE_ENV === 'production' ? 'G-7JVZ7JS4MX' : ''),
  // Mesmo racional de gaMeasurementId acima: contêiner GTM de produção como fallback.
  gtmId:
    process.env.NEXT_PUBLIC_GTM_ID ??
    (process.env.NODE_ENV === 'production' ? 'GTM-TQVMR8TN' : ''),
  // Administração e Controle de Acesso (spec 0007)
  adminUserId: process.env.ADMIN_USER_ID ?? '',
  adminEmail: process.env.ADMIN_EMAIL ?? 'a3qua96@gmail.com',
  sanityStudioUrl:
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ??
    'https://gradualinfo.sanity.studio',
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

/**
 * `true` quando o Sanity está configurado para leitura editorial.
 */
export const isSanityConfigured = Boolean(
  (process.env.SANITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) &&
  (process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET),
);

/** Configuração Access recebida diretamente do Worker, sem snapshot global. */
export interface AdminAccessConfig {
  issuer: string;
  audience: string;
  ownerEmail: string;
  hosts: readonly string[];
}

/**
 * Lê configuração server only antes da inicialização do OpenNext.
 * @param bindings - Env original ou contexto request scoped do Worker.
 * @returns Configuração válida, ou null para falhar fechado.
 */
export function readAdminAccessConfig(
  bindings: Record<string, unknown>,
): AdminAccessConfig | null {
  const issuer = bindings.ADMIN_ACCESS_ISSUER;
  const audience = bindings.ADMIN_ACCESS_AUD;
  const ownerEmail = bindings.ADMIN_ACCESS_OWNER_EMAIL;
  const hostsValue = bindings.ADMIN_ACCESS_HOSTS;
  if (
    [issuer, audience, ownerEmail, hostsValue].some(
      (value) => typeof value !== 'string' || !value || value !== value.trim(),
    )
  )
    return null;
  try {
    const url = new URL(issuer as string);
    if (
      url.protocol !== 'https:' ||
      !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(url.hostname) ||
      url.origin !== issuer ||
      url.username ||
      url.password
    )
      return null;
    if (!/^[^\s@]+@[^\s@]+$/.test(ownerEmail as string)) return null;
    const hosts = (hostsValue as string)
      .split(',')
      .map((value) => value.trim());
    if (
      !hosts.length ||
      hosts.some(
        (host) =>
          !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ||
          host.includes('..'),
      )
    )
      return null;
    return Object.freeze({
      issuer: issuer as string,
      audience: audience as string,
      ownerEmail: ownerEmail as string,
      hosts: Object.freeze(hosts),
    });
  } catch {
    return null;
  }
}
