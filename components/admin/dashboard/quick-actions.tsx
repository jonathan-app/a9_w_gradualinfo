/**
 * @fileoverview components/admin/dashboard/quick-actions.tsx — atalhos operacionais rápidos do painel
 * @module components/admin/dashboard/quick-actions
 * @description Apresenta as 5 ações operacionais mais comuns com caixas de ícones coloridos,
 *   títulos claros, descrições e links direcionados (Spec 0033 AC-06).
 * @dependencies react, next/link
 */

import Link from 'next/link';

interface QuickActionsProps {
  sanityStudioUrl?: string;
}

export function QuickActions({ sanityStudioUrl }: QuickActionsProps) {
  const actions = [
    {
      id: 'content',
      title: 'Conteúdo',
      description: 'Gerenciar artigos e categorias',
      href: sanityStudioUrl || '/artigos',
      isExternal: !!sanityStudioUrl,
      bg: 'bg-blue-500',
      icon: (
        <svg
          className="h-5 w-5 text-white"
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
      title: 'Ofertas',
      description: 'Configurar e validar ofertas',
      href: '#secao-ofertas',
      isExternal: false,
      bg: 'bg-emerald-500',
      icon: (
        <svg
          className="h-5 w-5 text-white"
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
      title: 'Usuários',
      description: 'Administrar acessos e permissões',
      href: '#secao-usuarios',
      isExternal: false,
      bg: 'bg-indigo-500',
      icon: (
        <svg
          className="h-5 w-5 text-white"
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
      title: 'Segurança',
      description: 'MFA, sessões e políticas',
      href: '/admin-dashboard/mfa/setup',
      isExternal: false,
      bg: 'bg-amber-500',
      icon: (
        <svg
          className="h-5 w-5 text-white"
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
      title: 'Configurações',
      description: 'Sistema, integrações e preferências',
      href: '#secao-configuracoes',
      isExternal: false,
      bg: 'bg-slate-700',
      icon: (
        <svg
          className="h-5 w-5 text-white"
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

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Acessos rápidos
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Ações mais utilizadas no dia a dia.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {actions.map((action) => {
          const content = (
            <div className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 transition-all hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800/80 dark:bg-gray-950/40 dark:hover:border-gray-700 dark:hover:bg-gray-800/40">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.bg} shadow-sm`}>
                  {action.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </div>

              <span className="text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-gray-500">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
          );

          if (action.isExternal) {
            return (
              <a
                key={action.id}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block">
                {content}
              </a>
            );
          }

          return (
            <Link key={action.id} href={action.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
