import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css';

/**
 * .storybook/preview.ts — o ambiente em que cada story renderiza
 *
 * Importar o globals.css é o que faz o Tailwind aparecer no Storybook. Sem
 * isso os componentes renderizam sem estilo nenhum — e a story parece quebrada
 * quando só falta CSS.
 */
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
