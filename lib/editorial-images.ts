/**
 * @fileoverview Validação da URL de capa editorial antes de chegar ao HTML.
 * @module lib/editorial-images
 * @description `coverImageUrl` só devolve URL que passe por dois filtros — origem do site
 *   ou caminho público do bucket do Supabase, e protocolo aceito — e cai na capa padrão
 *   quando nada passa. O valor vem do banco e vai para `<img src>`: sem esse filtro, um
 *   campo adulterado (ou link colado errado) viraria request para origem arbitrária.
 * @dependencies @/lib/env (siteUrl, supabase.url, editorialImageBucket, isProduction).
 *
 * Quando executado: na renderização de listas e páginas de artigo.
 * Lê: variáveis de ambiente via `env`. Escreve: nada; função pura de string.
 */
import { env } from '@/lib/env';
/**
 * Resolve a capa de um post para uma URL segura de exibir.
 *
 * @param value - Valor bruto do campo de capa (URL absoluta, caminho relativo
 *   ou algo inválido).
 * @returns A URL original quando ela pertence ao site ou ao caminho público do
 *   bucket em https (http só fora de produção, por causa do Supabase local);
 *   nos demais casos, `/editorial-cover.svg` absoluta.
 */
export function coverImageUrl(value: string): string {
  const site = new URL(env.siteUrl);
  try {
    const source = new URL(value);
    const storage = new URL(env.supabase.url);
    const publicPath = `/storage/v1/object/public/${encodeURIComponent(env.editorialImageBucket)}/`;
    // Allowlist em duas camadas: origem do site OU caminho do bucket público
    // configurado; e protocolo — https sempre, http só fora de produção (o
    // Supabase local não tem TLS). Fora dos dois, cai no return do fim.
    if (
      (source.origin === site.origin ||
        (env.editorialImageBucket &&
          source.origin === storage.origin &&
          source.pathname.startsWith(publicPath))) &&
      (source.protocol === 'https:' ||
        (!env.isProduction && source.protocol === 'http:'))
    )
      return source.href;
  } catch {
    /* Capa inválida não vira request para origem arbitrária. */
  }
  return new URL('/editorial-cover.svg', site).href;
}
