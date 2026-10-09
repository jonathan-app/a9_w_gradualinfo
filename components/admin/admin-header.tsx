/**
 * @fileoverview components/admin/admin-header.tsx — cabeçalho da área administrativa
 * @module components/admin/admin-header
 * @description Barra superior do painel adaptada do TailAdmin: exibe identidade do operador,
 *   indicador de autenticação com segundo fator (MFA AAL2), link de retorno ao portal e
 *   ação de logout seguro via POST.
 * @dependencies react, next/link, @/lib/utils/cn
 */

'use client';

import Link from 'next/link';

interface AdminHeaderProps {
  userEmail?: string;
  onToggleSidebar?: () => void;
}

export function AdminHeader({
  userEmail = 'a3qua96@gmail.com',
  onToggleSidebar,
}: AdminHeaderProps) {
  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
    } catch {
      // Ignora erro de rede temporário
    }
    window.location.href = '/admin-dashboard/login';
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 lg:hidden dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Alternar menu lateral">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Painel Administrativo
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            GradualInfo Editorial
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Sessão AAL2 Protegida</span>
        </div>

        <div className="hidden md:block text-right">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {userEmail}
          </p>
          <p className="text-[10px] text-gray-600 dark:text-gray-300">
            Administrador Único
          </p>
        </div>

        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          Ver Portal
        </Link>

        <form
          action="/api/admin/auth/logout"
          method="POST"
          onSubmit={handleLogout}>
          <button
            type="submit"
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
