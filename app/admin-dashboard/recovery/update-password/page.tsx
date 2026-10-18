/**
 * @fileoverview app/admin-dashboard/recovery/update-password/page.tsx — redefinição de senha
 * @module app/admin-dashboard/recovery/update-password
 * @description Interface para definição de nova senha sob sessão de recuperação autenticada.
 *   Valida admissão Access, confere identidade do administrador único e redireciona para o
 *   desafio TOTP se houver segundo fator ativo antes de permitir a alteração da senha.
 * @dependencies react, next/navigation, @/lib/admin/access-guard, @/lib/admin/auth, @/lib/supabase/server
 */

import { requireAdminAccessPage } from '@/lib/admin/access-guard';
import { resolveAdminMfaLadder } from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface UpdatePasswordPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

/**
 * Tela de definição de nova senha sob sessão de recuperação.
 * @param props - Parâmetros de erro de submissão anterior.
 * @returns Formulário de alteração de credencial primária.
 */
export default async function AdminUpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  await requireAdminAccessPage();
  const params = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  const adminId = env.adminUserId.trim();
  if (error || !data.user || data.user.id !== adminId) {
    redirect('/admin-dashboard/login?error=recovery_link_invalid');
  }

  // Se o usuário possui fator TOTP ativo e a sessão ainda está em AAL1,
  // conduz ao desafio TOTP antes de permitir o formulário de atualização de senha
  try {
    const ladder = await resolveAdminMfaLadder(supabase);
    if (ladder.action === 'verify') {
      redirect(
        '/admin-dashboard/mfa/verify?redirectTo=/admin-dashboard/recovery/update-password',
      );
    }
  } catch {
    redirect(
      '/admin-dashboard/mfa/verify?redirectTo=/admin-dashboard/recovery/update-password',
    );
  }

  let errorMessage = '';
  if (params.error === 'weak_password') {
    errorMessage = 'A nova senha deve conter no mínimo 6 caracteres.';
  } else if (params.error === 'password_mismatch') {
    errorMessage = 'As senhas informadas não coincidem. Digite novamente.';
  } else if (params.error === 'update_failed') {
    errorMessage =
      'Não foi possível atualizar a senha. Tente novamente ou solicite novo link.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl">
            GI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Definir Nova Senha
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cadastre uma nova credencial primária para o administrador
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          action="/api/admin/auth/recovery/update-password"
          method="POST"
          className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Nova Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Confirmar Nova Senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
            Salvar e Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
