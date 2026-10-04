/**
 * e2e/global-setup.ts
 *
 * Preparação única da suíte: aquece o servidor e, se o projeto definir
 * `storageState`, captura cookies/storage iniciais. Não faz login.
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
