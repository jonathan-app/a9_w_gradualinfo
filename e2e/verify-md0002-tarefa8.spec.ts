import { test, expect } from '@playwright/test';

test.describe('md-0002 Tarefa 8 - Preview HTTP', () => {
  const PREVIEW_TOKEN =
    process.env.SUPABASE_PREVIEW_TOKEN || 'senha-de-teste-123';

  test.use({ storageState: { cookies: [], origins: [] } });

  test('AC-08: Rascunho responde 404 sem sessão', async ({ page }) => {
    const response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(404);

    await expect(page.locator('text=Página não encontrada')).toBeVisible();
  });

  test('AC-08: Configuração ausente falha fechada com 401', async ({
    request,
  }) => {
    const response = await request.get(`/api/preview`);
    expect(response.status()).toBe(401);
  });

  test('AC-08: Token inválido falha com 401', async ({ request }) => {
    const response = await request.get(`/api/preview?token=invalido`);
    expect(response.status()).toBe(401);
  });

  test('AC-08: Com sessão de preview válida, rascunho responde 200', async ({
    page,
  }) => {
    const response = await page.goto(
      `/api/preview?token=${PREVIEW_TOKEN}&slug=fixture-rascunho`,
    );

    expect(response?.status()).toBe(200);

    await expect(page.locator('h1')).toContainText('Rascunho a Caminho');

    const robots = await page
      .locator('meta[name="robots"]')
      .getAttribute('content');
    expect(robots).toContain('noindex');
  });

  test('AC-08: Logout limpa a sessão e falha fechada em erro', async ({
    page,
  }) => {
    await page.goto(`/api/preview?token=${PREVIEW_TOKEN}`);

    let response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(200);

    await page.goto('/api/preview/logout');

    response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(404);
  });

  test('AC-08: Sessão expirada retorna 404 para rascunho', async ({
    page,
    context,
  }) => {
    await page.goto(`/api/preview?token=${PREVIEW_TOKEN}&slug=fixture-rascunho`);

    let response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(200);

    await context.clearCookies();

    response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(404);
  });

  test('AC-08: Logout remove cookies e bloqueia rascunho', async ({ page }) => {
    await page.goto(`/api/preview?token=${PREVIEW_TOKEN}`);

    let response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(200);

    await page.goto('/api/preview/logout');

    response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(404);
  });
});
