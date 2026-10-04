import { expect, test } from '@playwright/test';

/**
 * e2e/home.spec.ts — a página inicial funciona de verdade
 *
 * Diferença para o Vitest: aqui o app sobe de verdade, com bundle, hidratação e
 * servidor. É o que pega erro que unit test não vê — por isso o teste é sobre
 * comportamento observável, e não sobre detalhe de implementação.
 *
 * O servidor é iniciado pelo próprio Playwright (ver `webServer` em
 * playwright.config.ts). `pnpm test:e2e` não pede que você suba nada antes.
 */
test.describe('página inicial', () => {
  test('carrega o título principal', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toBeVisible();
  });

  test('navega para a página de exemplo e volta', async ({ page }) => {
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

  test('alterna o tema', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /tema (claro|escuro)/i });
    await expect(toggle).toBeVisible();

    // O ícone só é renderizado no browser (o servidor não sabe o tema), então
    // ele aparecer é a prova de que o React já hidratou. Sem essa espera, o
    // clique pode cair antes da hidratação e não ter efeito — que é a causa
    // mais comum de teste de tema falhar só de vez em quando.
    await expect(toggle.locator('svg')).toBeVisible();

    const antes = await page.locator('html').getAttribute('class');
    await toggle.click();

    // A classe do <html> é o contrato entre o next-themes e o Tailwind: sem
    // verificar o atributo, o teste passaria mesmo com o CSS quebrado.
    await expect(page.locator('html')).not.toHaveClass(antes ?? '');
  });

  test('responde 200 na sonda de saúde', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('ok');
  });

  test('devolve 404 com conteúdo útil em URL inexistente', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible();
  });
});
