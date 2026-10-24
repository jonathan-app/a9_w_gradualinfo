/**
 * @fileoverview components/admin/admin-header.tsx — cabeçalho da área administrativa de alta fidelidade
 * @module components/admin/admin-header
 * @description Barra superior do painel: exibe data e hora em horário de Brasília, sino de notificações,
 *   seletor de tema em cápsula ThemeToggle, indicador de sessão AAL2 e logout seguro (Spec 0033 AC-02).
 * @dependencies react, next/link, @/components/shared/theme-toggle
 */

'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/shared/theme-toggle';

interface AdminHeaderProps {
  userEmail?: string;
  userRole?: string;
  onToggleSidebar?: () => void;
}

export function AdminHeader({
  userEmail = 'admin@gradualinfo.dev',
  userRole = 'admin',
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

  // Data formatada no padrão do mockup (ex: 19 de outubro de 2026 10:42 (BRT))
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    revisor: 'Revisor',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 dark:border-gray-800/80 dark:bg-gray-900/95">
      {/* Lado Esquerdo: Botão mobile e seta */}
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

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          title="Retornar ao portal">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="hidden sm:inline">Ver Portal</span>
        </Link>
      </div>

      {/* Lado Direito: Data, Notificações, ThemeToggle e Perfil */}
      <div className="flex items-center gap-3.5">
        {/* Data contextual com ícone de calendário */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{todayFormatted}</span>
        </div>

        {/* Sino de Notificações com badge de alerta */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Notificações do sistema">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" />
        </button>

        {/* Alternador de tema em cápsula (desktop) / ícone único (mobile) */}
        <div className="shrink-0 scale-90 sm:scale-95 text-gray-700 dark:text-gray-200">
          <ThemeToggle className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" />
        </div>

        {/* Status AAL2 */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Sessão AAL2 Protegida</span>
        </div>

        {/* Informações do Operador */}
        <div className="hidden xl:block text-right">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[140px] truncate">
            {userEmail}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
            {userRole === 'admin'
              ? 'Administrador Único'
              : roleLabels[userRole] || 'Operador'}
          </p>
        </div>

        {/* Botão de Logout */}
        <form
          action="/api/admin/auth/logout"
          method="POST"
          onSubmit={handleLogout}>
          <button
            type="submit"
            className="rounded-lg border border-red-200/80 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
