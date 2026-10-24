/**
 * @fileoverview app/admin-dashboard/(protegido)/usuarios/page.tsx — página de gestão de operadores
 * @module app/admin-dashboard/(protegido)/usuarios/page
 * @description Página protegida que lista operadores administrativos e permite
 *   conceder ou revogar papéis via UUID, lendo a mesma função de serviço que
 *   sustenta `GET /api/admin/usuarios/papeis`. Acesso restrito a `admin` com
 *   sessão AAL2, imposto pelo layout protegido e reavaliado aqui para o papel
 *   mínimo `admin`.
 * @dependencies react, next/navigation, @/lib/admin/auth, @/lib/admin/operators,
 *   @/components/admin/usuarios-table, @/components/admin/usuarios-form
 */

import { checkAdminUser, roleSatisfies } from '@/lib/admin/auth';
import { listAdminOperadores } from '@/lib/admin/operators';
import { forbidden, redirect } from 'next/navigation';
import { UsuariosTable } from '@/components/admin/usuarios-table';
import { UsuariosForm } from '@/components/admin/usuarios-form';

interface PageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

export default async function UsuariosPage({ searchParams }: PageProps) {
  const auth = await checkAdminUser();
  if (auth instanceof Response)
    throw new Error('Admissão administrativa indisponível.');
  if (!auth.ok) {
    if (auth.reason === 'unauthenticated')
      redirect(
        `/admin-dashboard/login?redirectTo=${encodeURIComponent('/admin-dashboard/usuarios')}`,
      );
    if (auth.reason === 'unauthorized') forbidden();
    if (auth.reason === 'mfa_enrollment_required')
      redirect(
        `/admin-dashboard/mfa/setup?redirectTo=${encodeURIComponent('/admin-dashboard/usuarios')}`,
      );
    if (auth.reason === 'mfa_challenge_required')
      redirect(
        `/admin-dashboard/mfa/verify?redirectTo=${encodeURIComponent('/admin-dashboard/usuarios')}`,
      );
    throw new Error('Autorização administrativa indisponível.');
  }
  if (!roleSatisfies(auth.role, 'admin')) forbidden();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(params.limit || '20', 10) || 20),
  );

  let data;
  try {
    data = await listAdminOperadores({
      page,
      limit,
      actorRole: auth.role,
    });
  } catch {
    throw new Error('Falha ao buscar operadores administrativos.');
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            Gestão de Operadores
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Lista de operadores administrativos. Conceda ou revogue papéis por
            UUID da conta de autenticação.
          </p>
        </div>
        <UsuariosForm />
      </div>

      <UsuariosTable
        root={data.root}
        operadores={data.operadores ?? []}
        meta={data.meta}
        page={page}
      />
    </div>
  );
}
