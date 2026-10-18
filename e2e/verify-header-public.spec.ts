/**
 * @fileoverview Verificação do cabeçalho público responsivo.
 * @module e2e/verify-header-public
 * @description Browser real (Chromium) em quatro viewports confirma que a marca, o menu
 *   desktop, o menu móvel, a navegação por teclado, o tema escuro e o destino da editoria
 *   funcionam como contrato. Diferença para o Vitest: aqui o app sobe inteiro, então o teste
 *   pega o que só quebra no navegador (colisão de layout, ordem de tabulação, classe do tema).
 * @dependencies @playwright/test, server em :3000 (webServer do playwright.config.ts).
 *
 * O server é iniciado pelo próprio Playwright (ver `webServer` em playwright.config.ts):
 * `pnpm test:e2e` não pede que você suba nada antes.
 */

import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 683 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

test.describe('cabeçalho público', () => {
  for (const vp of VIEWPORTS) {
    test(` marca e links em ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      await expect(
        page.getByRole('link', { name: /Gradualinfo, início/i }),
      ).toBeVisible();
      // Em telas pequenas o link de Recentes só aparece no painel do menu
      if (vp.width >= 1024) {
        await expect(
          page.getByRole('link', { name: 'Recentes' }),
        ).toBeVisible();
      } else {
        // Em telas pequenas o <summary> se revela como `group: Menu` na árvore de
        // acessibilidade, mas o próprio role não existe no DOM. O seletor por
        // tag é o estável: o clique nele toggleia o `<details>`.
        const trigger = page.locator('summary');
        await trigger.click();
        await expect(
          page.getByRole('link', { name: 'Recentes' }),
        ).toBeVisible();
        await trigger.click();
      }
    });
  }

  test('menu desktop aparece e o móvel some acima de 1024px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'HOME' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Artigos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recentes' })).toBeVisible();
    // O link de login/área administrativa não existe mais no menu público
    await expect(
      page.getByRole('link', { name: /Área administrativa|Login/i }),
    ).toHaveCount(0);
    // O trigger do menu móvel está no DOM mas ocultado pelo CSS (display none)
    await expect(page.locator('summary')).toHaveCount(1);
  });

  test('menu móvel abre e fecha com o/details', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const trigger = page.locator('summary');
    await expect(trigger).toBeVisible();

    // Inicia fechado: os links do painel ainda não estão no accessible tree
    await expect(page.getByRole('link', { name: 'HOME' })).toHaveCount(0);

    // Abre o menu
    await trigger.click();
    await expect(page.getByRole('link', { name: 'HOME' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Artigos', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Recentes', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Área administrativa|Login/i }),
    ).toHaveCount(0);

    // Fecha ao clicar de novo
    await trigger.click();
    await expect(page.getByRole('link', { name: 'HOME' })).toHaveCount(0);
  });

  test('navegação por teclado alcança todos os links do cabeçalho', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // O primeiro Tab vai pro link de salto (skip link); o segundo, pro logo
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: /Pular para o conteúdo/i }),
    ).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: /Gradualinfo, início/i }),
    ).toBeFocused();

    // Avança até HOME, Artigos, Recentes, os controles de busca e o botão de tema
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'HOME' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Artigos' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Recentes' })).toBeFocused();

    // O formulário de busca interrompe a sequência: input, depois botão
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="search"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: /Pes artigos/i }),
    ).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: /tema (claro|escuro)/i }),
    ).toBeFocused();
  });

  test('o link de Recentes leva à seção da home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.getByRole('link', { name: 'Recentes' }).click();
    await expect(page).toHaveURL(/\/#recentes$/);
    await expect(page.locator('#recentes')).toBeVisible();
  });

  test('tema escuro é aplicado ao <html>', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /tema (claro|escuro)/i });
    await expect(toggle).toBeVisible();
    await expect(toggle.locator('svg')).toBeVisible();

    const antes = await page.locator('html').getAttribute('class');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(antes ?? '');

    // Restaura para não afetar testes seguintes
    await toggle.click();
  });

  test('a marca é um link de degraus, não texto plano', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 683 });
    await page.goto('/');

    const brand = page.getByRole('link', { name: /Gradualinfo, início/i });
    await expect(brand).toBeVisible();
    await expect(brand.locator('[class*="brandMark"] span')).toHaveCount(3);
  });

  test('a faixa abaixo do menu exibe mensagem de boas-vindas e letreiro de artigos', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(
      page.getByText(/Bem-vindo\(a\) ao Gradualinfo!/i).first(),
    ).toBeVisible();
    await expect(page.locator('.marquee-container')).toBeVisible();
    await expect(
      page.locator('.marquee-container a[href^="/artigos/"]'),
    ).not.toHaveCount(0);
    const articleLink = page
      .locator('.marquee-container a[href^="/artigos/"]')
      .first();
    const href = await articleLink.getAttribute('href');
    expect(href).toBeTruthy();
    await articleLink.click();
    await expect(page).toHaveURL(new URL(href!, page.url()).toString());
  });
});
