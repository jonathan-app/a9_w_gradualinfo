/**
 * @fileoverview Habilitação e cookie do modo de preview editorial.
 * @module lib/preview/config
 * @description Reúne a barreira de configuração (`isPreviewConfigured`) e as opções do
 *   cookie de sessão de preview. Middleware e rotas compartilham as opções de propósito:
 *   cookie dessincronizado entre quem escreve e quem lê vira sessão que some no meio do
 *   uso.
 * @dependencies @/lib/env (variáveis SUPABASE_PREVIEW_*), ./session (UUID_PATTERN).
 *
 * Quando executado: a cada requisição que considera preview (middleware/rotas).
 * Lê: variáveis de ambiente. Escreve: nada.
 */
import { env } from '@/lib/env';
import { UUID_PATTERN } from './session';

/**
 * Confere se o preview está configurado com qualidade mínima.
 *
 * Exige token de pelo menos 32 bytes, senha e e-mail preenchidos, `sub` em
 * formato UUID e token diferente da senha — senão o "segredo" do preview seria
 * a própria senha, previsível. Falha fechada: qualquer requisito ausente
 * devolve `false`.
 *
 * @returns `true` quando dá para operar o preview com segurança.
 */
export function isPreviewConfigured(): boolean {
  return (
    Buffer.byteLength(env.previewToken) >= 32 &&
    Boolean(env.previewPassword && env.previewEmail) &&
    UUID_PATTERN.test(env.previewUserId) &&
    env.previewToken !== env.previewPassword
  );
}

/**
 * Opções do cookie de preview, aplicadas por cima das opções do Supabase no
 * middleware: `httpOnly` esconde o token do JS, `sameSite: 'lax'` segura em
 * cross-site (exceto navegação por link GET) e `secure` só em produção porque
 * localhost não tem TLS.
 */
export const previewCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/',
};
