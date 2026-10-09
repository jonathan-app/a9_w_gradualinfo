/**
 * @fileoverview app/admin-dashboard/mfa/setup/page.tsx — configuração inicial do MFA
 * @module app/admin-dashboard/mfa/setup
 * @description Fluxo protegido de matrícula do fator TOTP para o administrador único.
 *   Exige sessão autenticada com UUID autorizado. Gera o segredo de provisionamento
 *   e solicita a primeira validação de 6 dígitos para promover a sessão a AAL2.
 * @dependencies react, next/link, next/navigation, @/lib/admin/auth, @/lib/env, @/lib/supabase/server
 */

import { sanitizeAdminRedirect } from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

interface MfaSetupPageProps {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
}

export default async function AdminMfaSetupPage({
  searchParams,
}: MfaSetupPageProps) {
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
      `/admin-dashboard/login?redirectTo=${encodeURIComponent('/admin-dashboard/mfa/setup')}`,
    );
  }

  // Se não for o administrador único, oculta existência (404)
  if (authData.user.id !== adminId) {
    notFound();
  }

  // Verifica status atual de MFA
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentAal = aalData?.currentLevel || 'aal1';
  const nextAal = aalData?.nextLevel || 'aal1';

  // Se já possui fator cadastrado e já está em AAL2, não precisa forçar setup
  const alreadyConfigured = nextAal === 'aal2' && currentAal === 'aal2';

  let factorId = '';
  let secret = '';
  let uri = '';
  let enrollError = false;

  if (!alreadyConfigured) {
    const { data: enrollData, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'GradualInfo',
      friendlyName: 'Admin Authenticator',
    });

    if (err || !enrollData) {
      enrollError = true;
    } else {
      factorId = enrollData.id;
      secret = enrollData.totp.secret;
      uri = enrollData.totp.uri;
    }
  }

  let errorMessage = '';
  if (params.error === 'invalid_code') {
    errorMessage =
      'Código incorreto. Digite os 6 dígitos gerados no aplicativo.';
  } else if (params.error === 'invalid_code_format') {
    errorMessage = 'O código deve conter exatamente 6 dígitos numéricos.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl">
            MFA
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Configurar Autenticação de Dois Fatores
          </h1>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Obrigatório para autorizar acesso ao painel editorial (Nível AAL2)
          </p>
        </div>

        {alreadyConfigured ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <p className="font-semibold">MFA já ativo e verificado!</p>
              <p className="mt-1">
                Sua sessão atual possui autenticação de dois fatores completa
                (AAL2).
              </p>
            </div>
            <Link
              href={safeRedirect}
              className="block w-full rounded-lg bg-blue-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
              Ir para o Painel
            </Link>
          </div>
        ) : enrollError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">Falha ao iniciar registro de MFA.</p>
            <p className="mt-1">
              Recarregue a página ou contate o suporte de infraestrutura.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="rounded-lg bg-gray-50 p-3.5 text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <p className="font-semibold text-gray-900 dark:text-white">
                1. Adicione a chave no seu app autenticador
              </p>
              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                (Google Authenticator, Bitwarden, 1Password ou similar)
              </p>
              <div className="mt-2.5 flex items-center justify-between rounded border border-gray-200 bg-white p-2 font-mono text-xs select-all dark:border-gray-700 dark:bg-gray-900">
                <span className="break-all font-semibold tracking-wider text-blue-600 dark:text-blue-400">
                  {secret}
                </span>
              </div>
              {uri && (
                <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                  Nome: GradualInfo ({authData.user.email})
                </div>
              )}
            </div>

            <form
              action="/api/admin/auth/mfa/verify"
              method="POST"
              className="space-y-4">
              <input type="hidden" name="factorId" value={factorId} />
              <input type="hidden" name="source" value="setup" />
              <input type="hidden" name="redirectTo" value={safeRedirect} />

              <div>
                <label
                  htmlFor="code"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  2. Digite o código de 6 dígitos gerado
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
                  placeholder="123456"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-mono tracking-widest text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                Ativar MFA e Entrar
              </button>
            </form>
          </div>
        )}

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
