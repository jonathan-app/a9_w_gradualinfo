/**
 * @fileoverview app/admin-dashboard/(protegido)/layout.tsx — guarda no servidor da área protegida
 * @module app/admin-dashboard/(protegido)/layout
 * @description Layout com verificação estrita de autorização no servidor (requireAdminAuth):
 *   1. Redireciona usuários deslogados para o login;
 *   2. Retorna 404 (notFound) para usuários não autorizados (UUID divergente);
 *   3. Redireciona para /admin-dashboard/mfa/setup caso não haja fator TOTP cadastrado;
 *   4. Redireciona para /admin-dashboard/mfa/verify caso a sessão esteja em AAL1;
 *   5. Bloqueia com erro seguro em fail-closed caso ADMIN_USER_ID esteja ausente;
 *   6. Renderiza a casca administrativa completa exclusivamente com nível AAL2 comprovado.
 * @dependencies react, next/navigation, @/lib/admin/auth, @/components/admin/admin-shell
 */

import { AdminShell } from '@/components/admin/admin-shell';
import { checkAdminUser } from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { forbidden, redirect } from 'next/navigation';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await checkAdminUser();
  if (auth instanceof Response) {
    throw new Error('Admissão administrativa indisponível.');
  }

  if (!auth.ok) {
    if (auth.reason === 'unauthenticated') {
      redirect(
        `/admin-dashboard/login?redirectTo=${encodeURIComponent('/admin-dashboard')}`,
      );
    }

    if (auth.reason === 'unauthorized') {
      // Rejeita usuário autenticado sem permissão com status HTTP 403 (AC-02)
      forbidden();
    }

    if (auth.reason === 'mfa_enrollment_required') {
      redirect(
        `/admin-dashboard/mfa/setup?redirectTo=${encodeURIComponent('/admin-dashboard')}`,
      );
    }

    if (auth.reason === 'mfa_challenge_required') {
      redirect(
        `/admin-dashboard/mfa/verify?redirectTo=${encodeURIComponent('/admin-dashboard')}`,
      );
    }

    // config_missing: fail-closed absoluto
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-gray-900">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            ⚠️
          </div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            Painel Administrativo Indisponível
          </h1>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            A configuração do identificador único administrativo está ausente no
            servidor. Por política de segurança estrita (fail-closed), o acesso
            ao painel foi bloqueado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      userEmail={auth.user.email || 'admin@gradualinfo.dev'}
      sanityStudioUrl={env.sanityStudioUrl}>
      {children}
    </AdminShell>
  );
}
