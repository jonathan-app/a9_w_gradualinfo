/**
 * @fileoverview Evidência do AC-12 (acessibilidade) do contrato md-0002 — axe em três páginas.
 * @module e2e/verify-md0002-acessibilidade
 * @description Varredura sem filtro de tags sobre rascunho com sessão de preview, artigo
 *   publicado e home: zero violações é critério de aceite numerado, não meta. O rascunho entra
 *   porque é a página que só existe para quem tem sessão — a superfície menos testada é a que
 *   costuma esquecer a11y.
 * @dependencies @axe-core/playwright, `loginPreview` (e2e/support/preview), fixtures do seed.
 *
 * `storageState` zerado no describe: cada teste parte sem cookies, senão a sessão de preview
 * aberta por um teste vazaria para o seguinte e o rascunho apareceria como se fosse público.
 */
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
