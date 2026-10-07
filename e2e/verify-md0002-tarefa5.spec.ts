import { test, expect } from '@playwright/test';
test.describe('artigo, JSON-LD e sitemap, contrato md-0002', () => {
  test('md-0002/AC-05, AC-06, AC-09: HTML malicioso permanece dado', async ({
    page,
  }) => {
    const response = await page.goto('/artigos/fixture-malicioso');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const json = JSON.parse(
      await page.locator('script[type="application/ld+json"]').innerText(),
    );
    expect(json.headline).toContain('</script><script>');
    expect(await page.evaluate(() => '__injected' in globalThis)).toBe(false);
    await expect(page.locator('article script')).toHaveCount(0);
  });
  test('md-0002/AC-07: inexistente, rascunho e agendado devolvem 404', async ({
    page,
  }) => {
    for (const slug of ['absent-slug', 'fixture-rascunho', 'fixture-agendado'])
      expect((await page.goto(`/artigos/${slug}`))?.status()).toBe(404);
  });
  test('md-0002/AC-10: canonical e sitemap só incluem públicos', async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto('/artigos/fixture-publicado');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${baseURL}/artigos/fixture-publicado`,
    );
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('/artigos/fixture-publicado');
    expect(xml).not.toContain('fixture-rascunho');
    expect(xml).not.toContain('fixture-agendado');
    expect(xml).not.toContain('/exemplo');
  });
  test('md-0002/AC-13: fontes aparecem somente quando presentes', async ({
    page,
  }) => {
    await page.goto('/artigos/fixture-publicado');
    await expect(
      page.getByRole('heading', { name: 'Fontes', exact: true }),
    ).toBeVisible();
    await page.goto('/artigos/fixture-sem-fontes');
    await expect(
      page.getByRole('heading', { name: 'Fontes', exact: true }),
    ).toHaveCount(0);
  });
});
