'use client';

/**
 * @fileoverview components/admin/dashboard/health-cards.tsx — grade de indicadores de saúde operacional
 * @module components/admin/dashboard/health-cards
 * @description Exibe o estado em tempo real de PostgreSQL, Supabase Auth e Sanity CMS com carimbos UTC,
 *   latências e status semafóricos acessíveis. Permite atualizar diagnósticos sob demanda sem modal.
 * @dependencies react, @/lib/services/health-dashboard
 */

import { useState } from 'react';
import type {
  DashboardHealthData,
  HealthStatus,
} from '@/lib/services/health-dashboard';

interface HealthCardsProps {
  initialHealth: DashboardHealthData;
}

export function HealthCards({ initialHealth }: HealthCardsProps) {
  const [health, setHealth] = useState<DashboardHealthData>(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/admin/dashboard/rotinas/refresh-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error('Falha ao atualizar diagnósticos.');
      }
      const data = await res.json();
      if (data.ok && data.health) {
        setHealth(data.health);
      }
    } catch {
      setRefreshError('Não foi possível atualizar as sondagens no momento.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operacional
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Degradado
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Indisponível
          </span>
        );
      case 'unconfigured':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Não configurado
          </span>
        );
    }
  };

  const formatUtcTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour12: false }) +
        ' UTC'
      );
    } catch {
      return isoString;
    }
  };

  return (
    <section aria-labelledby="health-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="health-heading"
            className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            Saúde Operacional das Dependências
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sondagens reais de conectividade e disponibilidade dos serviços
            essenciais.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <svg
            className={`h-3.5 w-3.5 text-gray-500 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{isRefreshing ? 'Sondando...' : 'Atualizar diagnósticos'}</span>
        </button>
      </div>

      {refreshError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {refreshError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* PostgreSQL */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Banco PostgreSQL
            </span>
            {getStatusBadge(health.postgres.status)}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {health.postgres.latencyMs !== undefined ? (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {health.postgres.latencyMs} ms
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                {health.postgres.message || 'Sem resposta'}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Última verificação: {formatUtcTime(health.postgres.checkedAt)}
          </p>
        </div>

        {/* Supabase Auth */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Supabase Auth
            </span>
            {getStatusBadge(health.auth.status)}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {health.auth.latencyMs !== undefined ? (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {health.auth.latencyMs} ms
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                {health.auth.message || 'Sem resposta'}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Última verificação: {formatUtcTime(health.auth.checkedAt)}
          </p>
        </div>

        {/* Sanity CMS */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Sanity Content Lake
            </span>
            {getStatusBadge(health.sanity.status)}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {health.sanity.latencyMs !== undefined ? (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {health.sanity.latencyMs} ms
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-500">
                {health.sanity.message || 'Desconectado'}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Última verificação: {formatUtcTime(health.sanity.checkedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}
