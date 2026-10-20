/**
 * @fileoverview Evidência do artigo, do JSON-LD e do sitemap em md-0002 — AC-05..AC-10, AC-13.
 * @module e2e/verify-md0002-tarefa5
 * @description O eixo é o fixture malicioso: HTML hostil digitado no CMS tem de sair como dado
 *   renderizado, sem executar, mantendo o JSON-LD válido (agora entre os blocos do artigo).
 *   Completa com 404 para rascunho, agendado e inexistente, canonical só com conteúdo público
 *   e cobertura do sitemap em índice (o artigo público aparece num filho, nunca no índice nem
 *   para rascunho/agendado), e seção de fontes que some quando não há fontes.
 * @dependencies @playwright/test, fixtures `fixture-malicioso`, `fixture-publicado`,
 *   `fixture-rascunho`, `fixture-agendado`, `fixture-sem-fontes` do seed.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/** Bloco JSON-LD no formato em que o teste o consome. */
type JsonLdBlock = {
  '@type'?: string;
  headline?: string;
  datePublished?: string;
  author?: unknown;
  image?: unknown;
};

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

/** Cliente administrativo limitado à stack descartável usada pelo E2E. */
function localAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.CI_LOCAL_SERVICE_ROLE;
  if (
    !url ||
    !key ||
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  )
    throw new Error('Leitura administrativa permitida somente na stack local.');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Extrai pares loc/lastmod de um filho do sitemap. */
function sitemapEntries(xml: string) {
  return [
    ...xml.matchAll(
      /<url><loc>([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod><\/url>/g,
    ),
  ].map((match) => ({ loc: match[1]!, lastmod: match[2]! }));
}

test.describe('artigo, JSON-LD e sitemap, contrato md-0002', () => {
  test('md-0002/AC-05, AC-06, AC-09: HTML malicioso permanece dado', async ({
    page,
  }) => {
    const response = await page.goto('/artigos/fixture-malicioso');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const article = (await jsonLdBlocks(page)).find(
      (block) => block['@type'] === 'Article',
    );
    expect(article).toBeTruthy();
    expect(article?.datePublished).toBeTruthy();
    expect(article?.author).toBeTruthy();
    expect(article?.image).toBeTruthy();
    await expect(page.locator('article strong')).toHaveText('seguro');
    await expect(page.locator('article table')).toBeVisible();
    // O JSON-LD carrega a string crua escapada: o dado continua fiel para o buscador, e o
    // marcador deixa de ser marcador dentro da tag <script>.
    expect(article?.headline).toContain('</script><script>');
    // Duas provas de que nada executou: a global que um script do payload criaria não existe,
    // e o <article> não tem <script> filho nenhum.
    expect(await page.evaluate(() => '__injected' in globalThis)).toBe(false);
    await expect(page.locator('article script')).toHaveCount(0);
  });
  test('md-0002/AC-06: caminho Markdown não usa dangerouslySetInnerHTML', async () => {
    const editorialPath = resolve(process.cwd(), 'components/editorial');
    const pagePath = resolve(process.cwd(), 'app/artigos/[slug]/page.tsx');
    for (const file of await readdir(editorialPath))
      if (file.endsWith('.tsx'))
        expect(
          await readFile(resolve(editorialPath, file), 'utf8'),
        ).not.toContain('dangerouslySetInnerHTML');
    expect(await readFile(pagePath, 'utf8')).not.toContain(
      'dangerouslySetInnerHTML',
    );
    const jsonLd = await readFile(
      resolve(process.cwd(), 'components/shared/json-ld.tsx'),
      'utf8',
    );
    expect(jsonLd).toContain('dangerouslySetInnerHTML');
    expect(jsonLd).toContain('serializeJsonLd');
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
    // O índice lista os filhos (geral e um por editoria); o artigo público vive
    // num deles, e rascunho/agendado não aparecem em filho nenhum.
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const indexXml = await response.text();
    expect(indexXml).toContain('<sitemapindex');
    const urls: string[] = [];
    for (const child of locs(indexXml)) {
      const childResponse = await request.get(child);
      expect(childResponse.status()).toBe(200);
      urls.push(...locs(await childResponse.text()));
    }
    const all = urls.join(' ');
    // Excluir rascunho, agendado e rota de exemplo do sitemap é o que impede o Google de
    // indexar conteúdo que ainda não foi publicado.
    expect(all).toContain('/artigos/fixture-publicado');
    expect(all).not.toContain('fixture-rascunho');
    expect(all).not.toContain('fixture-agendado');
    expect(all).not.toContain('/exemplo');
  });
  test('md-0002/AC-10: sitemap preserva published_at em lastmod', async ({
    request,
  }) => {
    const { data: post, error } = await localAdmin()
      .from('posts')
      .select('slug,published_at')
      .eq('slug', 'fixture-publicado')
      .single();
    if (error || !post?.published_at)
      throw new Error('Fixture publicada sem data para comparar.');

    const indexXml = await (await request.get('/sitemap.xml')).text();
    const entries = [];
    for (const child of locs(indexXml))
      entries.push(...sitemapEntries(await (await request.get(child)).text()));
    expect(
      entries.find((entry) => entry.loc.endsWith(`/artigos/${post.slug}`)),
    ).toEqual({
      loc: expect.stringMatching(/^https?:\/\//),
      lastmod: post.published_at,
    });
  });
  test('md-0002/AC-13: fontes preservam dados e isolamento do Markdown', async ({
    page,
  }) => {
    await page.goto('/artigos/fixture-publicado');
    const sources = page.locator('section.article-sources');
    const sourceLink = sources.getByRole('link', {
      name: 'Documentação do Supabase',
    });
    await expect(sourceLink).toHaveAttribute(
      'href',
      'https://supabase.com/docs',
    );
    expect(new URL(await sourceLink.getAttribute('href')!)).toBeTruthy();
    await expect(page.locator('article.editorial-body')).not.toContainText(
      'Documentação do Supabase',
    );
    const order = await page.locator('.article-page').evaluate((root) => {
      const children = [...root.children];
      return {
        authorship: children.findIndex((node) =>
          node.querySelector('.article-author'),
        ),
        cover: children.findIndex((node) => node.matches('.article-hero')),
        body: children.findIndex((node) =>
          node.querySelector('article.editorial-body'),
        ),
        sources: children.findIndex((node) =>
          node.matches('section.article-sources'),
        ),
      };
    });
    expect(order.cover).toBeGreaterThan(order.authorship);
    expect(order.body).toBeGreaterThan(order.cover);
    expect(order.sources).toBeGreaterThan(order.body);
  });
  test('md-0002/AC-13: artigo sem fontes omite a seção', async ({ page }) => {
    await page.goto('/artigos/fixture-sem-fontes');
    await expect(
      page.getByRole('heading', { name: 'Fontes', exact: true }),
    ).toHaveCount(0);
  });
});
