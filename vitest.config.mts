// ============================================================================
// vitest.config.mts — testes unitários e de componente (Vitest)
// ============================================================================
//
// O Vitest roda dentro do processo do Node: rápido, sem browser de verdade.
// Para o que precisa de browser real, quem entra é o Playwright (e2e/) — são
// camadas diferentes, com comandos diferentes.
//
// O que este arquivo controla:
//   - quais arquivos contam como teste (include/exclude)
//   - o ambiente em que o código roda (jsdom imita o DOM do navegador)
//   - o que roda antes de cada teste (setupFiles)
//   - os apelidos de import (@/lib/...) iguais aos do tsconfig
//   - o piso de cobertura
// ============================================================================

import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O plugin do React é o que transforma o JSX dos componentes e do setup.
  // Sem ele, o Vitest 4 (rolldown) tenta ler JSX como JavaScript e falha com
  // "Unexpected JSX expression" — o erro não aponta o arquivo do teste, e sim
  // o componente importado, o que manda a investigação para o lugar errado.
  plugins: [react()],

  test: {
    // jsdom implementa o DOM em Node: dá para testar hooks de browser
    // (useState, useEffect, eventos) sem subir um navegador.
    environment: 'jsdom',

    // Executado antes de CADA arquivo de teste: registra os matchers do
    // @testing-library/jest-dom e limpa o DOM entre testes.
    setupFiles: ['./__tests__/setup.ts'],

    // Libera describe/test/expect sem importar de 'vitest' em cada arquivo.
    globals: true,

    // Permite importar .css nos testes (o Vite devolve stub vazio).
    css: true,

    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],

    // O include é restrito a __tests__/, mas o exclude protege de pasting
    // acidental de testes dentro de pasta de build.
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/e2e/**'],

    // Não deixa teste pendurado "passar" sem ter rodado.
    passWithNoTests: false,

    coverage: {
      // Cobertura nativa do V8: não precisa instrumentar o código.
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // O que NÃO conta como coberto (e nem entra no denominador):
      //   testes, tipos, stories, configs, scripts e artefatos gerados.
      exclude: [
        'node_modules/',
        '__tests__/**',
        'e2e/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        'public/**',
        'scripts/**',
        '.agents/**',
        '.storybook/**',
        'next-env.d.ts',
      ],

      // Piso inicial de cobertura. Suba junto com a suíte de testes: um
      // threshold alto que o projeto não atinge esconde o número real em vez
      // de avisar sobre ele.
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
  },

  resolve: {
    // Espelha os `paths` do tsconfig.json para que os testes resolvam os
    // mesmos apelidos que o Next usa no build.
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
