import { test, expect } from '@playwright/test';
import { loginPreview, logoutPreview } from './support/preview';
import { issuePreviewGrant, PREVIEW_COOKIE } from '../lib/preview/session';
test.describe('preview em produção local', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('rascunho anônimo retorna HTTP 404', async ({ page }) => {
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  test('GET antigo não autentica e POST inválido falha', async ({
    request,
    baseURL,
  }) => {
    expect((await request.get('/api/preview?token=invalid')).status()).toBe(
      405,
    );
    expect(
      (
        await request.post('/api/preview', {
          headers: { Origin: baseURL! },
          form: { token: 'invalid' },
        })
      ).status(),
    ).toBe(401);
  });
  test('sessão válida lê rascunho, sem indexação e sem cache', async ({
    page,
  }) => {
    await loginPreview(page);
    const response = await page.goto('/artigos/fixture-rascunho');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['cache-control']).toContain('no-store');
    expect(response?.headers()['cache-control']).toContain('private');
    await expect(page.locator('h1')).toContainText('Fixture rascunho');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
  test('autorização vencida nega rascunho mantendo a sessão Supabase', async ({
    page,
    context,
  }) => {
    await loginPreview(page);
    const cookies = await context.cookies();
    const current = cookies.find((cookie) => cookie.name === PREVIEW_COOKIE)!;
    const payload = JSON.parse(
      Buffer.from(current.value.split('.')[0]!, 'base64url').toString('utf8'),
    );
    const expired = issuePreviewGrant(
      payload.sub,
      payload.session_id,
      process.env.SUPABASE_PREVIEW_TOKEN!,
      Date.now() - 1800_000,
    );
    await context.addCookies([{ ...current, value: expired }]);
    expect(
      (await context.cookies()).some((cookie) => cookie.name.startsWith('sb-')),
    ).toBe(true);
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  test('logout remove cookies e nega leitura', async ({ page, context }) => {
    await loginPreview(page);
    await logoutPreview(page);
    expect(
      (await context.cookies()).filter(
        (cookie) =>
          cookie.name === PREVIEW_COOKIE || cookie.name.startsWith('sb-'),
      ),
    ).toEqual([]);
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  test('cookies preservam HttpOnly, Secure e prazo em HTTPS', async ({
    page,
    context,
    baseURL,
  }) => {
    expect(baseURL).toMatch(/^https:/);
    await loginPreview(page);
    const cookies = (await context.cookies()).filter(
      (cookie) =>
        cookie.name === PREVIEW_COOKIE || cookie.name.startsWith('sb-'),
    );
    expect(cookies.length).toBeGreaterThan(1);
    for (const cookie of cookies) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe('Lax');
    }
  });
});
