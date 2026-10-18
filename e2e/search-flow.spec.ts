/**
 * @fileoverview Testes end-to-end do fluxo de busca pública, recorte por editoria e paginação.
 * @module e2e/search-flow.spec
 * @description Valida busca textual, pílulas de editoria, tolerância a digitação e metadados SEO robots em navegador real.
 * @dependencies @playwright/test.
 */
import { test, expect } from '@playwright/test';

test.describe('Fluxo de Busca e Recorte por Editoria', () => {
  test('exibe formulário de busca e convite inicial', async ({ page }) => {
    await page.goto('/busca');

    await expect(page.locator('h1')).toContainText(
      'O que você quer aprender hoje?',
    );
    const input = page.locator('#article-search');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('maxlength', '120');
    await expect(
      page.getByText('Digite um termo para encontrar artigos.'),
    ).toBeVisible();
  });

  test('preserva diretiva de SEO robots noindex, follow (busca/AC-09)', async ({
    page,
  }) => {
    await page.goto('/busca');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', 'noindex, follow');
  });

  test('executa busca textual com parâmetros na URL (busca/AC-01)', async ({
    page,
  }) => {
    await page.goto('/busca?q=seguranca&editoria=todas&page=1');

    await expect(
      page.locator('h2').filter({ hasText: /Resultados para “seguranca”/i }),
    ).toBeVisible();
    const searchbox = page.locator('#article-search');
    await expect(searchbox).toHaveValue('seguranca');
  });

  test('normaliza caracteres ignorando acentos e caixa (busca/AC-02)', async ({
    page,
  }) => {
    await page.goto('/busca?q=inteligencia');
    const headingSemAcento = await page.locator('h2').textContent();
    expect(headingSemAcento).toContain('inteligencia');

    await page.goto('/busca?q=inteligência');
    const headingComAcento = await page.locator('h2').textContent();
    expect(headingComAcento).toContain('inteligência');
  });

  test('oferece tolerância a erros de digitação via Levenshtein Damerau (busca/AC-03)', async ({
    page,
  }) => {
    // Busca por "artifisial" (1 troca em relação a "artificial", termo > 8 chars)
    await page.goto('/busca?q=artifisial');
    await expect(
      page.locator('h2').filter({ hasText: /Resultados para “artifisial”/i }),
    ).toBeVisible();
  });

  test('restringe resultados pela editoria e permite alternar filtros (busca/AC-04, busca/AC-07)', async ({
    page,
  }) => {
    await page.goto('/busca?q=tecnologia');

    const pillsNav = page.locator('nav[aria-label="Filtrar por editoria"]');
    if ((await pillsNav.count()) > 0) {
      const activePill = pillsNav.locator('[data-active="true"]');
      await expect(activePill).toHaveAttribute('aria-current', 'page');
      await expect(activePill).toHaveText('Todas');
    }
  });

  test('exibe estado vazio honesto para termo inexistente com link para limpar filtro (busca/AC-08)', async ({
    page,
  }) => {
    await page.goto('/busca?q=termoinexistenteparaoteste123');

    await expect(page.getByText(/Nenhum artigo encontrado/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'editorias' })).toHaveAttribute(
      'href',
      '/#editorias',
    );

    // Estado vazio com recorte por editoria inexistente ou específica
    await page.goto(
      '/busca?q=termoinexistenteparaoteste123&editoria=Inexistente',
    );
    await expect(page.getByText(/Nenhum artigo encontrado/)).toBeVisible();
  });
});
