/**
 * @fileoverview O que o Storybook procura (stories) e com o que compila.
 * @module .storybook/main
 * @description Catálogo visual e de acessibilidade dos componentes de `components/`. Não
 *   participa do build do app nem da CI de build: só roda quando alguém sobe o Storybook.
 * @dependencies `@storybook/nextjs-vite` (framework), addons de docs e de a11y.
 *
 * O framework `nextjs-vite` reaproveita o plugin do Next no Vite, de modo que alias (`@/`),
 * Server Components e o pipeline de CSS (incluindo o Tailwind 4 via PostCSS) funcionam como
 * no build real. Storybook com config genérico compila em outro ambiente e erra justamente
 * no que importa.
 *
 * Os stories ficam ao lado do componente (pasta `components`, sufixo `.stories.tsx`):
 * catálogo e implementação mudam juntos, ou não mudam.
 */
import type { StorybookConfig } from '@storybook/nextjs-vite';
const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
};

export default config;
