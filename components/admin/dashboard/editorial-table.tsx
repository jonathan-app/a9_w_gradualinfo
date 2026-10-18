/**
 * @fileoverview components/admin/dashboard/editorial-table.tsx — tabela de artigos e rascunhos da mesa editorial
 * @module components/admin/dashboard/editorial-table
 * @description Tabela paginada listando publicações e rascunhos com disparo de preview seguro por slug.
 *   Fornece estados explícitos de vazio, erro e fonte não configurada com conformidade visual ao DESIGN.md.
 * @dependencies react, next/link, @/lib/services/editorial-dashboard, @/lib/utils/format,
 *   @/components/admin/dashboard/table-icon
 */

import Link from 'next/link';
import type { EditorialDashboardData } from '@/lib/services/editorial-dashboard';
import { formatDate } from '@/lib/utils/format';
import { TableIcon } from '@/components/admin/dashboard/table-icon';

interface EditorialTableProps {
  data: EditorialDashboardData;
  currentPage: number;
  offersPage?: number;
}

export function EditorialTable({
  data,
  currentPage,
  offersPage = 1,
}: EditorialTableProps) {
  const totalPages = Math.max(1, Math.ceil(data.totalPosts / data.pageSize));

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('pageEditorial', targetPage.toString());
    if (offersPage > 1) {
      params.set('pageOffers', offersPage.toString());
    }
    return `/admin-dashboard?${params.toString()}`;
  };

  return (
    <section aria-labelledby="editorial-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <TableIcon className="h-4 w-4" />
            </span>
            <h2
              id="editorial-heading"
              className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              Mesa Editorial de Artigos e Rascunhos
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data.source === 'sanity'
              ? 'Publicações e rascunhos sincronizados com o Sanity Content Lake.'
              : data.source === 'local'
                ? 'Catálogo restrito ao ambiente editorial local.'
                : 'Inspeção e emissão de prévia autenticada.'}
          </p>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Total:{' '}
          <strong className="text-gray-900 dark:text-white">
            {data.totalPosts}
          </strong>{' '}
          {data.totalPosts === 1 ? 'artigo' : 'artigos'}
        </span>
      </div>

      {/* Estado de erro */}
      {data.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {data.errorMessage || 'Falha ao consultar mesa editorial.'}
        </div>
      )}

      {/* Estado não configurado */}
      {data.status === 'unconfigured' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400">
          Sanity CMS não está configurado para leitura remota no ambiente atual.
        </div>
      )}

      {/* Estado de lista vazia */}
      {data.status === 'empty' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          Nenhum artigo publicado ou rascunho encontrado.
        </div>
      )}

      {/* Tabela com dados */}
      {data.status === 'configured' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Título
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Slug
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Editoria
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Atualização
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {post.title}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      /{post.slug}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {post.editoria}
                    </td>
                    <td className="px-4 py-3">
                      {post.status === 'publicado' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Publicado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Rascunho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(post.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form
                        action="/api/admin/preview"
                        method="POST"
                        className="inline-block">
                        <input type="hidden" name="slug" value={post.slug} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                          <span>Prévia</span>
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Página{' '}
                <strong className="text-gray-900 dark:text-white">
                  {currentPage}
                </strong>{' '}
                de{' '}
                <strong className="text-gray-900 dark:text-white">
                  {totalPages}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    Anterior
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-600">
                    Anterior
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    Próxima
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-600">
                    Próxima
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
