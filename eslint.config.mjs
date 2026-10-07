/**
 * @fileoverview ESLint 9 (flat config) — regras e exceções por contexto do projeto.
 * @module eslint.config
 * @description Um array de configs exportado de `eslint.config.mjs`: o `.eslintrc.js` não é
 *   mais lido pelo ESLint 9. A ordem importa — o array é aplicado de cima para baixo e o
 *   último que casar o arquivo vence, por isso as exceções (`files` + regras desligadas) vêm
 *   depois das regras gerais.
 * @dependencies plugins JS/TS/React/hooks/a11y/import montados manualmente.
 *
 * Este projeto montava a config em `eslint-config-next`, removido porque
 * `@next/eslint-plugin-next` → `fast-glob → micromatch → braces` e `braces`
 * (GHSA-vfj7-8cjw-p6xm) não tem versão corrigida: o gate de audit sem
 * exceções exige tirar o pacote fora. A montagem abaixo reusa os plugins que
 * o eslint-config-next empacotaria, sem ele. Trade-off aceito: perdemos as
 * regras `next/*`; ganhamos uma cadeia de auditoria zerada.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

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
    // Referência visual versionada, não código ativo. A camada Velite/MDX foi
    // descartada pela spec de supersessão e nada do app a importa; lintar um
    // template de terceiro faz o lint do projeto depender do estilo de outro.
    // Mesma decisão e mesmo motivo que no `.prettierignore`.
    'referencias/template-editorial/**',
    'scratch/**',
    '.kilo/worktrees/**',
    '.agents/skills/**',
  ]),

  // --- Regras base (JS, TS, React, a11y, imports) ------------------------
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat['recommended-latest'] ??
    reactHooks.configs['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // O projeto versiona tipos pelas props em TSX; `react/prop-types`
      // por runtime é redundante (e gera ruído em todo componente).
      'react/prop-types': 'off',
    },
  },

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
    // relatório e `process` é a API disponível. Os .mjs de scripts usam
    // anotações de tipo que o `import/named` não analisa, então a regra
    // gera falso positivo; o tsc/node verifica a exportação de verdade.
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      'import/named': 'off',
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
