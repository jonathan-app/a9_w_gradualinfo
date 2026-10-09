/**
 * @fileoverview app/forbidden.tsx — página padrão 403 Forbidden do Next.js
 * @module app/forbidden
 * @description Invocada quando forbidden() é chamado em qualquer Server Component ou Layout.
 *   Retorna status HTTP 403 e interface semântica de acesso negado.
 * @dependencies react, next/link
 */

import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-gray-900 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <span className="text-xl" aria-hidden="true">
            🚫
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Acesso Não Autorizado (403)
        </h1>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          A sua conta não possui privilégios administrativos para visualizar
          este recurso. O identificador do usuário não corresponde ao
          administrador autorizado pelo sistema.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
            Voltar para a Página Inicial
          </Link>
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Encerrar Sessão
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
