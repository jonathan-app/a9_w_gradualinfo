/**
 * e2e/critical-flows.spec.ts
 *
 * Fluxos críticos: as rotas e interações que, se quebrarem, o usuário percebe
 * na hora. Aqui não vai detalhe de estilo — só comportamento observável.
 */

import { expect, test } from '@playwright/test';

test.describe('Fluxos críticos', () => {
  test('home carrega com título e navegação', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ver página de exemplo' }),
    ).toBeVisible();
  });

  test('exemplo abre e volta para a home', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Ver página de exemplo' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Exemplo' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Voltar para o início' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toBeVisible();
  });

  test('alternância de tema altera a classe do html', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /tema (claro|escuro)/i });
    await expect(toggle.locator('svg')).toBeVisible();

    const antes = await page.locator('html').getAttribute('class');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(antes ?? '');
  });

  test('rota inexistente devolve 404 útil', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible();
  });

  test('sonda de saúde responde ok', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('ok');
  });
});
