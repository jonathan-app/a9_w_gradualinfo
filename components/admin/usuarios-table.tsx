/**
 * @fileoverview components/admin/usuarios-table.tsx — tabela de operadores administrativos
 * @module components/admin/usuarios-table
 * @description Renderiza a conta raiz destacada separadamente e a lista paginada de
 *   delegados com UUID, email, papel e data de atribuição, incluindo estados de
 *   lista vazia e paginação.
 * @dependencies react, @/lib/utils/format, @/components/ui/badge
 */

import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

interface OperadorRow {
  userId: string;
  email: string;
  role: string;
  assignedAt: string | null;
}

interface RootRow {
  userId: string;
  email: string;
  role: string;
  assignedAt: string | null;
  isRoot: true;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsuariosTableProps {
  root: RootRow | null;
  operadores: OperadorRow[];
  meta: Meta;
  page: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  revisor: 'Revisor',
};

export function UsuariosTable({
  root,
  operadores,
  meta,
  page,
}: UsuariosTableProps) {
  const totalPages = Math.max(1, meta.totalPages);

  const buildPageUrl = (targetPage: number) =>
    `/admin-dashboard/usuarios?page=${targetPage}&limit=${meta.limit}`;

  const roleBadge = (role: string) => {
    const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      role === 'admin'
        ? 'destructive'
        : role === 'editor'
          ? 'default'
          : 'outline';
    return <Badge variant={variant}>{ROLE_LABELS[role] || role}</Badge>;
  };

  return (
    <section aria-labelledby="usuarios-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </span>
            <h2
              id="usuarios-heading"
              className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              Operadores Administrativos
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Conta raiz destacada separadamente. Delegados ordenados por data de
            atribuição.
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Total:{' '}
          <strong className="text-gray-900 dark:text-white">
            {meta.total}
          </strong>{' '}
          {meta.total === 1 ? 'operador' : 'operadores'}
        </span>
      </div>

      {/* Conta raiz destacada */}
      {root && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/60 dark:text-brand-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Conta raiz
                </h3>
                <p className="text-[11px] text-muted-foreground dark:text-gray-400">
                  {root.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Imutável
              </span>
              <Badge variant="destructive">
                {ROLE_LABELS[root.role] || root.role}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de delegados */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  UUID
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  E-mail
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Papel
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Atribuição
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {operadores.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                    Nenhum operador encontrado.
                  </td>
                </tr>
              ) : (
                operadores.map((op) => (
                  <tr
                    key={op.userId}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {op.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {op.email}
                    </td>
                    <td className="px-4 py-3">{roleBadge(op.role)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {op.assignedAt ? formatDate(op.assignedAt) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Página{' '}
              <strong className="text-gray-900 dark:text-white">{page}</strong>{' '}
              de{' '}
              <strong className="text-gray-900 dark:text-white">
                {totalPages}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={buildPageUrl(page - 1)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                  Anterior
                </a>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-600">
                  Anterior
                </span>
              )}

              {page < totalPages ? (
                <a
                  href={buildPageUrl(page + 1)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                  Próxima
                </a>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-600">
                  Próxima
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
