/**
 * lib/site-config.ts
 *
 * Normaliza a URL pública do site e centraliza a verificação do Google nos
 * metadados. Toda URL absoluta sai daqui: concatenar env solto espalha o
 * default errado por arquivo.
 */

// Tira as barras do fim para não duplicar "/" ao concatenar caminhos.
const normalizeOrigin = (url: string) => url.replace(/\/+$/, '');

export const SITE_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
);

// Alguns metadados usam a raiz com barra final explícita.
export const SITE_URL = `${SITE_ORIGIN}/`;

// Público na frente; no servidor também aceita a variável sem prefixo.
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.GOOGLE_SITE_VERIFICATION ||
  undefined;
