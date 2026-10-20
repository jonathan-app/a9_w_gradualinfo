/**
 * @fileoverview components/admin/dashboard/recent-articles.tsx — mesa de artigos recentes com miniaturas e badges
 * @module components/admin/dashboard/recent-articles
 * @description Apresenta a lista refinada dos últimos conteúdos editoriais com miniaturas de capa,
 *   tipografia cuidada, status semânticos e link de navegação rápida (Spec 0033 AC-05).
 * @dependencies react, next/link, @/lib/services/editorial-dashboard
 */

import Link from 'next/link';
import type { EditorialDashboardItem } from '@/lib/services/editorial-dashboard';

interface RecentArticlesProps {
  articles: EditorialDashboardItem[];
  sanityStudioUrl?: string;
}

export function RecentArticles({
  articles,
  sanityStudioUrl,
}: RecentArticlesProps) {
  // Limita a exibição aos 5 primeiros artigos recentes
  const recentList = articles.slice(0, 5);

  const statusStyles = {
    publicado:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40',
    rascunho:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40',
    arquivado:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  };

  const statusLabels = {
    publicado: 'Publicado',
    rascunho: 'Rascunho',
    arquivado: 'Arquivado',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-50 dark:border-gray-800/60">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Artigos Recentes
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Últimos conteúdos publicados ou em edição.
          </p>
        </div>

        {sanityStudioUrl ? (
          <a
            href={sanityStudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            <span>Ver todos</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        ) : (
          <Link
            href="/artigos"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            <span>Ver todos</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>

      {recentList.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Nenhum artigo encontrado
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Os artigos publicados ou em rascunho aparecerão aqui.
          </p>
        </div>
      ) : (
        /* Lista / Tabela de Artigos */
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <th className="py-3 pr-4">Título</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Atualizado em</th>
                <th className="py-3 pl-2 text-right">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {recentList.map((article) => {
                const statusKey = article.status || 'rascunho';
                const statusClass =
                  statusStyles[statusKey] || statusStyles.rascunho;
                const statusLabel = statusLabels[statusKey] || 'Rascunho';

                return (
                  <tr
                    key={article.id}
                    className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                    {/* Miniatura e Título */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        {/* Miniatura 36x36 arredondada com gradiente e ícone */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-[10px] shadow-sm">
                          {article.title
                            ? article.title.charAt(0).toUpperCase()
                            : 'A'}
                        </div>
                        <Link
                          href={`/artigos/${article.slug}`}
                          className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 line-clamp-1 max-w-[260px] sm:max-w-[340px]">
                          {article.title}
                        </Link>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 capitalize">
                      {article.editoria || 'Tecnologia'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>

                    {/* Data formatada */}
                    <td className="py-3.5 px-4 text-right text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                      {article.updatedAt
                        ? new Date(article.updatedAt).toLocaleDateString(
                            'pt-BR',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            },
                          )
                        : 'Recente'}
                    </td>

                    {/* Ação / Menu */}
                    <td className="py-3.5 pl-2 text-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <Link
                        href={`/artigos/${article.slug}`}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 inline-block"
                        title="Ver artigo">
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
