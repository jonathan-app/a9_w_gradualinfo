/**
 * @fileoverview Validação da URL de capa editorial antes de chegar ao HTML.
 * @module lib/editorial-images
 * @description `coverImageUrl` aceita capas locais, URLs da origem do site,
 *   do bucket público do Supabase ou do dataset Sanity configurado, e cai na capa padrão
 *   quando nada passa. O valor vem do banco e vai para `<img src>`: sem esse filtro, um
 *   campo adulterado (ou link colado errado) viraria request para origem arbitrária.
 * @dependencies @/lib/env (siteUrl, supabase.url, editorialImageBucket, isProduction).
 *
 * Quando executado: na renderização de listas e páginas de artigo.
 * Lê: variáveis de ambiente via `env`. Escreve: nada; função pura de string.
 */
import { env } from '@/lib/env';
/**
 * Valida a capa sem impor uma imagem padrão à apresentação.
 *
 * @param value - Valor bruto do campo de capa (URL absoluta, caminho relativo
 *   ou algo inválido).
 * @returns Caminho local aprovado ou URL da origem, do bucket público ou do Sanity
 *   em https (http só fora de produção, por causa do Supabase local);
 *   nos demais casos, null para o fallback visual neutro.
 */
export function approvedCoverImageUrl(value: string): string | null {
  const site = new URL(env.siteUrl);
  // O catálogo local e os documentos antigos do Sanity usam caminhos do próprio site.
  // A forma estrita evita que uma URL protocol-relative ou um path arbitrário vire imagem.
  if (
    /^\/artigos\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpe?g|png|webp)$/i.test(value)
  ) {
    return value;
  }
  try {
    const source = new URL(value);
    const storage = new URL(env.supabase.url);
    const publicPath = `/storage/v1/object/public/${encodeURIComponent(env.editorialImageBucket)}/`;
    const sanityPath = env.sanity?.projectId
      ? `/images/${encodeURIComponent(env.sanity.projectId)}/${encodeURIComponent(env.sanity.dataset)}/`
      : null;
    // Allowlist de origem e caminho público configurado; https sempre, http só fora de produção (o
    // Supabase local não tem TLS). Fora dos dois, cai no return do fim.
    if (
      (source.origin === site.origin ||
        (env.editorialImageBucket &&
          source.origin === storage.origin &&
          source.pathname.startsWith(publicPath)) ||
        (sanityPath &&
          source.origin === 'https://cdn.sanity.io' &&
          source.pathname.startsWith(sanityPath))) &&
      (source.protocol === 'https:' ||
        (!env.isProduction && source.protocol === 'http:'))
    ) {
      // new URL(...) preserves encoded pathname; static files in public/ use decoded paths.
      // Build the full URL manually to keep decoded pathname.
      const decodedPathname = decodeURIComponent(source.pathname);
      return `${source.origin}${decodedPathname}${source.search}${source.hash}`;
    }
  } catch {
    /* Capa inválida não vira request para origem arbitrária. */
  }
  return null;
}

/**
 * Preserva a capa padrão usada nos metadados sem impor esse fallback à interface.
 * @param value - URL editorial bruta.
 * @returns URL aprovada ou capa padrão para SEO.
 */
export function coverImageUrl(value: string): string {
  const approved = approvedCoverImageUrl(value);
  return new URL(approved ?? '/editorial-cover.svg', env.siteUrl).href;
}
