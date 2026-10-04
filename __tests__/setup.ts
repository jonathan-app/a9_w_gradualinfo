import '@testing-library/jest-dom/vitest';

/**
 * __tests__/setup.ts — roda antes de CADA arquivo de teste
 *
 * Registrado em `setupFiles` no vitest.config.mts. O que entra aqui tem que ser
 * verdade para todos os testes: matcher do jest-dom, limpeza de DOM e, no
 * futuro, mock global de rede.
 *
 * Por que `import '@testing-library/jest-dom/vitest'`
 * A entrada `/vitest` registra os matcher já extendidos para o objeto `expect`
 * do Vitest. O import simples (`@testing-library/jest-dom`) traz os matcher do
 * Jest, e o resultado é um erro confuso de tipo no meio do teste.
 */
