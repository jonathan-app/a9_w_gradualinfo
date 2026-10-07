'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { LuMoon, LuSun } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

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
 * components/shared/theme-toggle.tsx — alterna claro/escuro
 *
 * O ícone é escolhido lendo `theme` do next-themes. Enquanto o componente não
 * monta (o HTML do servidor não sabe o tema do usuário), renderiza um botão
 * vazio com o mesmo tamanho: o botão não muda de largura ao hidratar, então
 * não há layout shift.
 *
 * O next-themes 1.0.0-beta.0 lê `localStorage` já no useState inicial do
 * cliente, então `resolvedTheme` está definido no primeiro render do cliente e
 * antes só valia nada até um effect — o servidor renderiza botão vazio e o
 * cliente entra com ícone, e a hidratação falha. Por isso o porteiro real é
 * `mounted`: só vira true depois do effect, igualando a primeira renderização
 * do cliente ao HTML do servidor.
 *
 * @fileoverview Botão que alterna entre tema claro e escuro.
 * @module components/shared/theme-toggle
 * @description `'use client'` porque decide ícone e rótulo a partir do estado
 *   do next-themes durante a hidratação — e fica como folha isolada (não no
 *   layout) para o custo de cliente não subir para a árvore inteira.
 * @dependencies react (useSyncExternalStore), next-themes (useTheme),
 *   react-icons/lu, components/ui/button.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === 'dark';
  // Antes de montar, trava o rótulo na mesma string do servidor — senão o
  // primeiro render do cliente já diverge no aria-label e a hidratação falha.
  const label =
    mounted && resolvedTheme
      ? isDark
        ? 'Usar tema claro'
        : 'Usar tema escuro'
      : 'Alternar tema';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {mounted && resolvedTheme ? (
        isDark ? (
          <LuSun aria-hidden />
        ) : (
          <LuMoon aria-hidden />
        )
      ) : null}
    </Button>
  );
}
