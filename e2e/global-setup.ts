/**
 * @fileoverview Preparação única da suíte E2E — roda uma vez, antes do primeiro teste.
 * @module e2e/global-setup
 * @description Aquece o servidor (primeira requisição fora do teste, para o cold start não
 *   ser cobrado do primeiro spec) e, só se o projeto declarar `storageState`, grava o estado
 *   inicial do browser. Não faz login: autenticação é responsabilidade de cada spec ou do
 *   suporte em `e2e/support/`.
 * @dependencies @playwright/test (FullConfig), chromium.
 */

import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const projectUse = config.projects[0]?.use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(projectUse?.baseURL as string);
  await page.waitForLoadState('networkidle');

  // Só persiste estado quando o projeto declarar o caminho: sem isso, salvar
  // quebraria a suíte inteira num undefined.
  if (projectUse?.storageState) {
    await page
      .context()
      .storageState({ path: projectUse.storageState as string });
  }
  await browser.close();
}

export default globalSetup;
