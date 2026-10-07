/**
 * @fileoverview O ambiente em que cada story renderiza.
 * @module .storybook/preview
 * @description Parâmetros globais das stories: layout, varredura de acessibilidade e matchers
 *   dos controls. É a camada que faz a story parecer com a página real.
 * @dependencies `app/globals.css` (tokens do Tailwind 4), config do framework nextjs-vite.
 *
 * Importar o globals.css é o que faz o Tailwind aparecer no Storybook. Sem isso os
 * componentes renderizam sem estilo nenhum — e a story parece quebrada quando só falta CSS.
 */
import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css';
const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: {
      // O Storybook de acessibilidade não substitui revisão manual: ele pega
      // contraste e nome acessível, que são as duas coisas mais esquecidas.
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
