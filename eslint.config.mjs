import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// ============================================================================
// eslint.config.mjs — ESLint 9 (flat config)
// ============================================================================
// O `.eslintrc.js` não é mais lido pelo ESLint 9: tudo agora é um array de
// configs exportado de `eslint.config.mjs`. A ordem importa — o array é
// aplicado de cima para baixo, e o último que casar o arquivo vence.
//
// Os dois configs do Next já vêm prontos em flat config:
//   core-web-vitals → regras de React/Next + acessibilidade
//   typescript      → regras do typescript-eslint sobre as anteriores
// ============================================================================

export default defineConfig([
  // --- Ignorados globais -------------------------------------------------
  // `globalIgnores` é o lugar correto: um `{ ignores: [...] }` solto no array
  // vira um config que não casa com nada e o ESLint avisa sobre isso.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    '.open-next/**',
    'open-next/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),

  // --- Regras do Next (React, App Router, a11y) --------------------------
  ...nextVitals,
  ...nextTs,

  // --- Regras do projeto --------------------------------------------------
  {
    rules: {
      // `any` implícito é a maior fonte de bug silencioso em TS. O caso
      // legítimo (JSON externo, libs sem tipos) se declara com `as any`
      // explícito, que passa por esta regra sem complaint.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Promessa sem tratamento é erro silencioso em produção.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'object-shorthand': ['error', 'properties'],
    },
  },

  // --- Exceções por contexto --------------------------------------------
  {
    // Configs e scripts rodam no Node, fora do bundler: `console` é o
    // relatório e `process` é a API disponível.
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Testes descrevem cenários; `any` e console aparecem legitimamente.
    files: ['__tests__/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
]);
