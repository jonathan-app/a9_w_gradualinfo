/**
 * @fileoverview Finalização única da suíte E2E — roda uma vez, depois do último teste.
 * @module e2e/global-teardown
 * @description Hoje só registra conclusão. Limpeza de dados externos (banco da stack local,
 *   por exemplo) entraria aqui — não nos specs, que têm de poder rodar isolados.
 * @dependencies @playwright/test (FullConfig).
 *
 * O `console` neste arquivo é permitido: o ESLint desliga `no-console` para `e2e/**`, porque
 * nele a saída é o relatório do runner, não log de produto.
 */

import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Teardown global concluído');
}

export default globalTeardown;
