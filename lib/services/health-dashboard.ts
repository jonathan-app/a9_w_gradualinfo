/**
 * @fileoverview lib/services/health-dashboard.ts — sondagens reais de integridade operacional
 * @module lib/services/health-dashboard
 * @description Executa no servidor diagnósticos reais de PostgreSQL, Supabase Auth e Sanity CMS.
 *   Distingue rigorosamente sessão ausente de indisponibilidade de rede/5xx no Auth, e mede latência real.
 * @dependencies server-only, @/lib/env, @/lib/supabase/server, @/lib/sanity/client
 */
import 'server-only';

import { isSanityConfigured } from '@/lib/env';
import { createClient, createPublicClient } from '@/lib/supabase/server';
import { probeSanityAvailability } from '@/lib/sanity/client';

export type HealthStatus =
  'healthy' | 'degraded' | 'unavailable' | 'unconfigured';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface DashboardHealthData {
  postgres: ComponentHealth;
  auth: ComponentHealth;
  sanity: ComponentHealth;
  checkedAt: string;
}

/**
 * Executa as três sondagens reais de integridade operacional.
 */
export async function getDashboardHealthData(): Promise<DashboardHealthData> {
  const now = new Date().toISOString();

  // 1. Sondagem PostgreSQL
  let postgresHealth: ComponentHealth;
  try {
    const start = Date.now();
    const supabase = createPublicClient();
    const { error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });
    const latency = Date.now() - start;

    if (error && error.code !== 'PGRST116') {
      postgresHealth = {
        name: 'PostgreSQL Database',
        status: 'unavailable',
        latencyMs: latency,
        message: 'Falha de comunicação com o banco de dados.',
        checkedAt: now,
      };
    } else {
      postgresHealth = {
        name: 'PostgreSQL Database',
        status: latency > 1500 ? 'degraded' : 'healthy',
        latencyMs: latency,
        checkedAt: now,
      };
    }
  } catch {
    postgresHealth = {
      name: 'PostgreSQL Database',
      status: 'unavailable',
      message: 'Conexão recusada ou timeout.',
      checkedAt: now,
    };
  }

  // 2. Sondagem Supabase Auth
  let authHealth: ComponentHealth;
  try {
    const start = Date.now();
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();
    const latency = Date.now() - start;

    if (error) {
      // Distinção categórica:
      // Se status for 5xx, erro de rede/fetch ou timeout -> serviço indisponível
      const isNetworkOr5xx =
        error.status && error.status >= 500
          ? true
          : error.name === 'AuthRetryableFetchError' ||
            error.message?.toLowerCase().includes('fetch failed') ||
            error.message?.toLowerCase().includes('network');

      if (isNetworkOr5xx) {
        authHealth = {
          name: 'Supabase Auth',
          status: 'unavailable',
          latencyMs: latency,
          message:
            'Instabilidade ou indisponibilidade no serviço de autenticação.',
          checkedAt: now,
        };
      } else {
        // Erro de sessão ausente ou token expirado (ex: AuthSessionMissingError) comprova
        // que o serviço GoTrue está operacional e respondendo requisições normalmente
        authHealth = {
          name: 'Supabase Auth',
          status: latency > 1500 ? 'degraded' : 'healthy',
          latencyMs: latency,
          checkedAt: now,
        };
      }
    } else {
      authHealth = {
        name: 'Supabase Auth',
        status: latency > 1500 ? 'degraded' : 'healthy',
        latencyMs: latency,
        checkedAt: now,
      };
    }
  } catch {
    authHealth = {
      name: 'Supabase Auth',
      status: 'unavailable',
      message: 'Falha crítica de conexão com o subsistema Auth.',
      checkedAt: now,
    };
  }

  // 3. Sondagem Sanity CMS
  let sanityHealth: ComponentHealth;
  if (!isSanityConfigured) {
    sanityHealth = {
      name: 'Sanity Content Lake',
      status: 'unconfigured',
      message: 'Variáveis de projeto Sanity não configuradas.',
      checkedAt: now,
    };
  } else {
    try {
      const start = Date.now();
      await probeSanityAvailability();
      const latency = Date.now() - start;

      sanityHealth = {
        name: 'Sanity Content Lake',
        status: latency > 600 ? 'degraded' : 'healthy',
        latencyMs: latency,
        checkedAt: now,
      };
    } catch {
      sanityHealth = {
        name: 'Sanity Content Lake',
        status: 'unavailable',
        message: 'Timeout (800ms) ou indisponibilidade no Sanity.',
        checkedAt: now,
      };
    }
  }

  return {
    postgres: postgresHealth,
    auth: authHealth,
    sanity: sanityHealth,
    checkedAt: now,
  };
}
