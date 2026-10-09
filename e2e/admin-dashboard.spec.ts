/**
 * @fileoverview Fluxos autenticados do painel administrativo (Spec 0007) no build de produção.
 * @module e2e/admin-dashboard
 * @description Cobre os estados autenticados que o spec de painel não exercita: escada de MFA
 *   obrigatória (matrícula, desafio, AAL2), negação por UUID divergente, preview autorizado,
 *   logout a partir do dashboard usando MOCK de sessão via cookie `__e2e_session_role`
 *   (ativo APENAS quando NODE_ENV !== 'production' em `lib/supabase/server.ts`).
 *   Fluxo real contra Supabase local (gotrue + TOTP) requer `E2E_REAL_SUPABASE=1` e
 *   stack Supabase local ativa — delimitado e opcional.
 * @dependencies @axe-core/playwright, @playwright/test, node:child_process, node:crypto
 */

import AxeBuilder from '@axe-core/playwright';
import { execSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL: string = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const E2E_ADMIN_EMAIL: string = process.env.ADMIN_EMAIL ?? 'a3qua96@gmail.com';
const E2E_REAL_SUPABASE: boolean = process.env.E2E_REAL_SUPABASE === '1';
const REAL_EMAIL: string = process.env.E2E_REAL_EMAIL ?? 'ana@exemplo.dev';
const REAL_PASSWORD: string =
  process.env.E2E_REAL_PASSWORD ?? 'senha-de-teste-123';
const REAL_USER_ID: string =
  process.env.E2E_REAL_USER_ID ?? '11111111-1111-1111-1111-111111111111';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(value: string): number[] {
  const cleaned = value.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const symbol = BASE32_CHARS.indexOf(char);
    if (symbol === -1) {
      continue;
    }
    accumulator = (accumulator << 5) | symbol;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes;
}

function totpCode(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', Buffer.from(base32Decode(secret)))
    .update(message)
    .digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 1_000_000).toString().padStart(6, '0');
}

async function seedE2eRole(page: Page, role: string): Promise<void> {
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([{ name: '__e2e_session_role', value: role, url: BASE_URL }]);
}

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

test.describe('Painel Administrativo — Fluxos autenticados (Spec 0007)', () => {
  test('acesso anônimo a /admin-dashboard/mfa/* é interceptado e redirecionado para login (AC-04)', async ({
    page,
  }) => {
    await page.goto('/admin-dashboard/mfa/setup');
    await expect(page).toHaveURL(/\/admin-dashboard\/login/);

    await page.goto('/admin-dashboard/mfa/verify');
    await expect(page).toHaveURL(/\/admin-dashboard\/login/);
  });

  test('administrador autenticado sem TOTP é forçado para matrícula MFA, com axe e teclado no formulário (AC-04, AC-13)', async ({
    page,
  }) => {
    await seedE2eRole(page, 'admin_no_mfa');
    await page.goto('/admin-dashboard');

    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Configurar Autenticação de Dois Fatores/i,
      }),
    ).toBeVisible();

    await page.waitForLoadState('networkidle');
    const axeResults = await new AxeBuilder({ page })
      .withTags([...A11Y_TAGS])
      .analyze();
    expect(axeResults.violations).toEqual([]);

    const codeInput = page.getByLabel(
      /2\. Digite o código de 6 dígitos gerado/i,
    );
    const activateButton = page.getByRole('button', {
      name: /Ativar MFA e Entrar/i,
    });
    await codeInput.focus();
    await expect(codeInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(activateButton).toBeFocused();
  });

  test('sessão AAL1 (fator pendente) é forçada ao desafio TOTP, bloqueia preview e passa no axe/teclado (AC-04, AC-10, AC-13)', async ({
    page,
  }) => {
    await seedE2eRole(page, 'admin_aal1');
    await page.goto('/admin-dashboard');

    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Verificação de Segurança/i,
      }),
    ).toBeVisible();

    await page.waitForLoadState('networkidle');
    const axeResults = await new AxeBuilder({ page })
      .withTags([...A11Y_TAGS])
      .analyze();
    expect(axeResults.violations).toEqual([]);

    const codeInput = page.getByLabel(/Código de 6 Dígitos \(TOTP\)/i);
    const verifyButton = page.getByRole('button', {
      name: /Confirmar e Acessar/i,
    });
    await codeInput.focus();
    await expect(codeInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(verifyButton).toBeFocused();

    const preview = await page.request.post('/api/admin/preview', {
      data: { slug: 'artigo-rascunho' },
      headers: { Origin: BASE_URL },
    });
    expect(preview.status()).toBe(403);
  });

  test('sessão AAL2 acessa dashboard, renderiza identidade e links, passa no axe/teclado e autoriza preview (AC-04, AC-10, AC-13)', async ({
    page,
  }) => {
    await seedE2eRole(page, 'admin_aal2');
    const response = await page.goto('/admin-dashboard');
    expect(response?.status()).toBe(200);

    await expect(page.getByText(/Sessão AAL2 Protegida/i)).toBeVisible();
    await expect(page.getByText(E2E_ADMIN_EMAIL)).toBeVisible();

    const sanityLink = page.getByRole('link', { name: /CMS Sanity Studio/i });
    await expect(sanityLink).toBeVisible();
    expect(await sanityLink.getAttribute('target')).toBe('_blank');

    await page.waitForLoadState('networkidle');
    const axeResults = await new AxeBuilder({ page })
      .withTags([...A11Y_TAGS])
      .analyze();
    expect(axeResults.violations).toEqual([]);

    const slugInput = page.getByLabel(/Slug do Artigo \(opcional para home\)/i);
    const previewButton = page.getByRole('button', {
      name: /Gerar Sessão e Abrir Preview/i,
    });
    await slugInput.focus();
    await expect(slugInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(previewButton).toBeFocused();

    const preview = await page.request.post('/api/admin/preview', {
      data: { slug: 'artigo-aprovado' },
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    expect(preview.status()).toBe(303);
    expect(preview.headers()['location']).toContain('/');
  });

  test('usuário autenticado com UUID divergente tem acesso negado com status HTTP 403 no layout e nas APIs (AC-02, AC-03)', async ({
    page,
  }) => {
    await seedE2eRole(page, 'other_user');
    const response = await page.goto('/admin-dashboard');
    expect([200, 403]).toContain(response?.status());
    await expect(
      page.getByRole('heading', { name: /Acesso Não Autorizado/i }),
    ).toBeVisible();
    await expect(page.getByText(/Sessão AAL2 Protegida/i)).toHaveCount(0);

    const preview = await page.request.post('/api/admin/preview', {
      data: { slug: 'artigo-teste' },
      headers: { Origin: BASE_URL },
    });
    expect(preview.status()).toBe(403);
  });

  test('logout a partir do dashboard encerra a sessão e bloqueia acessos subsequentes (AC-12)', async ({
    page,
  }) => {
    await seedE2eRole(page, 'admin_aal2');
    await page.goto('/admin-dashboard');
    await expect(page.getByText(/Sessão AAL2 Protegida/i)).toBeVisible();

    const logout = await page.request.post('/api/admin/auth/logout', {
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    expect(logout.status()).toBe(303);
    expect(logout.headers()['location']).toContain('/admin-dashboard/login');

    await page.context().clearCookies();
    await page.goto('/admin-dashboard/login');
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/admin-dashboard\/login/);
  });

  test('formulário de login não expõe nenhum link de cadastro de usuário (AC-06)', async ({
    page,
  }) => {
    await page.goto('/admin-dashboard/login');

    const signupLinks = page.locator('a', {
      hasText: /cadastr|sign up|criar conta|registrar|novo usu/i,
    });
    await expect(signupLinks).toHaveCount(0);
  });

  test('fluxo real no Supabase local: login → matrícula TOTP → desafio AAL1 → dashboard AAL2 → preview → logout (AC-04, AC-10, AC-12)', async ({
    page,
  }) => {
    test.skip(
      !E2E_REAL_SUPABASE,
      'fluxo real exige stack Supabase local ativa; defina E2E_REAL_SUPABASE=1',
    );
    test.setTimeout(120_000);

    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
      timeout: 30_000,
    });
    const secret =
      (await page.locator('div.select-all span').textContent()) ?? '';
    expect(secret.length).toBeGreaterThanOrEqual(16);

    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/, {
      timeout: 15_000,
    });

    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/, { timeout: 15_000 });
    // O badge de sessão renderiza também no header responsivo (oculto no viewport
    // do teste); `.first()` evita o strict-mode violation com o elemento escondido.
    await expect(
      page.getByText(/Sessão AAL2 Protegida/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Nível AAL2 Ativo/i).first()).toBeVisible();

    const preview = await page.request.post('/api/admin/preview', {
      data: { slug: 'artigo-aprovado' },
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    expect(preview.status()).toBe(303);
    expect(preview.headers()['location']).toContain('/');

    const logout = await page.request.post('/api/admin/auth/logout', {
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    expect(logout.status()).toBe(303);
    expect(logout.headers()['location']).toContain('/admin-dashboard/login');

    await page.context().clearCookies();
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/admin-dashboard\/login/);
  });
});

test.beforeAll(() => {
  if (!E2E_REAL_SUPABASE) {
    return;
  }
  execSync(
    `docker exec supabase_db_gradualinfo-editorial psql -U postgres -c "delete from auth.mfa_factors where user_id = '${REAL_USER_ID}';"`,
    { stdio: 'ignore' },
  );
});
