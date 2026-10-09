/**
 * @fileoverview Testes E2E do painel administrativo contra build de produção.
 * @module e2e/admin-panel
 * @description Valida cabeçalhos HTTP, rate limiting, acessibilidade e proteção de rotas no
 *   servidor real (next start + TLS). Roda com E2E_PRODUCTION=1. Os fluxos autenticados de
 *   MFA/logout/integração vivem em e2e/admin-dashboard.spec.ts.
 * @dependencies @playwright/test, @axe-core/playwright, specs 0007 (admin/AC-01..14).
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ADMIN_BASE = '/admin-dashboard';
const LOGIN_URL = `${ADMIN_BASE}/login`;

test.describe('Painel Administrativo — Cabeçalhos HTTP e Proteção', () => {
  test('rota protegida anônima redireciona para login (admin/AC-01)', async ({
    page,
  }) => {
    // Usa request direto para não seguir redirects automaticamente
    const response = await page.request.get(`${ADMIN_BASE}`, {
      maxRedirects: 0,
    });
    const status = response.status();
    const location = response.headers()['location'] || '';

    // Redirect clássico 3xx com Location...
    if (status >= 300 && status < 400) {
      expect(location).toContain('/admin-dashboard/login');
      return;
    }

    // ...ou, no Next 16 com streaming, o redirect sai como template NEXT_REDIRECT
    // no corpo com status 200 (o browser navega para login; a rede não leva 3xx).
    expect(status).toBe(200);
    const body = await response.text();
    expect(body).toContain('NEXT_REDIRECT');
    expect(body).toContain('/admin-dashboard/login');
  });

  test('página de login acessível anonimamente (200)', async ({ page }) => {
    const response = await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
  });

  test('cabeçalhos de proteção em rota protegida (admin/AC-11)', async ({
    page,
  }) => {
    // Navega para rota protegida (redireciona para login) e verifica headers da resposta final
    const response = await page.goto(ADMIN_BASE, { waitUntil: 'networkidle' });
    const headers = response?.headers() ?? {};

    expect(headers['cache-control']).toContain('no-store');
    expect(headers['x-robots-tag']).toContain('noindex');
    expect(headers['x-robots-tag']).toContain('nofollow');
  });

  test('robots.ts bloqueia /admin-dashboard/', async ({ page }) => {
    const response = await page.goto('/robots.txt', {
      waitUntil: 'networkidle',
    });
    const text = await response?.text();
    expect(text).toContain('Disallow: /admin-dashboard/');
  });

  test('cabeçalhos de proteção em todas as rotas /admin-dashboard/* (admin/AC-11)', async ({
    page,
  }) => {
    for (const path of [
      '/admin-dashboard/login',
      '/admin-dashboard/mfa/setup',
      '/admin-dashboard/mfa/verify',
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), `rota ${path}`).toBeLessThan(500);
      const headers = response.headers();
      expect(headers['cache-control'], `rota ${path}`).toContain('no-store');
      expect(headers['x-robots-tag'], `rota ${path}`).toContain('noindex');
      expect(headers['x-robots-tag'], `rota ${path}`).toContain('nofollow');
    }
  });
});

test.describe('Painel Administrativo — Login: Validação de Origem, Rate Limit e Redirect', () => {
  test('POST login com Origin inválido retorna 403 (admin/AC-05)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const response = await page.request.post(
      `${ADMIN_BASE}/../api/admin/auth/login`,
      {
        data: {
          email: 'test@test.com',
          password: 'wrong',
          redirectTo: ADMIN_BASE,
        },
        headers: { Origin: 'https://evil.com' },
        maxRedirects: 0, // Não seguir redirects para ver o status real
      },
    );

    expect(response.status()).toBe(403);
  });

  test('POST login com redirect externo é sanitizado para /admin-dashboard (admin/AC-05)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const response = await page.request.post(
      `${ADMIN_BASE}/../api/admin/auth/login`,
      {
        data: {
          email: 'test@test.com',
          password: 'wrong',
          redirectTo: 'https://evil.com',
        },
        headers: { Origin: 'https://localhost:3100' },
        maxRedirects: 0,
      },
    );

    // Login falha (credenciais inválidas) -> redirect 303 para login com error=invalid_credentials
    // Mas o redirectTo externo deve ser sanitizado no location
    expect(response.status()).toBe(303);
    const location = response.headers()['location'] || '';
    expect(location).not.toContain('evil.com');
    expect(location).toContain('/admin-dashboard/login');
  });

  test('POST login com prefixo colidente /admin-dashboard-falso é rejeitado (admin/AC-05)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const response = await page.request.post(
      `${ADMIN_BASE}/../api/admin/auth/login`,
      {
        data: {
          email: 'test@test.com',
          password: 'wrong',
          redirectTo: '/admin-dashboard-falso',
        },
        headers: { Origin: 'https://localhost:3100' },
        maxRedirects: 0,
      },
    );

    expect(response.status()).toBe(303);
    const location = response.headers()['location'] || '';
    expect(location).not.toContain('/admin-dashboard-falso');
    expect(location).toContain('/admin-dashboard/login');
  });

  test('rate limiting: múltiplos POSTs de login falhos retornam redirect com error=rate_limited (admin/AC-05)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    let rateLimited = false;
    for (let i = 0; i < 10; i++) {
      const response = await page.request.post(
        `${ADMIN_BASE}/../api/admin/auth/login`,
        {
          data: {
            email: 'test@test.com',
            password: 'wrong',
            redirectTo: ADMIN_BASE,
          },
          headers: { Origin: 'https://localhost:3100' },
          maxRedirects: 0,
        },
      );

      // Cliente JSON: rate limit vira 429 (HTTP). Form: redirect 303 com error=rate_limited.
      if (response.status() === 429) {
        rateLimited = true;
        break;
      }
      if (response.status() === 303) {
        const location = response.headers()['location'] || '';
        if (location.includes('rate_limited')) {
          rateLimited = true;
          break;
        }
      }
    }

    expect(rateLimited).toBeTruthy();
  });
});

test.describe('Painel Administrativo — API direta e Logout (AC-03, AC-12)', () => {
  test('API admin direta sem sessão retorna 401 (admin/AC-03)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const response = await page.request.post('/api/admin/preview', {
      data: { slug: '' },
      headers: { Origin: 'https://localhost:3100' },
      maxRedirects: 0,
    });

    // Guarda assertAdminApiAuth: sem sessão autenticada o endpoint é blindado antes da lógica.
    expect(response.status()).toBe(401);
  });

  test('POST logout com Origin inválido retorna 403 (admin/AC-12)', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const response = await page.request.post(
      `${ADMIN_BASE}/../api/admin/auth/logout`,
      {
        headers: { Origin: 'https://evil.com' },
        maxRedirects: 0,
      },
    );

    expect(response.status()).toBe(403);
  });
});

test.describe('Painel Administrativo — Acessibilidade WCAG AA (admin/AC-13)', () => {
  test('página de login sem violações WCAG 2.1 AA', async ({ page }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('navegação por teclado: formulário de login focável e submissível', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    // Foca diretamente no email (ordem de tab pode variar por skip links)
    await page.locator('input[type="email"]').focus();
    const emailFocused = await page
      .locator('input[type="email"]')
      .evaluate((el) => el === document.activeElement);
    expect(emailFocused).toBeTruthy();

    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(LOGIN_URL);
  });
});
