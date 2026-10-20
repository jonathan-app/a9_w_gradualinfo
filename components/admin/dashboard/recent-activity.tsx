/**
 * @fileoverview components/admin/dashboard/recent-activity.tsx — timeline de atividades recentes do painel
 * @module components/admin/dashboard/recent-activity
 * @description Apresenta os eventos operacionais reais do sistema a partir de admin_audit_log
 *   com ícones coloridos por categoria, descrição e horário relativo (Spec 0033 AC-07).
 * @dependencies react, @/lib/services/dashboard-summary
 */

import type { RecentActivityItem } from '@/lib/services/dashboard-summary';

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const typeStyles = {
    article: {
      bg: 'bg-emerald-500',
      icon: (
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    user: {
      bg: 'bg-blue-500',
      icon: (
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    offer: {
      bg: 'bg-amber-500',
      icon: (
        <svg
          className="h-4 w-4 text-white"
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
    security: {
      bg: 'bg-indigo-500',
      icon: (
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    system: {
      bg: 'bg-slate-600',
      icon: (
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Atividade Recente
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Últimas ações no painel administrativo.
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Nenhuma atividade recente
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            As ações administrativas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {activities.map((item) => {
            const style = typeStyles[item.type] || typeStyles.system;

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3.5 last:border-0 last:pb-0 dark:border-gray-800/60">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} shadow-sm`}>
                    {style.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {item.timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
