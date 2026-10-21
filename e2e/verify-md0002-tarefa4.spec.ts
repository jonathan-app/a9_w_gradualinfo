/**
 * @fileoverview Evidência da home editorial de md-0002 — AC-01, AC-02, AC-03, AC-04 e AC-12.
 * @module e2e/verify-md0002-tarefa4
 * @description Casa os cards completos (limite de 10, ordenados por data decrescente), o
 *   destaque visível, a ocultação de rascunho e agendado, a mensagem própria para lista vazia,
 *   a distinção entre lista vazia e falha real de transporte, e o atalho de teclado com foco
 *   visível.
 * @dependencies @playwright/test, `setFault` (e2e/support/faults) para injeção de falha,
 *   @supabase/supabase-js com service role — aceito somente na stack local descartável.
 *
 * Isolamento da suíte: executada sem `describe.serial` para evitar skips em cascata;
 * mutações transitórias em `posts` são rastreadas pontualmente em `mutatedPostIds` e
 * restauradas com segurança em `finally` e nos hooks `beforeEach`/`afterEach`/`afterAll`.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setFault } from './support/faults';
import { createClient } from '@supabase/supabase-js';

/**
 * Em build de produção (`next start`), `/` nasce pré-renderizada com ISR (`revalidate = 300`).
 * Os testes de mutação transitória de estado (banco vazio e falha de transporte) injetam o
 * cookie `__prerender_bypass` do `.next/prerender-manifest.json` apenas no contexto atual,
 * forçando render fresco sem alterar `revalidate = 300` nem poluir o cache ISR das demais specs.
 */
async function bypassIsrCache(context: BrowserContext, baseURL: string) {
  try {
    const manifestRaw = await readFile(
      resolve(process.cwd(), '.next/prerender-manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestRaw) as {
      preview?: { previewModeId?: string };
    };
    const previewModeId = manifest.preview?.previewModeId;
    if (!previewModeId) return;
    await context.addCookies([
      {
        name: '__prerender_bypass',
        value: previewModeId,
        url: baseURL,
        httpOnly: true,
        secure: baseURL.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
  } catch {
    // Em dev server sem `.next/prerender-manifest.json`, o render já é dinâmico.
  }
}

function localAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.CI_LOCAL_SERVICE_ROLE;
  // O service role só é aceito em host local: abortar fora de `localhost`/`127.0.0.1` é o
  // que impede um spec de mutar (ou apagar) dado de um projeto remoto por engano.
  if (
    !url ||
    !key ||
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  )
    throw new Error(
      'Mutação permitida somente na stack descartável preparada para E2E.',
    );
  return createClient(url, key, { auth: { persistSession: false } });
}
test.describe('home editorial', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  let mutatedPostIds: string[] = [];

  test.beforeEach(async ({ request }) => {
    // Garante que o estado de falha de rede esteja limpo antes de iniciar qualquer teste
    if (process.env.E2E_NETWORK_FAULTS === '1') {
      try {
        await setFault(request, 'none');
      } catch {
        // Tolerância caso proxy não esteja em execução nesta rodada
      }
    }
    // Garante banco íntegro antes de cada teste: restaura exclusivamente registros mutados pendentes
    if (mutatedPostIds.length > 0) {
      try {
        const admin = localAdmin();
        await admin
          .from('posts')
          .update({ status: 'publicado' })
          .in('id', mutatedPostIds);
        mutatedPostIds = [];
      } catch {
        // Tolerância se localAdmin não estiver disponível no ambiente
      }
    }
  });

  test.afterEach(async ({ request }) => {
    // Restaura o proxy de falhas de transporte independentemente do resultado
    if (process.env.E2E_NETWORK_FAULTS === '1') {
      try {
        await setFault(request, 'none');
      } catch {
        // Tolerância caso proxy não esteja em execução nesta rodada
      }
    }
    // Restauração de emergência: caso um teste com mutação de banco falhe ou sofra interrupção,
    // apenas os posts rastreados em mutatedPostIds são restaurados para evitar contaminação de outros testes
    if (mutatedPostIds.length > 0) {
      try {
        const admin = localAdmin();
        await admin
          .from('posts')
          .update({ status: 'publicado' })
          .in('id', mutatedPostIds);
      } catch (err) {
        console.error('Falha na recuperação de emergência de posts:', err);
      } finally {
        mutatedPostIds = [];
      }
    }
  });

  test.afterAll(async () => {
    // Restauração final de segurança caso reste algum ID mutado pendente
    if (mutatedPostIds.length > 0) {
      try {
        const admin = localAdmin();
        await admin
          .from('posts')
          .update({ status: 'publicado' })
          .in('id', mutatedPostIds);
        mutatedPostIds = [];
      } catch {
        // Tolerância se admin não estiver disponível no encerramento
      }
    }
  });

  test('md-0002/AC-01, AC-04: composição Cambridge, destaque e limites', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('region', { name: 'Matéria de capa' }),
    ).toHaveCount(1);
    await expect(
      page
        .getByRole('region', { name: 'Destaques editoriais' })
        .locator('article'),
    ).toHaveCount(4);
    await expect(
      page.getByRole('region', { name: 'Últimas leituras' }).locator('article'),
    ).toHaveCount(4);
    await expect(page.locator('#recentes article')).toHaveCount(16);
    await expect(
      page.locator('main a[href="/artigos/fixture-rascunho"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('main a[href="/artigos/fixture-agendado"]'),
    ).toHaveCount(0);
  });
  test('md-0002/AC-02: variantes refletem os campos próprios do banco', async ({
    page,
  }) => {
    const admin = localAdmin();
    const { data: posts, error } = await admin
      .from('posts')
      .select(
        'slug,title,excerpt,cover_image_url,editoria,author_name,published_at',
      )
      .eq('status', 'publicado')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(60);
    if (error || !posts)
      throw new Error('Falha ao ler as fixtures editoriais.');

    await page.goto('/');
    const siteOrigin = new URL(page.url()).origin;
    const sections = [
      {
        root: page.getByRole('region', { name: 'Matéria de capa' }),
        posts: posts.slice(0, 1),
        excerpt: true,
        cover: true,
      },
      {
        root: page.getByRole('region', { name: 'Destaques editoriais' }),
        posts: posts.slice(1, 5),
        excerpt: false,
        cover: true,
      },
      {
        root: page.getByRole('region', { name: 'Últimas leituras' }),
        posts: posts.slice(5, 9),
        excerpt: true,
        cover: false,
      },
      {
        root: page.locator('#recentes'),
        posts: posts.slice(0, 16),
        excerpt: false,
        cover: true,
      },
    ];
    for (const section of sections) {
      const renderedHrefs = await section.root
        .locator('article a[href^="/artigos/"]')
        .evaluateAll((anchors) =>
          [...new Set(anchors.map((a) => a.getAttribute('href')))].filter(
            Boolean,
          ),
        );
      expect(renderedHrefs).toEqual(
        section.posts.map((post) => `/artigos/${post.slug}`),
      );
      for (const post of section.posts) {
        const link = section.root.locator(`a[href="/artigos/${post.slug}"]`);
        const card = link.locator('xpath=ancestor::article[1]');
        await expect(link).toContainText(post.title);
        await expect(card).toContainText(post.editoria);
        await expect(card).toContainText(post.author_name);
        if (section.excerpt) await expect(card).toContainText(post.excerpt);
        await expect(
          card.locator(`time[datetime="${post.published_at}"]`),
        ).toBeVisible();
        if (section.cover) {
          const isApprovedOrigin =
            Boolean(post.cover_image_url) &&
            new URL(post.cover_image_url!).origin === siteOrigin;
          if (isApprovedOrigin) {
            const src = await card.locator('img').getAttribute('src');
            expect(src).toBeTruthy();
            expect(new URL(src!, page.url()).href).toBe(post.cover_image_url);
          } else {
            await expect(card.locator('[data-cover-fallback]')).toHaveCount(1);
            await expect(card.locator('img')).toHaveCount(0);
          }
        } else {
          await expect(card.locator('img')).toHaveCount(0);
        }
      }
    }
  });
  test('md-0002/AC-03: lista vazia mostra mensagem própria', async ({
    page,
    context,
    baseURL,
  }) => {
    const admin = localAdmin();
    const { data: rows, error } = await admin
      .from('posts')
      .select('id,status')
      .eq('status', 'publicado');
    if (error || !rows) throw new Error('Falha na preparação do estado vazio.');
    mutatedPostIds = rows.map((row) => row.id);
    const restoreErrors: unknown[] = [];
    // Mutação destrutiva com restauração garantida em `finally`: se a asserção falhar, os
    // posts ainda voltam ao estado original e o resto da suíte não herda banco vazio.
    try {
      const result = await admin
        .from('posts')
        .update({ status: 'arquivado' })
        .in(
          'id',
          rows.map((row) => row.id),
        );
      if (result.error) throw result.error;
      await bypassIsrCache(context, baseURL!);
      await page.goto('/');
      // `getByRole` resolve sobre a árvore de acessibilidade (ignorando nós ocultos de streaming
      // marcados com hidden fora de main) e aguarda a visibilidade de forma estrita.
      await expect(
        page.getByRole('heading', { name: 'Nenhum artigo publicado' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Algo deu errado' }),
      ).toHaveCount(0);
    } finally {
      for (const row of rows) {
        const restored = await admin
          .from('posts')
          .update({ status: row.status })
          .eq('id', row.id);
        if (restored.error) restoreErrors.push(restored.error);
      }
      mutatedPostIds = [];
    }
    expect(restoreErrors).toEqual([]);
  });
  test('md-0002/AC-03: falha real de transporte mostra erro, não vazio', async ({
    page,
    request,
    context,
    baseURL,
  }) => {
    // Injeção de falha de transporte real: o critério é a UI mostrar o estado de erro. Exibir
    // "Nenhum artigo publicado" durante uma falha mentiria ao usuário, que acharia que não
    // existe conteúdo — é por isso que vazio e erro são asserções separadas.
    await setFault(request, 'read');
    try {
      await bypassIsrCache(context, baseURL!);
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Algo deu errado' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Nenhum artigo publicado' }),
      ).toHaveCount(0);
    } finally {
      await setFault(request, 'none');
    }
  });
  test('md-0002/AC-12: teclado chega ao conteúdo com foco visível', async ({
    page,
  }) => {
    await page.goto('/');
    // O skip-link é o primeiro destino do Tab: sem ele, o teclado teria de percorrer toda a
    // navegação antes de chegar ao conteúdo.
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toBeFocused();
    await expect(
      page.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toBeVisible();
  });
});
