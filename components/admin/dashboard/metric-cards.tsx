/**
 * @fileoverview components/admin/dashboard/metric-cards.tsx — cartões de indicadores do topo do dashboard
 * @module components/admin/dashboard/metric-cards
 * @description Exibe os quatro cartões de métricas em grade responsiva com ícones semânticos,
 *   valores em destaque, variação percentual e mini sparkline em SVG nativo (Spec 0033 AC-03).
 * @dependencies react, @/lib/services/dashboard-summary
 */

import type { DashboardMetricSummary } from '@/lib/services/dashboard-summary';

interface MetricCardsProps {
  metrics: DashboardMetricSummary;
}

interface MetricCardItem {
  id: string;
  label: string;
  value: string;
  growth: string;
  color: 'blue' | 'green' | 'purple' | 'cyan';
  sparklinePoints: string;
  icon: React.ReactNode;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards: MetricCardItem[] = [
    {
      id: 'articles',
      label: 'Total de artigos',
      value: metrics.totalArticles.toLocaleString('pt-BR'),
      growth: `+${metrics.articlesGrowth}% vs. últimos 7 dias`,
      color: 'blue',
      sparklinePoints: '0,18 15,14 30,16 45,10 60,12 75,6 90,8 100,2',
      icon: (
        <svg
          className="h-6 w-6 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'views',
      label: 'Visualizações',
      value: metrics.totalViews.toLocaleString('pt-BR'),
      growth: `+${metrics.viewsGrowth}% vs. últimos 7 dias`,
      color: 'green',
      sparklinePoints: '0,16 15,12 30,15 45,8 60,11 75,4 90,6 100,1',
      icon: (
        <svg
          className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
    },
    {
      id: 'offers',
      label: 'Ofertas ativas',
      value: metrics.activeOffers.toLocaleString('pt-BR'),
      growth: `+${metrics.offersGrowth}% vs. últimos 7 dias`,
      color: 'purple',
      sparklinePoints: '0,17 15,15 30,12 45,14 60,8 75,10 90,4 100,3',
      icon: (
        <svg
          className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Usuários cadastrados',
      value: metrics.registeredUsers.toLocaleString('pt-BR'),
      growth: `+${metrics.usersGrowth}% vs. últimos 7 dias`,
      color: 'cyan',
      sparklinePoints: '0,18 15,13 30,14 45,9 60,11 75,5 90,7 100,2',
      icon: (
        <svg
          className="h-6 w-6 text-cyan-600 dark:text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  const colorStyles = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      stroke: '#2563EB',
      fill: 'rgba(37, 99, 235, 0.1)',
      growthColor: 'text-emerald-600 dark:text-emerald-400',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      stroke: '#059669',
      fill: 'rgba(5, 150, 105, 0.1)',
      growthColor: 'text-emerald-600 dark:text-emerald-400',
    },
    purple: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      stroke: '#4F46E5',
      fill: 'rgba(79, 70, 229, 0.1)',
      growthColor: 'text-emerald-600 dark:text-emerald-400',
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      stroke: '#0891B2',
      fill: 'rgba(8, 145, 178, 0.1)',
      growthColor: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const style = colorStyles[card.color];
        return (
          <div
            key={card.id}
            className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {card.value}
                </h3>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-800/60">
              <span className={`text-xs font-semibold ${style.growthColor}`}>
                {card.growth}
              </span>

              {/* Sparkline SVG Nativo */}
              <div className="h-6 w-24">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 100 20"
                  fill="none">
                  <polyline
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={card.sparklinePoints}
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
