/**
 * @fileoverview lib/offers/service-client.ts — cliente privilegiado para rotinas transacionais do pipeline de ofertas
 * @module lib/offers/service-client
 * @description Fornece cliente Supabase com chave service_role exclusivamente no servidor (server-only)
 *   para execução autorizada da RPC evaluate_and_set_verified_price da Spec 0021 (AC-01 e AC-07).
 *   Desativa sumariamente persistência de sessão, refresh de token e manipulação de cookies.
 * @dependencies server-only, @supabase/supabase-js, @/lib/env
 */
import 'server-only';

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { env } from '@/lib/env';

export class ServiceClientConfigError extends Error {
  constructor(
    message = 'Chave SUPABASE_SERVICE_ROLE_KEY ausente ou não configurada no servidor.',
  ) {
    super(message);
    this.name = 'ServiceClientConfigError';
  }
}

/**
 * Cria ou obtém o cliente Supabase isolado com permissão de serviço (service_role).
 *
 * @throws {ServiceClientConfigError} Se a chave de serviço não estiver configurada no ambiente.
 * @returns Instância pura do SupabaseClient configurada sem sessão nem cookies.
 */
export function getOffersServiceClient(): SupabaseClient {
  const serviceKey = env.supabase.serviceRoleKey?.trim();
  if (!serviceKey) {
    throw new ServiceClientConfigError();
  }

  return createSupabaseClient(env.supabase.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
