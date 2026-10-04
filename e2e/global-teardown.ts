/**
 * e2e/global-teardown.ts
 *
 * Roda uma vez ao fim da suíte. Hoje só registra conclusão; limpeza de dados
 * externos (banco remoto, por exemplo) entraria aqui.
 */

import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Teardown global concluído');
}

export default globalTeardown;
