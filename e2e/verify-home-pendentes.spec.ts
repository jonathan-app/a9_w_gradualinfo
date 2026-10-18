/**
 * @fileoverview Verificação empírica dos itens pendentes da home registrados nos
 * bastiões de 2026-10-13/14: grade de artigos recentes, clique na faixa animada
 * (trilho principal e trilho duplicado), cantos arredondados das capas e menu
 * público com busca.
 * @module e2e/verify-home-pendentes
 * @description Spec de verificação manual, bloqueada por `VERIFY_HOME_RUN=1`
 * para não interferir na suíte e2e padrão (a suíte assume outro conjunto de
 * dados). Grava screenshot e um log JSONL em `docs/reviews/evidence/` para que
 * cada PASS do relatório tenha prova observável, conforme o contrato do
 * `/check verify`. Espera o servidor de desenvolvimento em `E2E_PORT` (3100),
 * reutilizado pelo `playwright.config.ts`.
 * @dependencies @playwright/test, node:fs, node:path
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(
  process.env.VERIFY_HOME_EVIDENCE ??
    'docs/reviews/evidence/2026-10-16-2001-home-pendentes-verify',
);
const SHOTS = path.join(EVIDENCE_DIR, 'screenshots');

fs.mkdirSync(SHOTS, { recursive: true });

function observation(name: string, data: Record<string, unknown>): void {
  fs.appendFileSync(
    path.join(EVIDENCE_DIR, 'run-log.jsonl'),
    `${JSON.stringify({ name, at: new Date().toISOString(), ...data })}\n`,
  );
}

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage });
}

test.skip(
  process.env.VERIFY_HOME_RUN !== '1',
  'verificação empírica manual: defina VERIFY_HOME_RUN=1 para executar',
);

test.describe('home pendente 2026-10-13/14 (desktop 1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('AC-03/AC-04: grade de recentes tem até 16 itens, ordem decrescente, 4 colunas e nenhum título/contagem', async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.locator(
      '#recentes section[aria-label="Grade de artigos"]',
    );
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();

    const grid = section.locator('[class*="sectionGrid"]');
    const cards = grid.locator('article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(16);

    const dates = await cards.evaluateAll((nodes) =>
      nodes.map(
        (node) => node.querySelector('time')?.getAttribute('datetime') ?? '',
      ),
    );
    expect(dates).toHaveLength(count);
    for (const iso of dates) {
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    for (let index = 1; index < dates.length; index += 1) {
      expect(Date.parse(dates[index - 1]!)).toBeGreaterThanOrEqual(
        Date.parse(dates[index]!),
      );
    }

    await expect(
      section.locator('h2, [class*="sectionHeader"], [class*="count"]'),
    ).toHaveCount(0);

    const columns = await grid.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBe(4);

    await shot(page, 'ac-03-04-grade-desktop.png', true);
    observation('ac-03-04-grade-desktop', { count, columns, dates });
  });

  test('AC-05: link Recentes leva a /#recentes e rola até a seção', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Recentes', exact: true }).click();
    await page.waitForURL(/#recentes$/);
    const top = await page
      .locator('#recentes')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(400);
    await shot(page, 'ac-05-ancora-recentes.png');
    observation('ac-05-ancora-recentes', { top });
  });

  test('AC-01/AC-02: faixa animada abre o artigo no trilho principal e no trilho duplicado', async ({
    page,
  }) => {
    await page.goto('/');
    const rails = page.locator('.animate-marquee-scroll');
    await expect(rails).toHaveCount(2);

    const mainRail = rails.nth(0);
    const duplicateRail = rails.nth(1);
    await expect(duplicateRail).toHaveAttribute('aria-hidden', 'true');

    const mainLinks = mainRail.locator('a[href^="/artigos/"]');
    const duplicateLinks = duplicateRail.locator('a[href^="/artigos/"]');
    const mainCount = await mainLinks.count();
    expect(mainCount).toBeGreaterThan(0);
    expect(await duplicateLinks.count()).toBe(mainCount);
    await shot(page, 'ac-01-letreiro-desktop.png');

    const mainHref = await mainLinks.first().getAttribute('href');
    expect(mainHref).toBeTruthy();
    // O CSS pausa a animação no hover do container (globals.css);
    // sem o hover o clique nunca encontra o link estável.
    await page.locator('.marquee-container').hover();
    await mainLinks.first().click();
    await page.waitForURL((url) => url.pathname === mainHref, {
      timeout: 15000,
    });
    await expect(page.locator('h1').first()).toBeVisible();
    observation('ac-01-letreiro-principal', {
      href: mainHref,
      url: page.url(),
    });

    await page.goto('/');
    const duplicateHref = await duplicateLinks.first().getAttribute('href');
    expect(duplicateHref).toBeTruthy();
    await page.locator('.marquee-container').hover();
    await duplicateLinks.first().click();
    await page.waitForURL((url) => url.pathname === duplicateHref, {
      timeout: 15000,
    });
    await expect(page.locator('h1').first()).toBeVisible();
    await shot(page, 'ac-02-artigo-via-trilho-duplicado.png');
    observation('ac-02-letreiro-duplicado', {
      href: duplicateHref,
      url: page.url(),
    });
  });

  test('AC-06: capas da home aplicam raio de 0.9rem', async ({ page }) => {
    await page.goto('/');
    // `_cover__` é o contêiner do CSS module; `object-cover` dos <img> não
    // recebe o raio e por isso não entra na asserção.
    const covers = page.locator(
      'div[class*="_cover__"], div[class*="_heroCover__"]',
    );
    const count = await covers.count();
    expect(count).toBeGreaterThan(0);

    const radii = await covers.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).borderRadius),
    );
    for (const radius of radii) {
      expect(radius).toBe('14.4px');
    }
    const overflows = await covers.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).overflow),
    );
    for (const overflow of overflows) {
      expect(overflow).toBe('hidden');
    }

    await shot(page, 'ac-06-capas-desktop.png');
    observation('ac-06-capas', { count, radii });
  });

  test('AC-07: busca no menu encontra resultados sem acentos', async ({
    page,
  }) => {
    await page.goto('/');
    const input = page.locator('#header-search');
    await input.fill('tecnico');
    await input.press('Enter');
    await page.waitForURL(
      (url) =>
        url.pathname === '/busca' && url.searchParams.get('q') === 'tecnico',
    );

    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /resultados para/i })
        .first(),
    ).toBeVisible();
    const titles = await page.locator('h3 a').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.some((title) => /técnic/i.test(title))).toBe(true);

    await shot(page, 'ac-07-busca-desktop.png');
    observation('ac-07-busca-desktop', { titles: titles.slice(0, 4) });
  });

  test('AC-08: busca sem correspondência exibe estado vazio', async ({
    page,
  }) => {
    await page.goto('/busca?q=xyzzyqq');
    await expect(page.getByText('Nenhum artigo encontrado')).toBeVisible();
    await shot(page, 'ac-08-busca-vazio.png');
    observation('ac-08-busca-vazio', { url: page.url() });
  });

  test('AC-09: menu público não expõe entrada administrativa', async ({
    page,
  }) => {
    await page.goto('/');
    const adminLinks = await page.locator('header a[href*="admin"]').count();
    expect(adminLinks).toBe(0);
    observation('ac-09-sem-admin-desktop', { adminLinks });
  });
});

test.describe('home pendente 2026-10-13/14 (mobile 375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('AC-10: grade em celular mantém uma coluna e não gera rolagem horizontal', async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.locator(
      '#recentes section[aria-label="Grade de artigos"]',
    );
    await expect(section).toBeVisible();
    const grid = section.locator('[class*="sectionGrid"]');
    const columns = await grid.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBe(1);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await shot(page, 'ac-10-grade-mobile.png', true);
    observation('ac-10-grade-mobile', { columns, overflow });
  });

  test('AC-07 (mobile): ícone de busca abre /busca e o formulário funciona', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('header a[aria-label="Pes artigos"]').click();
    await page.waitForURL((url) => url.pathname === '/busca');

    // O header mantém o formulário desktop oculto no DOM; o campo da página
    // de busca é o único visível no mobile.
    const input = page.locator('main input[name="q"]');
    await input.fill('site lento');
    await input.press('Enter');
    await page.waitForURL(
      (url) =>
        url.pathname === '/busca' && url.searchParams.get('q') === 'site lento',
    );

    const titles = await page.locator('h3 a').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.some((title) => /lento/i.test(title))).toBe(true);

    await shot(page, 'ac-07-busca-mobile.png');
    observation('ac-07-busca-mobile', { titles: titles.slice(0, 4) });
  });

  test('AC-09 (mobile): menu não expõe entrada administrativa', async ({
    page,
  }) => {
    await page.goto('/');
    const summary = page.locator('header summary').first();
    if (await summary.isVisible()) {
      await summary.click();
    }
    const adminLinks = await page.locator('header a[href*="admin"]').count();
    expect(adminLinks).toBe(0);
    await shot(page, 'ac-09-menu-mobile-aberto.png');
    observation('ac-09-sem-admin-mobile', { adminLinks });
  });
});
