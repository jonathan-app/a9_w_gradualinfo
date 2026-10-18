/**
 * @fileoverview Regressão de navegação dos seis rascunhos locais.
 * @module e2e/editorial-local/reading
 * @description Confere capas, âncoras, largura e compartilhamento sem serviços remotos.
 * @dependencies Playwright, catálogo local.
 */
import { test, expect } from '@playwright/test';
import records from '../../lib/editorial/local-posts.json';

for (const post of records) {
  test(`leitura: ${post.slug}`, async ({ page }) => {
    const response = await page.goto(`/artigos/${post.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      post.title,
    );
    await expect(page.locator('.article-hero img')).toBeVisible();
    await expect
      .poll(
        async () =>
          await page
            .locator('.article-hero img')
            .evaluate(
              (image: HTMLImageElement) =>
                image.complete && image.naturalWidth > 0,
            ),
      )
      .toBe(true);
    const links = page
      .getByRole('navigation', { name: 'Sumário do artigo' })
      .locator('a');
    for (const link of await links.all()) {
      const href = await link.getAttribute('href');
      await expect(page.locator(href!)).toHaveCount(1);
    }
    await links.first().click();
    await expect(page).toHaveURL(/#sec-/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Copiar link', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      /Link copiado|Selecione e copie/,
    );
    await page.screenshot({
      path: test.info().outputPath('artigo.png'),
      fullPage: true,
    });
  });
}

test('home local e slug inexistente', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Prévia local', { exact: true })).toBeVisible();
  const response = await page.goto('/artigos/nao-existe');
  expect(response?.status()).toBe(404);
});
