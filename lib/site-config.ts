/**
 * lib/site-config.ts
 *
 * Normaliza a URL pública do site e centraliza a verificação do Google nos
 * metadados. Toda URL absoluta sai daqui: concatenar env solto espalha o
 * default errado por arquivo.
 */

import { env } from '@/lib/env';

// Tira as barras do fim para não duplicar "/" ao concatenar caminhos.
const normalizeOrigin = (url: string) => url.replace(/\/+$/, '');

// Origem canônica, sem barra final: base de toda URL absoluta do site.
export const SITE_ORIGIN = normalizeOrigin(env.siteUrl);

// Alguns metadados usam a raiz com barra final explícita.
export const SITE_URL = `${SITE_ORIGIN}/`;

// Público na frente; no servidor também aceita a variável sem prefixo.
export const GOOGLE_SITE_VERIFICATION = env.googleSiteVerification || undefined;
