/**
 * @fileoverview app/admin-dashboard/(protegido)/page.tsx — dashboard administrativo de alta fidelidade
 * @module app/admin-dashboard/(protegido)/page
 * @description Painel operacional profissional da Phase 3 (Spec 0033 Accepted):
 *   1. Saudação personalizada com papel administrativo e indicador de status AAL2;
 *   2. Cartões de métricas no topo com contadores reais e mini sparklines SVG nativos;
 *   3. Gráfico de publicações ao longo do tempo (7, 14 e 30 dias);
 *   4. Mesa de artigos recentes com miniaturas e badges semânticos de status;
 *   5. Painel lateral com acessos rápidos e timeline de atividade real (admin_audit_log);
 *   6. Seções especializadas de saúde, ofertas e rotinas com âncoras operacionais.
 * @dependencies react, @/lib/env, @/lib/services/health-dashboard, @/lib/services/editorial-dashboard,
 *   @/lib/services/commercial-dashboard, @/lib/services/dashboard-summary, @/components/admin/dashboard/*
 */

import { checkAdminUser } from '@/lib/admin/auth';
import { forbidden, redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { getDashboardHealthData } from '@/lib/services/health-dashboard';
import { getEditorialDashboardData } from '@/lib/services/editorial-dashboard';
import { getCommercialDashboardData } from '@/lib/services/commercial-dashboard';
import {
  getDashboardMetricSummary,
  getDashboardPublicationHistory,
  getDashboardRecentActivity,
} from '@/lib/services/dashboard-summary';
import { MetricCards } from '@/components/admin/dashboard/metric-cards';
import { PublicationChart } from '@/components/admin/dashboard/publication-chart';
import { RecentArticles } from '@/components/admin/dashboard/recent-articles';
import { QuickActions } from '@/components/admin/dashboard/quick-actions';
import { RecentActivity } from '@/components/admin/dashboard/recent-activity';
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
  // Layouts e páginas podem executar em paralelo. Autoriza antes de qualquer consulta.
  const auth = await checkAdminUser();
  if (auth instanceof Response)
    throw new Error('Admissão administrativa indisponível.');
  if (!auth.ok) {
    if (auth.reason === 'unauthenticated') redirect('/admin-dashboard/login');
    if (auth.reason === 'unauthorized') forbidden();
    if (auth.reason === 'mfa_enrollment_required')
      redirect('/admin-dashboard/mfa/setup');
    if (auth.reason === 'mfa_challenge_required')
      redirect('/admin-dashboard/mfa/verify');
    throw new Error('Autorização administrativa indisponível.');
  }
  const params = await searchParams;
  const pageEditorial = Math.max(
    1,
    parseInt(params.pageEditorial || '1', 10) || 1,
  );
  const pageOffers = Math.max(1, parseInt(params.pageOffers || '1', 10) || 1);

  // Execução concorrente das consultas no servidor
  const [
    healthData,
    editorialData,
    commercialData,
    metricSummary,
    recentActivity,
  ] = await Promise.all([
    getDashboardHealthData(),
    getEditorialDashboardData({ page: pageEditorial, pageSize: 6 }),
    getCommercialDashboardData({ page: pageOffers, pageSize: 6 }),
    getDashboardMetricSummary(),
    getDashboardRecentActivity(),
  ]);

  const publicationHistory = getDashboardPublicationHistory();

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Saudação do Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              Olá,{' '}
              {auth.role === 'admin'
                ? 'Administrador'
                : auth.role === 'editor'
                  ? 'Editor'
                  : 'Revisor'}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Nível AAL2 Ativo
            </span>
          </div>
          <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            Aqui está um resumo da operação do seu portal editorial.
          </p>
        </div>
      </div>

      {/* 2. Quatro Cartões de Métricas no Topo */}
      <MetricCards metrics={metricSummary} />

      {/* 3. Grade Principal em Duas Colunas (Mockup de Alta Fidelidade) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna da Esquerda (~65% / lg:col-span-8) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Gráfico de Publicações ao Longo do Tempo */}
          <PublicationChart initialData={publicationHistory} />

          {/* Mesa de Artigos Recentes */}
          <RecentArticles
            articles={editorialData.posts}
            sanityStudioUrl={env.sanityStudioUrl}
          />
        </div>

        {/* Coluna da Direita (~35% / lg:col-span-4) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Acessos Rápidos */}
          <QuickActions sanityStudioUrl={env.sanityStudioUrl} />

          {/* Timeline de Atividade Recente (admin_audit_log real) */}
          <RecentActivity activities={recentActivity} />
        </div>
      </div>

      {/* 4. Seções Operacionais Especializadas */}
      <div className="pt-8 border-t border-gray-200/80 dark:border-gray-800/80 space-y-10">
        {/* Seção de Saúde dos Serviços */}
        <section id="secao-saude" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Saúde da Infraestrutura
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sondagens em tempo real das conexões com Sanity CMS, PostgreSQL
                e Supabase Auth.
              </p>
            </div>
          </div>
          <HealthCards initialHealth={healthData} />
        </section>

        {/* Seção Editorial Paginada */}
        <section id="secao-editorial" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Gestão Editorial Paginada
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerenciamento operacional de publicações, rascunhos e paginação.
              </p>
            </div>
          </div>
          <EditorialTable
            data={editorialData}
            currentPage={pageEditorial}
            offersPage={pageOffers}
          />
        </section>

        {/* Seção de Ofertas Comerciais e Outliers */}
        <section id="secao-ofertas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Módulo Comercial e Auditoria de Preços
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Detecção de outliers, histórico WORM e elegibilidade ao selo de
                verificação.
              </p>
            </div>
          </div>
          <OffersTable
            data={commercialData}
            currentPage={pageOffers}
            editorialPage={pageEditorial}
          />
        </section>

        {/* Central de Rotinas (Action Hub) */}
        <section id="secao-acoes" className="space-y-4">
          <ActionHub sanityStudioUrl={env.sanityStudioUrl} />
        </section>
      </div>

      {/* 5. Rodapé Institucional do Painel */}
      <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-6 text-[11px] text-gray-400 sm:flex-row dark:border-gray-800/80 dark:text-gray-500">
        <div>GradualInfo • Painel Administrativo</div>
        <div className="flex items-center gap-4">
          <span>Tecnologia</span>
          <span>•</span>
          <span>Consumo Digital</span>
          <span>•</span>
          <span>Conteúdo de Qualidade</span>
        </div>
      </footer>
    </div>
  );
}
