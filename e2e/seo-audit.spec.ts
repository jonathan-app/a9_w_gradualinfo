/**
 * @fileoverview Auditoria de indexação em runtime — seo/AC-02 a seo/AC-06 (camada e2e).
 * @module e2e/seo-audit
 * @description Consulta robots.txt, o índice e os filhos do sitemap num servidor real e
 *   valida os dados estruturados da home e do artigo publicado; o orçamento numérico de
 *   Core Web Vitals fica no gate `lighthouserc.cjs`.
 * @dependencies @playwright/test, fixtures públicas do seed.
 */
import { test, expect, type Page } from '@playwright/test';

/** Bloco JSON-LD no formato em que os testes o consomem. */
type JsonLdBlock = Record<string, unknown>;

/** Coleta e interpreta todos os blocos JSON-LD da página corrente. */
async function jsonLdBlocks(page: Page): Promise<JsonLdBlock[]> {
  const raws = await page
    .locator('script[type="application/ld+json"]')
    .allInnerTexts();
  return raws.map((raw) => JSON.parse(raw) as JsonLdBlock);
}

/** Extrai os `<loc>` de um documento XML do sitemap. */
function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]!);
}

test.describe('auditoria de indexação', () => {
  test('robots.txt aponta o sitemap e mantém API e painel fora', async ({
    request,
    baseURL,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
    expect(body).toContain('/api/');
    expect(body).toContain('/admin-dashboard/');
  });

  test('sitemap em índice cobre os publicados e ignora os não públicos', async ({
    request,
    baseURL,
  }) => {
    const index = await request.get('/sitemap.xml');
    expect(index.status()).toBe(200);
    const indexXml = await index.text();
    expect(indexXml).toContain('<sitemapindex');
    expect(indexXml).toContain(`<loc>${baseURL}/sitemap/geral.xml</loc>`);

    // Todo filho responde um urlset; a união não repete URL nenhuma.
    const urls: string[] = [];
    for (const child of locs(indexXml)) {
      const response = await request.get(child);
      expect(response.status()).toBe(200);
      const xml = await response.text();
      expect(xml).toContain('<urlset');
      urls.push(...locs(xml));
    }
    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls).size).toBe(urls.length);

    const all = urls.join(' ');
    expect(all).toContain(`${baseURL}/artigos/fixture-publicado`);
    expect(all).not.toContain('fixture-rascunho');
    expect(all).not.toContain('fixture-agendado');
    expect(all).not.toContain('fixture-arquivado');
  });

  test('home emite WebSite com SearchAction e Organization com logo absoluto', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/');
    const blocks = await jsonLdBlocks(page);

    const website = blocks.find((block) => block['@type'] === 'WebSite');
    expect(website).toBeTruthy();
    const websiteJson = JSON.stringify(website);
    expect(websiteJson).toContain(`"url":"${baseURL}/"`);
    expect(websiteJson).toContain('"inLanguage":"pt-BR"');
    expect(websiteJson).toContain('/busca?q={search_term_string}');

    const organization = blocks.find(
      (block) => block['@type'] === 'Organization',
    );
    expect(organization).toBeTruthy();
    const organizationJson = JSON.stringify(organization);
    expect(organizationJson).toContain('"name":"Gradualinfo"');
    expect(organizationJson).toContain(`"logo":"${baseURL}/icon.png"`);
    expect(organizationJson).toContain('"description"');
  });

  test('artigo publicado emite Article completo e BreadcrumbList de dois itens', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/artigos/fixture-publicado');
    const blocks = await jsonLdBlocks(page);

    const article = blocks.find((block) => block['@type'] === 'Article');
    expect(article).toBeTruthy();
    const articleJson = JSON.stringify(article);
    expect(articleJson).toContain('"headline"');
    expect(articleJson).toContain(
      `"url":"${baseURL}/artigos/fixture-publicado"`,
    );
    expect(articleJson).toContain('"mainEntityOfPage"');
    expect(articleJson).toContain('"publisher"');
    expect(articleJson).toContain('"width":1200');
    expect(articleJson).toContain('"height":630');

    const breadcrumb = blocks.find(
      (block) => block['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumb).toBeTruthy();
    const breadcrumbJson = JSON.stringify(breadcrumb);
    expect(breadcrumbJson).toContain('"position":1');
    expect(breadcrumbJson).toContain('"position":2');
    expect(breadcrumbJson).toContain('Início');
  });
});
