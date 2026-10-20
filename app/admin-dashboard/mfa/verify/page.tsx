/**
 * @fileoverview app/admin-dashboard/mfa/verify/page.tsx — desafio de segundo fator (MFA)
 * @module app/admin-dashboard/mfa/verify
 * @description Tela de validação de desafio TOTP. Apresentada após login com senha (sessão AAL1)
 *   quando o administrador possui fator cadastrado. Permite estritamente responder ao desafio ou
 *   executar logout seguro.
 * @dependencies react, next/link, next/navigation, @/lib/admin/auth, @/lib/env, @/lib/supabase/server
 */
import { requireAdminAccessPage } from '@/lib/admin/access-guard';

import {
  resolveAdminMfaLadder,
  resolveAdminRole,
  sanitizeAdminRedirect,
} from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

interface MfaVerifyPageProps {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
}

/**
 * Apresenta desafio e orientação de recuperação sem recriar fatores.
 * @param props - Parâmetros de navegação do desafio.
 * @returns Página restrita à identidade administrativa.
 */
export default async function AdminMfaVerifyPage({
  searchParams,
}: MfaVerifyPageProps) {
  await requireAdminAccessPage();
  const params = await searchParams;
  const safeRedirect = sanitizeAdminRedirect(params.redirectTo);

  const adminId = env.adminUserId.trim();
  if (!adminId) {
    notFound();
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  // Se não estiver autenticado, vai para a tela de login
  if (authError || !authData.user) {
    redirect(
      `/admin-dashboard/login?redirectTo=${encodeURIComponent('/admin-dashboard/mfa/verify')}`,
    );
  }

  // Verifica se o usuário autenticado tem papel administrativo no painel
  const role = await resolveAdminRole(supabase, authData.user);
  if (!role) {
    notFound();
  }

  // Verifica status atual de MFA
  const ladder = await resolveAdminMfaLadder(supabase);

  // Sessão já em AAL2: redireciona diretamente ao destino
  if (ladder.action === 'ok') {
    redirect(safeRedirect);
  }

  // Sem nenhum fator TOTP: o lugar é o setup, não o desafio. Fator pendente de
  // verificação legítimo cai em `verify` (a escada não volta ao setup para não
  // re-enrollar e travar com conflito no gotrue).
  if (ladder.action === 'setup') {
    redirect(
      `/admin-dashboard/mfa/setup?redirectTo=${encodeURIComponent(safeRedirect)}`,
    );
  }

  let errorMessage = '';
  if (params.error === 'invalid_code') {
    errorMessage = 'Código incorreto ou expirado. Tente novamente.';
  } else if (params.error === 'invalid_code_format') {
    errorMessage = 'O código de autenticação deve ter 6 dígitos.';
  } else if (params.error === 'no_factors') {
    errorMessage = 'Nenhum fator TOTP ativo encontrado.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl">
            2FA
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Verificação de Segurança
          </h1>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Digite o código do seu aplicativo autenticador para liberar a sessão
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <p className="mb-4 text-xs text-gray-600 dark:text-gray-300">
          Se você perdeu o autenticador ou não conseguiu concluir a
          configuração, o proprietário deve recuperar o fator manualmente no
          Supabase. Esta página não recria nem reapresenta a chave TOTP.
        </p>

        <form
          action="/api/admin/auth/mfa/verify"
          method="POST"
          className="space-y-4">
          <input type="hidden" name="source" value="verify" />
          <input type="hidden" name="redirectTo" value={safeRedirect} />

          <div>
            <label
              htmlFor="code"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Código de 6 Dígitos (TOTP)
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="000000"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-xl font-mono tracking-widest text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
            Confirmar e Acessar
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <Link
            href="/"
            className="hover:text-gray-700 dark:hover:text-gray-300">
            ← Voltar ao portal
          </Link>
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="text-red-700 font-medium hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
              Encerrar sessão
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
