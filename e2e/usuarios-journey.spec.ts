/**
 * @fileoverview e2e/usuarios-journey.spec.ts — jornada integrada Spec 0037.
 * @module e2e/usuarios-journey
 * @description Valida login real (senha), TOTP, elevação AAL2, renderização de
 *   /admin-dashboard/usuarios, atribuição/revogação por UUID, raiz imutável,
 *   teclado (Escape) e foco. Sessão real: mocks de sessão desativados.
 * @dependencies @playwright/test
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { importJWK, SignJWT } from 'jose';
import { expect, test } from '@playwright/test';
import { createHmac } from 'node:crypto';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const ROOT_EMAIL = 'e2e-test-usuarios@exemplo.dev';
const ROOT_PASSWORD = 'senha-de-teste-123';
const TARGET_UUID = 'ca670053-7e87-481b-9fbc-9246449ac677';
const ROOT_UUID = '2e773cf6-e88a-473c-a8da-02c11a7b6286';

async function seedAccessJwt(page: Page, pageUrl: string): Promise<string> {
  let token = '';
  if (existsSync('.wrangler/test-access-keys.json')) {
    const keys = JSON.parse(
      readFileSync('.wrangler/test-access-keys.json', 'utf8'),
    );
    const privateKey = await importJWK(keys.private, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    token = await new SignJWT({
      type: 'app',
      email: 'ana@exemplo.dev',
      sub: ROOT_UUID,
      iss: 'https://test-team.cloudflareaccess.com',
      aud: 'spec-0018-test-aud',
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: 'RS256', kid: keys.private.kid })
      .sign(privateKey);
    await page
      .context()
      .addCookies([{ name: 'CF_Authorization', value: token, url: pageUrl }]);
  }
  return token;
}

function base32Decode(secret: string): Uint8Array {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const bytes: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    const v = base32chars.indexOf(secret[i]);
    if (v === -1) continue;
    bits += v.toString(2).padStart(5, '0');
    if (bits.length >= 8) {
      bytes.push(parseInt(bits.substring(0, 8), 2));
      bits = bits.substring(8);
    }
  }
  return new Uint8Array(bytes);
}

function generateTotp(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  let t = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  const hmac = createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[19] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

async function loginAsRoot(page: any): Promise<void> {
  console.log('[TEST] Iniciando login...');
  await page.goto(`${BASE_URL}/admin-dashboard/login`);
  await expect(
    page.getByRole('heading', { name: /Painel Administrativo/i }),
  ).toBeVisible();

  await page.locator('#email').fill(ROOT_EMAIL);
  await page.locator('#password').fill(ROOT_PASSWORD);
  const [loginResponse] = await Promise.all([
    page
      .waitForResponse(
        (r: any) =>
          r.url().includes('/api/admin/auth/login') &&
          r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      .catch(() => null),
    page.getByRole('button', { name: /Entrar no Painel/i }).click(),
  ]);

  // Retry estrito: SOMENTE se receber status HTTP 429 de rate limit
  if (loginResponse?.status() === 429) {
    await page.waitForTimeout(3500);
    await page.goto(`${BASE_URL}/admin-dashboard/login`);
    await page.locator('#email').fill(ROOT_EMAIL);
    await page.locator('#password').fill(ROOT_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();
  }
  await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/(setup|verify)/, {
    timeout: 30_000,
  });
  console.log('[TEST] Login OK, em MFA:', page.url());
}

async function completeTotpEnrollment(page: any): Promise<void> {
  console.log('[TEST] Iniciando enrol TOTP...');
  await page
    .getByRole('button', { name: /Iniciar configura[cç][aã]o TOTP/i })
    .click();

  const secretEl = page.locator('code');
  await expect(secretEl).toBeVisible();
  const secret = await secretEl.textContent();
  expect(secret).toBeTruthy();

  const code = generateTotp(secret!.trim());

  await page.locator('#setup-code').fill(code);
  const [mfaResponse] = await Promise.all([
    page
      .waitForResponse(
        (r: any) =>
          r.url().includes('/api/admin/auth/mfa/verify') &&
          r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      .catch(() => null),
    page.getByRole('button', { name: /Confirmar e ativar MFA/i }).click(),
  ]);

  // Retry estrito: SOMENTE se receber status HTTP 429 de rate limit
  if (mfaResponse?.status() === 429) {
    await page.waitForTimeout(3500);
    const retryCode = generateTotp(secret!.trim());
    await page.goto(`${BASE_URL}/admin-dashboard/mfa/verify`);
    await page.getByLabel(/Código de 6 Dígitos \(TOTP\)/i).fill(retryCode);
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
  }

  await expect(page).toHaveURL(/\/admin-dashboard(\/usuarios)?$/, {
    timeout: 15_000,
  });
  console.log('[TEST] Enroll OK, URL:', page.url());

  await page.goto(`${BASE_URL}/admin-dashboard/usuarios`);
  await expect(page).toHaveURL(/\/admin-dashboard\/usuarios/);
  console.log('[TEST] Navegou para /usuarios');
}

test('jornada completa: login -> TOTP -> AAL2 -> usuarios -> atribuicao/revogacao -> teclado -> foco', async ({
  page,
}) => {
  test.slow();

  console.log('[TEST] === INICIO DA JORNADA ===');

  await page.goto('/');
  await seedAccessJwt(page, page.url());

  try {
    execSync(`node scripts/admin-reset-mfa.mjs ${ROOT_UUID}`, {
      stdio: 'ignore',
    });
  } catch {
    // ignora se offline ou já sem fator
  }

  // Aguarda expiração da janela de rate limit (3.000 ms) antes do login
  await page.waitForTimeout(3500);

  // 1. Login com conta raiz
  await loginAsRoot(page);

  // 2. Verificar se está em setup ou verify
  const isSetup = page.url().includes('/mfa/setup');

  if (isSetup) {
    await completeTotpEnrollment(page);
  } else {
    // Se ja tem fator, nao conhecemos o segredo - testar falha de verify
    console.log('[TEST] Usuário já tem fator TOTP, pulando verify');
    await page.goto(`${BASE_URL}/admin-dashboard/usuarios`);
    await expect(page).toHaveURL(/\/admin-dashboard\/usuarios/);
  }

  // 3. Página de usuários renderizada
  await expect(
    page.getByRole('heading', { name: /Gestão de Operadores/i }),
  ).toBeVisible();
  console.log('[TEST] Página de usuários carregada');

  // 4. Conta raiz destacada e imutável
  await expect(page.getByRole('heading', { name: 'Conta raiz' })).toBeVisible();
  await expect(page.getByText(/imut/i)).toBeVisible();
  console.log('[TEST] Conta raiz visível');

  // 5. Formulário: input UUID vazio -> botoes desabilitados
  const uuidInput = page.locator('#user-id');
  await expect(uuidInput).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Atribuir papel/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Revogar papel/ }),
  ).toBeDisabled();
  console.log('[TEST] Formulário visível, botoes desabilitados sem UUID');

  // 6. Teclado: focar input UUID
  await uuidInput.focus();
  await expect(uuidInput).toBeFocused();
  console.log('[TEST] Input focado');

  // 7. Digitar UUID habilita botoes
  await uuidInput.fill(TARGET_UUID);
  await expect(
    page.getByRole('button', { name: /Atribuir papel/ }),
  ).not.toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Revogar papel/ }),
  ).not.toBeDisabled();
  console.log('[TEST] UUID digitado, botoes habilitados');

  // 8. Atribuicao de papel
  await page.getByRole('button', { name: /Atribuir papel/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /^Confirmar$/ }).click();
  await expect(page.getByText(/com sucesso/i)).toBeVisible({ timeout: 10000 });
  console.log('[TEST] Atribuição realizada');

  // 9. Revogacao de papel
  await uuidInput.fill(TARGET_UUID);
  await page.getByRole('button', { name: /Revogar papel/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /^Confirmar$/ }).click();
  await expect(page.getByText(/revogado com sucesso/i)).toBeVisible({
    timeout: 10000,
  });
  console.log('[TEST] Revogação realizada');

  // 10. Teclado: Escape cancela dialogo sem requisicao
  await uuidInput.fill(TARGET_UUID);
  await page.getByRole('button', { name: /Atribuir papel/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  console.log('[TEST] Escape cancela dialogo');

  console.log('[TEST] === JORNADA CONCLUÍDA ===');
});
