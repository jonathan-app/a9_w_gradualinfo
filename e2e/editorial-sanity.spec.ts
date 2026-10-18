/**
 * @fileoverview Validação empírica E2E de rotas editoriais contra build de produção (spec 0006).
 * @module e2e/editorial-sanity
 * @description Testa o comportamento real de rede do servidor de produção (next start):
 *   comprova que slugs inexistentes e rascunhos sem preview respondem status HTTP 404 real na rede
 *   (e não HTTP 200 mascarado por streaming), além de headers Cache-Control no-store.
 * @dependencies @playwright/test.
 */

import { expect, test } from '@playwright/test';

test.describe('Rotas Editoriais — Comportamento de Rede e 404 Real no Servidor', () => {
  test('slug de artigo inexistente devolve status HTTP 404 real na rede', async ({
    page,
  }) => {
    const response = await page.goto(
      '/artigos/slug-artigo-inexistente-validacao-404',
      { waitUntil: 'networkidle' },
    );

    // Comprova empiricamente que o servidor não enviou 200 com HTML de erro via streaming
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible();
  });

  test('tentativa de acesso direto a rascunho sem preview devolve HTTP 404 real', async ({
    page,
  }) => {
    const response = await page.goto(
      '/artigos/drafts-artigo-rascunho-sem-preview',
      { waitUntil: 'networkidle' },
    );

    expect(response?.status()).toBe(404);
  });

  test('respostas de erro 404 emitem cabeçalho de cache no-store', async ({
    page,
  }) => {
    const response = await page.goto(
      '/artigos/slug-inexistente-verificacao-cache',
      { waitUntil: 'networkidle' },
    );

    expect(response?.status()).toBe(404);
    const cacheControl = response?.headers()['cache-control'] ?? '';
    // Next.js e Cloudflare exigem no-store em conteúdo não público
    expect(cacheControl).toContain('no-store');
  });

  test('home pública responde HTTP 200 com headers de segurança', async ({
    page,
  }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    const headers = response?.headers() ?? {};
    expect(headers['cache-control']).toContain('no-store');
  });
});
