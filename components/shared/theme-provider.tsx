'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * components/shared/theme-provider.tsx — alternância claro/escuro
 *
 * Por que existe um componente só para isso
 * O next-themes precisa de 'use client' e de ler `localStorage` para saber o
 * tema antes da hidratação. Se isso vivesse no layout.tsx, o layout inteiro
 * viraria Client Component e o React pararia de pré-renderizar a árvore.
 * Aqui ele é uma folha: o resto do layout continua no servidor.
 *
 * `attribute="class"` combina com o `@custom-variant dark` do globals.css: o
 * next-themes escreve `class="dark"` no <html> e o Tailwind responde a isso.
 *
 * @fileoverview Envoltório do next-themes (folha client do tema).
 * @module components/shared/theme-provider
 * @dependencies next-themes (NextThemesProvider).
 */
/**
 * Provider de tema usado pelo root layout.
 *
 * @param props.children - Árvore que recebe o contexto de tema.
 * @returns Filhos envolvidos pelo provider, sem elemento próprio no DOM.
 *
 * `disableTransitionOnChange`: sem ele, trocar de tema dispara as transições
 * CSS de cada elemento da página ao mesmo tempo — um flash de animação coletiva
 * no lugar de uma troca limpa.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
