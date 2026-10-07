/**
 * @fileoverview Atalhos de entrada e saída do preview para os specs E2E.
 * @module e2e/support/preview
 * @description Preenche o formulário com o segredo do ambiente em vez de injetar o cookie à
 *   mão: o caminho testado é o mesmo que o usuário percorre, então o teste quebra se o
 *   formulário, o botão ou o redirecionamento mudarem. A espera pelo redirect para a home é a
 *   prova de que a sessão foi aceita.
 * @dependencies @playwright/test, `SUPABASE_PREVIEW_TOKEN` (fixture local, ver
 *   scripts/ci-fixtures.mjs).
 *
 * Falha cedo com mensagem clara quando o token não está no ambiente — sem isso o spec quebraria
 * com "locator not found" no meio do fluxo e a causa sumiria no relatório.
 */
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
