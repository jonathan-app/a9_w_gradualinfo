/**
 * @fileoverview Regressão da home Cambridge no modo editorial local.
 * @module e2e/editorial-local/home-cambridge
 * @description Verifica conteúdo real, links, âncoras e ausência de overflow.
 * @dependencies Playwright, catálogo local.
 */
import { test, expect } from '@playwright/test';
import records from '../../lib/editorial/local-posts.json';

for (const width of [320, 390, 768, 1280]) {
  for (const dark of [false, true]) {
    test(`home ${width}px ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(
        (enabled) => document.documentElement.classList.toggle('dark', enabled),
        dark,
      );
      await expect(
        page.getByRole('region', { name: 'Matéria de capa' }),
      ).toBeVisible();
      await expect(page.locator('#editorias')).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'Editorias na home' }),
      ).toHaveCount(0);
      for (const record of records) {
        await expect(
          page.locator(`a[href="/artigos/${record.slug}"]`).first(),
        ).toBeVisible();
      }
      const categories = new Set(records.map((post) => post.editoria));
      for (const name of categories) {
        await expect(page.locator(`text=${name}`).first()).toBeVisible();
      }
      if (width < 640) {
        await page.locator('summary').filter({ hasText: 'Menu' }).click();
        await page
          .getByRole('navigation', { name: 'Navegação para celular' })
          .getByRole('link', { name: 'Recentes' })
          .click();
      } else {
        await page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Recentes' })
          .click();
      }
      await expect(page).toHaveURL(/#(recentes|editorias)$/);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole('region', { name: 'Matéria de capa' })
        .getByRole('link')
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/artigos/${records[0]!.slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        records[0]!.title,
      );
    });
  }
}
