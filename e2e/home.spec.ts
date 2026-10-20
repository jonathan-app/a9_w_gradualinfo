/**
 * @fileoverview A página inicial funciona de verdade — bundle, hidratação e servidor reais.
 * @module e2e/home
 * @description Diferença para o Vitest: aqui o app sobe inteiro, então o teste pega o que só
 *   quebra no navegador. Por isso a asserção é sobre comportamento observável (título,
 *   navegação, tema no atributo do `<html>`, status HTTP), nunca sobre detalhe de
 *   implementação.
 * @dependencies @playwright/test, fixture `fixture-publicado` do seed.
 *
 * O servidor é iniciado pelo próprio Playwright (ver `webServer` em playwright.config.ts):
 * `pnpm test:e2e` não pede que você suba nada antes.
 */
import { expect, test } from '@playwright/test';
test.describe('página inicial', () => {
  test('carrega o título principal', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Gradualinfo/i }),
    ).toBeVisible();
  });

  test('abre o artigo publicado pela navegação da home', async ({ page }) => {
    await page.goto('/');
    const firstArticleLink = page.locator('main a[href^="/artigos/"]').first();
    const href = await firstArticleLink.getAttribute('href');
    expect(href).toBeTruthy();
    await firstArticleLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('h1')).toBeVisible();
  });

  test('alterna o tema', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Tema claro' });
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
