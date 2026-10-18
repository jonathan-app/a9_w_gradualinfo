/**
 * @fileoverview Navegação editorial em servidor local isolado.
 * @module playwright.editorial.config
 * @description Não usa credenciais nem acessa a produção.
 * @dependencies Playwright, scripts/dev-editorial.mjs.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/editorial-local',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3200', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node scripts/dev-editorial.mjs --port 3200',
    url: 'http://127.0.0.1:3200',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
