import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('md-0002 Tarefa 8 - Acessibilidade (axe)', () => {
  const PREVIEW_TOKEN =
    process.env.SUPABASE_PREVIEW_TOKEN || 'senha-de-teste-123';

  test.use({ storageState: { cookies: [], origins: [] } });

  test('AC-12: Página de rascunho com sessão de preview não tem violations', async ({
    page,
  }) => {
    await page.goto(
      `/api/preview?token=${PREVIEW_TOKEN}&slug=fixture-rascunho`,
    );

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
