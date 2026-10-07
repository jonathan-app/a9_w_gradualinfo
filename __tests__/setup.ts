/**
 * @fileoverview Setup global do Vitest — roda antes de CADA arquivo de teste.
 * @module __tests__/setup
 * @description Registrado em `setupFiles` em `vitest.config.mts`. O que entra aqui tem que ser
 *   verdade para todos os testes: matcher do jest-dom, limpeza de DOM e, no futuro, mock
 *   global de rede. O que é específico de um suíte fica na própria suíte.
 * @dependencies @testing-library/jest-dom/vitest (matchers de DOM no `expect`).
 *
 * Por que o import `/vitest`: essa entrada registra os matchers já extendidos para o objeto
 * `expect` do Vitest. O import simples (`@testing-library/jest-dom`) traz os matchers do Jest,
 * e o resultado é um erro confuso de tipo no meio do teste.
 */
import '@testing-library/jest-dom/vitest';
