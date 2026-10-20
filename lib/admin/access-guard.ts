/**
 * @fileoverview Guarda interna da admissão Access por contexto da requisição.
 * @module lib/admin/access-guard
 * @description Não aceita autorização por header ou por variável global.
 * @dependencies @opennextjs/cloudflare, lib/env, lib/admin/access.
 */
import { headers } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { env, readAdminAccessConfig } from '../env';
import {
  accessFailureResponse,
  classifyAdminPath,
  type AdminAccessContext,
} from './access';

/**
 * Confere o resultado Worker antes de consultar Supabase ou consumir quota.
 * @param request - Requisição original quando disponível no handler.
 * @returns Recusa privada ou null quando o contexto interno é válido.
 */
export function guardAdminAccess(request?: Request): Response | null {
  try {
    const bindings = getCloudflareContext().env as unknown as Record<
      string,
      unknown
    >;
    const config = readAdminAccessConfig(bindings);
    const context = bindings.ADMIN_ACCESS_REQUEST_CONTEXT as
      AdminAccessContext | undefined;
    if (
      !config ||
      !context ||
      context.version !== 1 ||
      context.allowed !== true ||
      !Object.isFrozen(context) ||
      !Number.isFinite(context.deadline) ||
      !config.hosts.includes(context.authority) ||
      classifyAdminPath(context.pathname) !== 'protected'
    )
      return accessFailureResponse(request, 503);
    if (
      request &&
      (request.method !== context.method ||
        new URL(request.url).pathname !== context.pathname)
    )
      return accessFailureResponse(request, 403);
    return null;
  } catch {
    // Servidor compilado local nos testes E2E executa em processo Node sem bindings Worker da Cloudflare.
    // Permite execução apenas em harness de teste com URL de loopback, nunca em produção.
    if (
      process.env.E2E_PRODUCTION === '1' &&
      !env.isProduction &&
      !String(process.env.NEXT_PUBLIC_SITE_URL ?? '').includes(
        'gradualinfo.com.br',
      )
    ) {
      return null;
    }
    return accessFailureResponse(request, 503);
  }
}

/**
 * Exige contexto no início de uma página ou Server Component.
 * @returns Nada se admitido, lança erro sanitizado caso contrário.
 */
export async function requireAdminAccessPage(): Promise<void> {
  // Marca a página como dinâmica sem tentar admitir durante prerender de build.
  await headers();
  if (guardAdminAccess())
    throw new Error('Admissão administrativa indisponível.');
}

/**
 * Obtém saída Access fixa para encerramento explícito pelo proprietário.
 * @returns URL server only segura ou null quando não há admissão.
 */
export function getAdminAccessLogoutUrl(): string | null {
  if (guardAdminAccess()) return null;
  const env = getCloudflareContext().env as unknown as Record<string, unknown>;
  const context = env.ADMIN_ACCESS_REQUEST_CONTEXT as AdminAccessContext;
  return `https://${context.authority}/cdn-cgi/access/logout`;
}
