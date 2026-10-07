/**
 * @fileoverview Testes end-to-end (Playwright) — browser real contra o site de verdade.
 * @module playwright.config
 * @description Diferença para o Vitest: aqui o teste roda com bundle, hidratação e servidor
 *   reais (Chromium). É mais lento e mais fiel — pega o que só quebra no navegador. É a
 *   camada complementar ao `vitest.config.mts`, com comando próprio: `pnpm test:e2e`.
 * @dependencies @playwright/test, `E2E_*` (porta, URL base, modo produção), webServer que sobe
 *   o app sozinho.
 */

import { defineConfig, devices } from '@playwright/test';

// 3100 em vez de 3000: não disputa com um dev server que já possa estar aberto, e é o host
// que `allowedDevOrigins` em next.config.ts aceita — sem essa lista o HMR é bloqueado durante
// o teste e a página abre sem nenhuma interação.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
// E2E_PRODUCTION=1 troca o dev server pela build real (scripts/e2e-server.mjs): é como a CI
// valida o pacote que de fato vai ser implantado, não o modo desenvolvimento.
const production = process.env.E2E_PRODUCTION === '1';

export default defineConfig({
  // Roda os arquivos .spec.ts da pasta e2e/.
  testDir: './e2e',

  // Sem isso, um teste que passa por acaso em rerun não é sinal de nada.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Worker único em CI e em produção: os specs mutam a stack local (banco incluído) e
  // paralelismo aqui causaria corrida de estado, não velocidade.
  workers: process.env.CI || production ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        [
          'json',
          {
            outputFile:
              process.env.E2E_RESULTS_FILE ?? 'test-results/results.json',
          },
        ],
      ]
    : [
        ['list'],
        [
          'json',
          {
            outputFile:
              process.env.E2E_RESULTS_FILE ?? 'test-results/results.json',
          },
        ],
      ],

  use: {
    baseURL,
    // A stack local de produção roda em https://localhost com certificado autoassinado:
    // sem ignorar isso, o navegador aborta a navegação antes do primeiro teste.
    ignoreHTTPSErrors: baseURL.startsWith('https://localhost:'),
    // Artefato de depuração só no caminho que falha: trace no primeiro retry e mídia apenas
    // na falha mantêm a investigação possível sem custar disco no passeio feliz.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Sobe o app antes do primeiro teste e derruba ao terminar.
  // `reuseExistingServer` evita subir dois servidores na máquina local.
  webServer: {
    command: production
      ? 'node scripts/e2e-server.mjs'
      : `pnpm dev --port ${PORT}`,
    url: baseURL,
    ignoreHTTPSErrors: baseURL.startsWith('https://localhost:'),
    reuseExistingServer: !process.env.CI && !production,
    timeout: 120_000,
  },
});
