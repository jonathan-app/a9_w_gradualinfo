import { expect, type Page } from '@playwright/test';
export async function loginPreview(page: Page) {
  const token = process.env.SUPABASE_PREVIEW_TOKEN;
  if (!token) throw new Error('Configure as fixtures locais de preview.');
  await page.goto('/preview');
  await page.getByLabel('Segredo de entrada').fill(token);
  await page.getByRole('button', { name: 'Entrar no preview' }).click();
  await expect(page).toHaveURL(/\/$/);
}
export async function logoutPreview(page: Page) {
  await page.goto('/preview');
  await page.getByRole('button', { name: 'Encerrar preview' }).click();
}
