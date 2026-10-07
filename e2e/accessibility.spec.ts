/**
 * @fileoverview Varredura de acessibilidade com axe-core nas páginas públicas.
 * @module e2e/accessibility
 * @description Roda axe no browser real (via `@axe-core/playwright`) sobre a home e um artigo
 *   publicado, exigindo zero violações nas tags wcag2a/2aa/21a/21aa. Uma violação aqui é
 *   regressão de acessibilidade, não sugestão de melhoria — é o critério que impede que a
 *   página "fique feia para quem não enxerga" sem ninguém perceber.
 * @dependencies @axe-core/playwright, @playwright/test, fixture `fixture-publicado` do seed.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Acessibilidade', () => {
  test('página inicial', async ({ page }) => {
    await page.goto('/');
    // `networkidle` antes de analisar: o axe tem de enxergar o DOM já hidratado, senão os
    // componentes montados no cliente ficam fora da varredura e a página "passa" vazia.
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Lista vazia é o contrato: aceitar "só violações leves" abriria negociação para cada
    // regressão individual.
    expect(results.violations).toEqual([]);
  });

  test('artigo publicado', async ({ page }) => {
    await page.goto('/artigos/fixture-publicado');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
