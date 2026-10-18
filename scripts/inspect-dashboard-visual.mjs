/**
 * @fileoverview Script de inspeção visual automatizada do Dashboard Operacional (Spec 0020).
 * Executa navegador real (Chromium) contra o runner local validado (porta 3100),
 * admitindo o acesso via harness sem expor tokens ou segredos, navegando pela autenticação
 * real (AAL2), capturando telas dos blocos, temas e responsividade para a conferência visual.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { importJWK, SignJWT } from 'jose';

const BASE_URL = 'http://127.0.0.1:3100';
const REAL_EMAIL = 'ana@exemplo.dev';
const REAL_PASSWORD = 'senha-de-teste-123';
const REAL_USER_ID = '11111111-1111-1111-1111-111111111111';
const SCREENSHOTS_DIR =
  'docs/reviews/evidence/2026-10-16-1805-0020-dashboard-operacional-aal2/screenshots';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(value) {
  const cleaned = value.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = 0;
  let accumulator = 0;
  const bytes = [];
  for (const char of cleaned) {
    const symbol = BASE32_CHARS.indexOf(char);
    if (symbol === -1) continue;
    accumulator = (accumulator << 5) | symbol;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes;
}

function totpCode(secret, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', Buffer.from(base32Decode(secret)))
    .update(message)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1_000_000).toString().padStart(6, '0');
}

async function runVisualInspection() {
  console.log('Iniciando conferência visual no runner local (porta 3100)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // 1. Gera admissão em memória pelo harness local (sem expor/logar token)
  const keys = JSON.parse(
    readFileSync('.wrangler/test-access-keys.json', 'utf8'),
  );
  const privateKey = await importJWK(keys.private, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    type: 'app',
    email: REAL_EMAIL,
    sub: REAL_USER_ID,
    iss: 'https://test-team.cloudflareaccess.com',
    aud: 'spec-0018-test-aud',
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'spec0018-rsa-key-01' })
    .sign(privateKey);

  await context.addCookies([
    { name: 'CF_Authorization', value: token, url: BASE_URL },
  ]);
  const page = await context.newPage();

  // 2. Navegação para login
  console.log('Navegando para /admin-dashboard/login...');
  await page.goto(`${BASE_URL}/admin-dashboard/login`);
  await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
  await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
  await page.getByRole('button', { name: /Entrar no Painel/i }).click();

  // 3. Desafio / Matrícula MFA
  await page.waitForURL(/\/admin-dashboard\/(mfa\/setup|mfa\/verify)/, {
    timeout: 30000,
  });
  const currentUrl = page.url();
  console.log(`URL pós-login: ${currentUrl}`);

  if (currentUrl.includes('/mfa/setup')) {
    console.log('Executando matrícula TOTP em /admin-dashboard/mfa/setup...');
    await page
      .getByRole('button', { name: /Iniciar configuração TOTP/i })
      .click();
    const secret = (await page.locator('code').textContent())?.trim() ?? '';
    await page.goto(`${BASE_URL}/admin-dashboard`);
    await page.waitForURL(/\/admin-dashboard\/mfa\/verify/, { timeout: 15000 });
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
  } else if (currentUrl.includes('/mfa/verify')) {
    console.log('Resolvendo desafio TOTP em /admin-dashboard/mfa/verify...');
    // Se caiu direto no verify e não temos o segredo em memória, executamos reset controlado via API administrativa
    // para matricular limpo nesta inspeção
    console.log('Solicitando reconfiguração limpa de TOTP para inspeção...');
    const { execSync } = await import('node:child_process');
    execSync(`node scripts/admin-reset-mfa.mjs ${REAL_USER_ID}`, {
      stdio: 'ignore',
    });
    await page.goto(`${BASE_URL}/admin-dashboard/login`);
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();
    await page.waitForURL(/\/admin-dashboard\/mfa\/setup/, { timeout: 15000 });
    await page
      .getByRole('button', { name: /Iniciar configuração TOTP/i })
      .click();
    const secret = (await page.locator('code').textContent())?.trim() ?? '';
    await page.goto(`${BASE_URL}/admin-dashboard`);
    await page.waitForURL(/\/admin-dashboard\/mfa\/verify/, { timeout: 15000 });
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
  }

  // 4. Chegada ao Dashboard Operacional
  await page.waitForURL(/\/admin-dashboard$/, { timeout: 15000 });
  console.log('Acesso concedido em AAL2 ao Dashboard Operacional!');

  // Aguarda carregamento completo
  await page.waitForSelector('h1, h2');
  await page.waitForTimeout(1000);

  // Captura 1: Desktop Tema Claro
  console.log('Capturando 01-dashboard-desktop-light.png...');
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/01-dashboard-desktop-light.png`,
    fullPage: true,
  });

  // Captura 2: Alternância de Tema (Tema Escuro)
  console.log('Alternando para Tema Escuro...');
  const themeBtn = page
    .getByRole('button', { name: /alternar tema|modo escuro|mudar tema/i })
    .or(
      page.locator(
        'button[aria-label*="tema" i], button[aria-label*="theme" i]',
      ),
    )
    .first();
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    console.log('Capturando 02-dashboard-desktop-dark.png...');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/02-dashboard-desktop-dark.png`,
      fullPage: true,
    });
    // Retorna ao tema claro
    await themeBtn.click();
    await page.waitForTimeout(500);
  }

  // Captura 3: Action Hub - Modal de Prévia Acessível
  console.log('Testando acionamento de prévia no Action Hub...');
  const previewBtn = page
    .getByRole('button', { name: /solicitar sessão de preview/i })
    .first();
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await page.waitForSelector('[role="dialog"]');
    console.log('Modal de prévia aberto com sucesso.');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/03-preview-modal-accessible.png`,
    });
    // Fecha modal com Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Captura 4: Paginação na Tabela de Ofertas
  console.log('Conferindo paginação na tabela de ofertas...');
  const nextOffersLink = page
    .locator('section[aria-labelledby="offers-heading"]')
    .getByRole('link', { name: /próxima/i });
  if (await nextOffersLink.isVisible()) {
    await nextOffersLink.click();
    await page.waitForTimeout(800);
    console.log('Capturando 04-offers-pagination.png...');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/04-offers-pagination.png`,
      fullPage: true,
    });
    const prevOffersLink = page
      .locator('section[aria-labelledby="offers-heading"]')
      .getByRole('link', { name: /anterior/i });
    if (await prevOffersLink.isVisible()) await prevOffersLink.click();
  }

  // Captura 5: Atualização de Diagnósticos sob demanda
  console.log('Testando atualização de diagnósticos de saúde...');
  const refreshBtn = page.getByRole('button', {
    name: /atualizar diagnósticos/i,
  });
  if (await refreshBtn.isVisible()) {
    await refreshBtn.click();
    await page.waitForTimeout(500);
    console.log('Capturando 05-health-refresh-state.png...');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/05-health-refresh-state.png`,
    });
  }

  // Captura 6: Responsividade Mobile (375px)
  console.log('Conferindo responsividade mobile (375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  console.log('Capturando 06-dashboard-mobile-375px.png...');
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/06-dashboard-mobile-375px.png`,
    fullPage: true,
  });

  await browser.close();
  console.log('Conferência visual concluída com sucesso!');
}

runVisualInspection().catch((err) => {
  console.error('Erro na inspeção visual:', err);
  process.exit(1);
});
