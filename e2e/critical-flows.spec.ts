/**
 * @fileoverview Fluxos críticos — o que, se quebrar, o usuário percebe na hora.
 * @module e2e/critical-flows
 * @description Navegação da home para o artigo, alternância de tema, 404 útil e sonda de
 *   saúde: só comportamento observável no browser real (bundle, hidratação e servidor de
 *   verdade), sem asserção sobre detalhe de implementação.
 * @dependencies @playwright/test, fixtures do seed (`fixture-publicado`).
 *
 * Os servidores vêm do `webServer` em playwright.config.ts — ver e2e/home.spec.ts para o
 * mesmo fluxo com comentários de hidratação.
 */

import { expect, test } from '@playwright/test';

test.describe('Fluxos críticos', () => {
  test('home carrega com título e navegação', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Início', exact: true }),
    ).toBeVisible();
  });

  test('artigo publicado abre a partir da home', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/artigos/fixture-publicado"]').first().click();
    // `getByRole` com nível e nome resolve para um único nó (a árvore de acessibilidade ignora
    // duplicatas transitórias do streaming do App Router), e o `toHaveText` aguarda a troca.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fixture publicado' }),
    ).toHaveText('Fixture publicado');
    await page.getByRole('link', { name: 'Início', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toContainText('Gradualinfo');
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
