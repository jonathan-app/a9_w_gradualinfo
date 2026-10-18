/**
 * @fileoverview app/admin-dashboard/(protegido)/page.tsx — dashboard administrativo operacional em AAL2
 * @module app/admin-dashboard/(protegido)/page
 * @description Painel operacional interativo da Phase 3 (Spec 0020 Accepted).
 *   Executa consultas no servidor sob proteção direta do guard de sessão AAL2:
 *   1. Sondagens reais de saúde das integrações (PostgreSQL, Supabase Auth e Sanity CMS);
 *   2. Mesa editorial com artigos e rascunhos paginados;
 *   3. Monitoramento comercial de ofertas, medianas históricas e detecção de outliers (Spec 0017);
 *   4. Central de rotinas operacionais (Action Hub) com atalho seguro ao Studio e emissão de preview.
 * @dependencies react, @/lib/env, @/lib/services/health-dashboard, @/lib/services/editorial-dashboard,
 *   @/lib/services/commercial-dashboard, @/components/admin/dashboard/*
 */

import { env } from '@/lib/env';
import { getDashboardHealthData } from '@/lib/services/health-dashboard';
import { getEditorialDashboardData } from '@/lib/services/editorial-dashboard';
import { getCommercialDashboardData } from '@/lib/services/commercial-dashboard';
import { HealthCards } from '@/components/admin/dashboard/health-cards';
import { EditorialTable } from '@/components/admin/dashboard/editorial-table';
import { OffersTable } from '@/components/admin/dashboard/offers-table';
import { ActionHub } from '@/components/admin/dashboard/action-hub';

interface PageProps {
  searchParams: Promise<{
    pageEditorial?: string;
    pageOffers?: string;
  }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageEditorial = Math.max(
    1,
    parseInt(params.pageEditorial || '1', 10) || 1,
  );
  const pageOffers = Math.max(1, parseInt(params.pageOffers || '1', 10) || 1);

  // Execução concorrente das consultas no servidor
  const [healthData, editorialData, commercialData] = await Promise.all([
    getDashboardHealthData(),
    getEditorialDashboardData({ page: pageEditorial, pageSize: 6 }),
    getCommercialDashboardData({ page: pageOffers, pageSize: 6 }),
  ]);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da página */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
              Painel Operacional do Gradualinfo
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Nível AAL2 Ativo
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            Monitoramento de infraestrutura, gestão de publicações editoriais e
            auditoria comercial de ofertas.
          </p>
        </div>
      </div>

      {/* 1. Indicadores de Saúde Operacional */}
      <HealthCards initialHealth={healthData} />

      {/* 2. Mesa Editorial de Artigos e Rascunhos */}
      <EditorialTable
        data={editorialData}
        currentPage={pageEditorial}
        offersPage={pageOffers}
      />

      {/* 3. Monitoramento de Ofertas Comerciais e Outliers */}
      <OffersTable
        data={commercialData}
        currentPage={pageOffers}
        editorialPage={pageEditorial}
      />

      {/* 4. Central de Rotinas (Action Hub) */}
      <ActionHub sanityStudioUrl={env.sanityStudioUrl} />
    </div>
  );
}
