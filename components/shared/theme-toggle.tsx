'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils/cn';

/**
 * Hook interno: detecta se o componente já montou no cliente.
 *
 * Usa `useSyncExternalStore` em vez de `useState + useEffect` para evitar o
 * segundo render e o warning do react-hooks/set-state-in-effect. O snapshot
 * do servidor é `false`; o do cliente é `true`. O React iguala os dois lados
 * na hidratação e só depois re-renderiza com o valor do cliente.
 */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * components/shared/theme-toggle.tsx — Seletor segmentado com 3 opções (Claro, Escuro e Sistema).
 *
 * Renderiza uma cápsula com botões para Claro (Sol), Escuro (Lua) e Sistema (Monitor).
 * Um indicador circular deslizante destaca a opção ativa com animação suave.
 *
 * @fileoverview Seletor de tema com 3 opções em cápsula segmentada.
 * @module components/shared/theme-toggle
 * @description 'use client' porque consome o estado do next-themes na hidratação.
 * @dependencies react (useSyncExternalStore), next-themes (useTheme), lib/utils/cn.
 */
export function ThemeToggle({ className }: { className?: string } = {}) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  // Antes de montar no cliente, o padrão inicial da página é o modo escuro
  const currentTheme = mounted && theme ? theme : 'dark';

  return (
    <div
      role="group"
      aria-label="Selecionar tema de exibição"
      className={cn(
        'relative inline-flex h-8 w-[92px] shrink-0 items-center rounded-full bg-[#18181b]/90 p-0.5 border border-white/15 shadow-inner backdrop-blur-xs select-none',
        className,
      )}>
      {/* Indicador deslizante ativo (círculo iluminado atrás do ícone selecionado) */}
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white/20 border border-white/25 shadow-sm transition-transform duration-300 ease-in-out',
          currentTheme === 'light' && 'translate-x-0',
          currentTheme === 'dark' && 'translate-x-[29px]',
          currentTheme === 'system' && 'translate-x-[58px]',
        )}
        aria-hidden="true"
      />

      {/* Opção 1: Claro (Sol) */}
      <button
        type="button"
        aria-pressed={currentTheme === 'light'}
        aria-label="Tema claro"
        title="Tema claro"
        onClick={() => setTheme('light')}
        className={cn(
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'light'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200',
        )}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
          <line x1="12" y1="2" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
          <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
          <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
          <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
        </svg>
      </button>

      {/* Opção 2: Escuro (Lua) */}
      <button
        type="button"
        aria-pressed={currentTheme === 'dark'}
        aria-label="Tema escuro"
        title="Tema escuro"
        onClick={() => setTheme('dark')}
        className={cn(
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'dark'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200',
        )}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      {/* Opção 3: Sistema (Monitor) */}
      <button
        type="button"
        aria-pressed={currentTheme === 'system'}
        aria-label="Tema do sistema"
        title="Tema do sistema"
        onClick={() => setTheme('system')}
        className={cn(
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'system'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200',
        )}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true">
          <path d="M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4.5l1.2 3.1a.8.8 0 0 1-.75 1.1H8.05a.8.8 0 0 1-.75-1.1L8.5 16H4a2 2 0 0 1-2-2V4z" />
        </svg>
      </button>
    </div>
  );
}
