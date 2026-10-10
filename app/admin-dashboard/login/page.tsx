/**
 * @fileoverview app/admin-dashboard/login/page.tsx — tela de acesso administrativo
 * @module app/admin-dashboard/login
 * @description Formulário de autenticação adaptado do TailAdmin 2.4.0. Permite login exclusivo
 *   do operador via POST em /api/admin/auth/login. Não exibe links de cadastro de leitores nem login social.
 * @dependencies react, next/link, @/lib/admin/auth
 */
import {
  getAdminAccessLogoutUrl,
  requireAdminAccessPage,
} from '@/lib/admin/access-guard';

import { sanitizeAdminRedirect } from '@/lib/admin/auth';
import Link from 'next/link';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
    signedOut?: string;
  }>;
}

/**
 * Apresenta login Supabase após admissão Access.
 * @param props - Parâmetros seguros de navegação.
 * @returns Formulário administrativo privado.
 */
export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  await requireAdminAccessPage();
  const params = await searchParams;
  const safeRedirect = sanitizeAdminRedirect(params.redirectTo);

  const accessLogoutUrl =
    params.signedOut === '1' ? getAdminAccessLogoutUrl() : null;
  let errorMessage = '';
  if (params.error === 'invalid_credentials') {
    errorMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
  } else if (params.error === 'rate_limited') {
    errorMessage = 'Muitas tentativas consecutivas. Aguarde um minuto.';
  } else if (params.error === 'missing_credentials') {
    errorMessage = 'Informe e-mail e senha para prosseguir.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl">
            GI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Acesso exclusivo para o administrador do GradualInfo
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {accessLogoutUrl && (
          <p className="mb-4 text-sm">
            <a href={accessLogoutUrl}>Encerrar também a sessão de acesso</a>
          </p>
        )}

        <form
          action="/api/admin/auth/login"
          method="POST"
          className="space-y-4">
          <input type="hidden" name="redirectTo" value={safeRedirect} />

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

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
            Entrar no Painel
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            ← Voltar para o portal público
          </Link>
        </div>
      </div>
    </div>
  );
}
