/**
 * e2e/accessibility.spec.ts
 *
 * Verifica acessibilidade das páginas públicas no navegador real com axe-core.
 * Uma violação wcag2a/2aa aqui é regressão de acessibilidade, não sugestão.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Acessibilidade', () => {
  test('página inicial', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('página de exemplo', async ({ page }) => {
    await page.goto('/exemplo');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
