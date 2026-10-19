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
        'relative inline-flex h-8 w-[88px] shrink-0 items-center rounded-full bg-black/30 p-0.5 backdrop-blur-sm select-none',
        className,
      )}>
      {/* Indicador deslizante ativo sem contornos cinzas */}
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white/25 transition-transform duration-300 ease-in-out',
          currentTheme === 'light' && 'translate-x-0',
          currentTheme === 'dark' && 'translate-x-[28px]',
          currentTheme === 'system' && 'translate-x-[56px]',
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
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'light'
            ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.5)] scale-105'
            : 'text-white/55 hover:text-white/85 hover:bg-white/5',
        )}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
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
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'dark'
            ? 'text-sky-200 drop-shadow-[0_0_6px_rgba(186,230,253,0.5)] scale-105'
            : 'text-white/55 hover:text-white/85 hover:bg-white/5',
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
          'relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          currentTheme === 'system'
            ? 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] scale-105'
            : 'text-white/55 hover:text-white/85 hover:bg-white/5',
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
