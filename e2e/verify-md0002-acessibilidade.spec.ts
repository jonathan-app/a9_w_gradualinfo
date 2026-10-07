import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginPreview } from './support/preview';

test.describe('md-0002 Tarefa 8 - Acessibilidade (axe)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AC-12: Página de rascunho com sessão de preview não tem violations', async ({
    page,
  }) => {
    await loginPreview(page);
    await page.goto('/artigos/fixture-rascunho');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('AC-12: Página de artigo publicado não tem violations', async ({
    page,
  }) => {
    await page.goto('/artigos/fixture-publicado');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('AC-12: Página inicial não tem violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
