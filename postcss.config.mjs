/**
 * @fileoverview Pipeline de CSS usado pelo Next — registra o plugin do Tailwind 4.
 * @module postcss.config
 * @description O Tailwind 4 não usa `tailwind.config.js`: a configuração vive em CSS, dentro
 *   de `app/globals.css`, no bloco `@theme`. O que este arquivo faz é registrar o plugin
 *   PostCSS que compila esse CSS para o navegador — sem ele, os utilitários simplesmente não
 *   existem no bundle e a página sai sem estilo.
 * @dependencies @tailwindcss/postcss.
 *
 * Referência: https://tailwindcss.com/docs/installation/framework-guides/nextjs
 */

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
