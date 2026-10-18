/**
 * @fileoverview components/admin/dashboard/offers-table.tsx — tabela de ofertas comerciais e histórico de preços
 * @module components/admin/dashboard/offers-table
 * @description Apresenta ofertas ativas com preço atual, mediana calculada e badge explicativo de outliers
 *   (Spec 0017 Regra 3). Trata mediana nula como histórico insuficiente e degrada para não configurado
 *   caso a chave de serviço esteja ausente, sem quebrar o restante do painel.
 * @dependencies react, next/link, @/lib/services/commercial-dashboard, @/lib/utils/format,
 *   @/components/admin/dashboard/table-icon
 */

import Link from 'next/link';
import type { CommercialDashboardData } from '@/lib/services/commercial-dashboard';
import { formatCurrency } from '@/lib/utils/format';
import { TableIcon } from '@/components/admin/dashboard/table-icon';

interface OffersTableProps {
  data: CommercialDashboardData;
  currentPage: number;
  editorialPage?: number;
}

export function OffersTable({
  data,
  currentPage,
  editorialPage = 1,
}: OffersTableProps) {
  const totalPages = Math.max(1, Math.ceil(data.totalOffers / data.pageSize));

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('pageOffers', targetPage.toString());
    if (editorialPage > 1) {
      params.set('pageEditorial', editorialPage.toString());
    }
    return `/admin-dashboard?${params.toString()}`;
  };

  const renderBadgeStatus = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Verificado
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Expirado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Recusado
          </span>
        );
      case 'unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Não verificado
          </span>
        );
    }
  };

  return (
    <section aria-labelledby="offers-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <TableIcon className="h-4 w-4" />
            </span>
            <h2
              id="offers-heading"
              className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              Monitoramento de Ofertas e Histórico de Preços
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Inspeção de ofertas ativas, medianas consolidadas e observações
            anômalas isoladas.
          </p>
        </div>

        {data.status === 'configured' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total:{' '}
            <strong className="text-gray-900 dark:text-white">
              {data.totalOffers}
            </strong>{' '}
            {data.totalOffers === 1 ? 'oferta' : 'ofertas'}
          </span>
        )}
      </div>

      {/* Estado não configurado */}
      {data.status === 'unconfigured' && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/75 p-6 text-center dark:border-gray-800 dark:bg-gray-900/40">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-xs font-semibold text-gray-900 dark:text-white">
            Módulo Comercial Não Configurado
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            A chave de serviço (
            <code className="font-mono text-[11px]">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            ) não está configurada no servidor. O restante do painel operacional
            permanece em funcionamento regular.
          </p>
        </div>
      )}

      {/* Estado de erro */}
      {data.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {data.errorMessage || 'Falha ao consultar módulo de ofertas.'}
        </div>
      )}

      {/* Estado de lista vazia */}
      {data.status === 'empty' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          Nenhuma oferta comercial ativa cadastrada no momento.
        </div>
      )}

      {/* Tabela de dados */}
      {data.status === 'configured' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Produto & Lojista
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Preço Vigente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Mediana Histórica (30d)
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Selo Verificado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Classificação Outliers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.offers.map((offer) => (
                  <tr
                    key={offer.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {offer.title}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {offer.merchantName} •{' '}
                        {offer.paymentMethod === 'a_vista'
                          ? 'À vista'
                          : 'Parcelado'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(offer.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {offer.median30dCents !== null ? (
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {formatCurrency(offer.median30dCents)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Histórico insuficiente (&lt; 5 dias)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {renderBadgeStatus(offer.badgeStatus)}
                    </td>
                    <td className="px-4 py-3">
                      {offer.hasOutlier ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          title="Observação expurgada por queda relativa superior a 50% conforme Spec 0017 Regra 3">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Outlier detectado ({offer.outlierCount})
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                          Regular
                        </span>
                      )}
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
