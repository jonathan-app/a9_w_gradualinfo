/**
 * @fileoverview app/admin-dashboard/recovery/request/page.tsx — solicitação de recuperação de senha
 * @module app/admin-dashboard/recovery/request
 * @description Interface para solicitação de redefinição de senha do administrador único.
 *   Disponível sob admissão Cloudflare Access, submete para /api/admin/auth/recovery
 *   e exibe mensagem de confirmação uniforme.
 * @dependencies react, next/link, @/lib/admin/access-guard
 */

import { requireAdminAccessPage } from '@/lib/admin/access-guard';
import Link from 'next/link';

interface RecoveryRequestPageProps {
  searchParams: Promise<{
    sent?: string;
    error?: string;
  }>;
}

/**
 * Tela de solicitação de recuperação de senha administrativa.
 * @param props - Parâmetros de status e retorno.
 * @returns Interface do formulário de solicitação.
 */
export default async function AdminRecoveryRequestPage({
  searchParams,
}: RecoveryRequestPageProps) {
  await requireAdminAccessPage();
  const params = await searchParams;
  const isSent = params.sent === '1';

  let errorMessage = '';
  if (params.error === 'rate_limited') {
    errorMessage = 'Muitas tentativas consecutivas. Aguarde alguns minutos.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl">
            GI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Recuperação de Acesso
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Redefinição de senha do administrador único do GradualInfo
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {isSent ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <p className="font-semibold">Instruções enviadas</p>
              <p className="mt-1">
                Se o e-mail informado corresponder ao administrador, as
                instruções com link de uso único foram enviadas.
              </p>
              <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                O link expira em 15 minutos e deve ser aberto neste mesmo
                navegador para validar o verificador de segurança.
              </p>
            </div>

            <Link
              href="/admin-dashboard/login"
              className="block w-full rounded-lg bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              Retornar ao Login
            </Link>
          </div>
        ) : (
          <form
            action="/api/admin/auth/recovery"
            method="POST"
            className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                E-mail Administrativo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu-email@dominio.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
              Enviar Link de Redefinição
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/admin-dashboard/login"
                className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Lembrou sua senha? Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
