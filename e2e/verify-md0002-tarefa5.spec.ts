/**
 * @fileoverview Evidência do artigo, do JSON-LD e do sitemap em md-0002 — AC-05..AC-10, AC-13.
 * @module e2e/verify-md0002-tarefa5
 * @description O eixo é o fixture malicioso: HTML hostil digitado no CMS tem de sair como dado
 *   renderizado, sem executar, mantendo o JSON-LD válido. Completa com 404 para rascunho,
 *   agendado e inexistente, canonical/sitemap só com conteúdo público e seção de fontes que
 *   some quando não há fontes.
 * @dependencies @playwright/test, fixtures `fixture-malicioso`, `fixture-publicado`,
 *   `fixture-rascunho`, `fixture-agendado`, `fixture-sem-fontes` do seed.
 */
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
    expect(json['@type']).toBe('Article');
    expect(json.datePublished).toBeTruthy();
    expect(json.author).toBeTruthy();
    expect(json.image).toBeTruthy();
    await expect(page.locator('article strong')).toHaveText('seguro');
    await expect(page.locator('article table')).toBeVisible();
    // O JSON-LD carrega a string crua escapada: o dado continua fiel para o buscador, e o
    // marcador deixa de ser marcador dentro da tag <script>.
    expect(json.headline).toContain('</script><script>');
    // Duas provas de que nada executou: a global que um script do payload criaria não existe,
    // e o <article> não tem <script> filho nenhum.
    expect(await page.evaluate(() => '__injected' in globalThis)).toBe(false);
    await expect(page.locator('article script')).toHaveCount(0);
  });
  // Mesmo status para inexistente, rascunho e agendado: respostas diferentes revelariam que o
  // rascunho existe — enumeração de conteúdo não publicado é vazamento, não detalhe.
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
    // Excluir rascunho, agendado e rota de exemplo do sitemap é o que impede o Google de
    // indexar conteúdo que ainda não foi publicado.
    expect(xml).toContain('/artigos/fixture-publicado');
    expect(xml).not.toContain('fixture-rascunho');
    expect(xml).not.toContain('fixture-agendado');
    expect(xml).not.toContain('/exemplo');
  });
  test('md-0002/AC-13: fontes aparecem somente quando presentes', async ({
    page,
  }) => {
    await page.goto('/artigos/fixture-publicado');
    // Seção só quando há fontes citadas: sem isso, o artigo ficaria com cabeçalho órfão.
    await expect(
      page.getByRole('heading', { name: 'Fontes', exact: true }),
    ).toBeVisible();
    await page.goto('/artigos/fixture-sem-fontes');
    await expect(
      page.getByRole('heading', { name: 'Fontes', exact: true }),
    ).toHaveCount(0);
  });
});
