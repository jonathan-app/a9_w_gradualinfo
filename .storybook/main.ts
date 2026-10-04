import type { StorybookConfig } from '@storybook/nextjs-vite';

/**
 * .storybook/main.ts — o que o Storybook procura e como compila
 *
 * O Storybook aqui usa `@storybook/nextjs-vite`: ele reaproveita o plugin do
 * Next no Vite, de modo que alias (`@/`), Server Components e o pipeline de CSS
 * (incluindo o Tailwind 4 via PostCSS) funcionam como no build real. Storybook
 * com config genérico compila em outro ambiente e erra justamente no que
 * importa.
 */
const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
};

export default config;
