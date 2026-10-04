// ============================================================================
// postcss.config.mjs — o Next usa este arquivo para o pipeline de CSS
// ============================================================================
//
// Tailwind 4 não usa `tailwind.config.js`: a configuração vive em CSS, dentro
// de app/globals.css, no bloco `@theme`. O que este arquivo faz é registrar o
// plugin PostCSS que compila esse CSS para o navegador.
//
// Referência: https://tailwindcss.com/docs/installation/framework-guides/nextjs

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
