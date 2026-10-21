/**
 * lib/site-config.ts
 * @fileoverview Centraliza URL pública, identidade da marca e verificação do Google.
 * @module lib/site-config
 * @description Normaliza a URL pública do site e centraliza os valores
 *   institucionais e a verificação do Google nos metadados e nos dados
 *   estruturados. Toda URL absoluta sai daqui: concatenar env solto espalha o
 *   default errado por arquivo.
 * @dependencies @/lib/env.
 */
import { env } from '@/lib/env';

// Tira as barras do fim para não duplicar "/" ao concatenar caminhos.
const normalizeOrigin = (url: string) => url.replace(/\/+$/, '');

// Origem canônica, sem barra final: base de toda URL absoluta do site.
export const SITE_ORIGIN = normalizeOrigin(env.siteUrl);

// Alguns metadados usam a raiz com barra final explícita.
export const SITE_URL = `${SITE_ORIGIN}/`;

// Grafia canônica da marca: título, Open Graph e dados estruturados leem daqui.
export const SITE_NAME = 'Gradualinfo';

// Descrição institucional única: layout e Organization não divergem de texto.
export const SITE_DESCRIPTION =
  'Guias de tecnologia para estudantes de programação tomarem decisões sobre equipamentos e ferramentas.';

// Logo absoluto para os dados estruturados; o arquivo é servido como /icon.png.
export const SITE_LOGO = `${SITE_ORIGIN}/icon.png`;

// Idioma do conteúdo (BCP 47) para `inLanguage`; o Open Graph usa `pt_BR`.
export const SITE_LANGUAGE = 'pt-BR';

// Público na frente; no servidor também aceita a variável sem prefixo.
export const GOOGLE_SITE_VERIFICATION = env.googleSiteVerification || undefined;
