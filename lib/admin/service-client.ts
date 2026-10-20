/**
 * @fileoverview lib/admin/service-client.ts — cliente privilegiado para rotinas administrativas
 * @module lib/admin/service-client
 * @description Fornece cliente Supabase com chave service_role exclusivamente no servidor (server-only)
 *   para operacoes de auditoria e gestao de papeis (Spec 0032).
 *   Desativa sumariamente persistencia de sessao, refresh de token e manipulacao de cookies.
 * @dependencies server-only, @supabase/supabase-js, @/lib/env
 */
import 'server-only';

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { env } from '@/lib/env';

export class AdminServiceClientConfigError extends Error {
  constructor(
    message = 'Chave SUPABASE_SERVICE_ROLE_KEY ausente ou nao configurada no servidor.',
  ) {
    super(message);
    this.name = 'AdminServiceClientConfigError';
  }
}

/**
 * Cria ou obtem o cliente Supabase isolado com permissao de servico (service_role).
 *
 * @throws {AdminServiceClientConfigError} Se a chave de servico nao estiver configurada no ambiente.
 * @returns Instancia pura do SupabaseClient configurada sem sessao nem cookies.
 */
export function getAdminServiceClient(): SupabaseClient {
  const serviceKey = env.supabase.serviceRoleKey?.trim();
  if (!serviceKey) {
    throw new AdminServiceClientConfigError();
  }

  return createSupabaseClient(env.supabase.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
