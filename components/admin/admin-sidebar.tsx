/**
 * @fileoverview components/admin/admin-sidebar.tsx — menu lateral de navegação administrativa
 * @module components/admin/admin-sidebar
 * @description Sidebar escura de alta fidelidade com branding GradualInfo, grupos de navegação,
 *   indicador de item ativo e card motivacional no rodapé (Spec 0033 AC-01).
 * @dependencies react, next/link, next/navigation, @/lib/utils/cn
 */

'use client';

import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  sanityStudioUrl: string;
}

export function AdminSidebar({
  isOpen = false,
  onClose,
  sanityStudioUrl,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      ariaLabel: 'Visão Geral',
      href: '/admin-dashboard',
      exact: true,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: 'content',
      label: 'Conteúdo',
      ariaLabel: 'CMS Sanity Studio',
      href: sanityStudioUrl || '/artigos',
      isExternal: !!sanityStudioUrl,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'offers',
      label: 'Ofertas',
      href: '#secao-ofertas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Usuários',
      href: '#secao-usuarios',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: 'security',
      label: 'Segurança',
      ariaLabel: 'Configurar MFA',
      href: '/admin-dashboard/mfa/setup',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Configurações',
      href: '#secao-configuracoes',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  const systemNav = [
    {
      id: 'logs',
      label: 'Logs',
      href: '#secao-auditoria',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      id: 'monitoring',
      label: 'Monitoramento',
      href: '#secao-saude',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop móvel */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-slate-800 bg-[#0B132B] text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
        {/* Topo da Sidebar: Branding */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-5">
            <div className="flex flex-col">
              <Link href="/admin-dashboard" className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  Gradual<span className="text-blue-500">Info</span>
                </span>
                <span className="sr-only">Painel Editorial</span>
              </Link>
              <p className="mt-1 text-[11px] leading-tight text-slate-400">
                Tecnologia e consumo digital de forma inteligente.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
                aria-label="Fechar navegação">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Navegação Principal */}
          <nav className="mt-4 space-y-1 px-3">
            {mainNav.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              const linkContent = (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white',
                  )}>
                  <span
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-white' : 'text-slate-400',
                    )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              );

              if (item.isExternal) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    aria-label={item.ariaLabel || item.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}>
                    {linkContent}
                  </a>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-label={item.ariaLabel || item.label}
                  onClick={onClose}>
                  {linkContent}
                </Link>
              );
            })}

            {/* Grupo Sistema */}
            <div className="pt-6">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sistema
              </span>
              <div className="mt-2 space-y-1">
                {systemNav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white">
                    <span className="shrink-0 text-slate-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Rodapé da Sidebar: Card Motivacional */}
        <div className="p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                🚀
              </div>
              <p className="text-[11px] font-medium leading-snug text-slate-300">
                Conteúdo de qualidade, melhores decisões.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
