// ============================================================================
// playwright.config.ts — testes end-to-end (Playwright)
// ============================================================================
//
// Diferença para o Vitest: aqui o teste roda contra o site de verdade, em um
// browser real (Chromium/Firefox/WebKit). É mais lento e mais fiel: pega o que
// só quebra no navegador (hidratação, foco, requisição real).
//
// `pnpm test:e2e` sobe o servidor sozinho (ver `webServer`).
// ============================================================================

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  // Roda os arquivos .spec.ts da pasta e2e/.
  testDir: './e2e',

  // Sem isso, um teste que passa por acaso em rerun não é sinal de nada.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Sobe o app antes do primeiro teste e derruba ao terminar.
  // `reuseExistingServer` evita subir dois servidores na máquina local.
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
