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
 * `describe.serial`: o teste de estado vazio muta a tabela `posts` e restaura em `finally`;
 * séries paralelas leriam o banco no meio da mutação e reprovarian sem ser bug.
 */
import { test, expect } from '@playwright/test';
import { setFault } from './support/faults';
import { createClient } from '@supabase/supabase-js';
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
test.describe.serial('home editorial', () => {
  test('md-0002/AC-01, AC-02, AC-04: cards completos, destaque e limite', async ({
    page,
  }) => {
    await page.goto('/');
    const cards = page.locator('a[href^="/artigos/"]');
    expect(await cards.count()).toBeGreaterThan(0);
    // Limite de 10 por página: acima disso a home deixa de ser homepage e vira arquivo.
    expect(await cards.count()).toBe(10);
    // Ordenação conferida sobre os atributos <time>: mais novo primeiro é o contrato
    // editorial que o card em destaque também pressupõe.
    const dates = await page
      .locator('time[datetime]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('datetime')!),
      );
    expect(dates).toEqual([...dates].sort().reverse());
    await expect(
      page.locator('section[aria-label="Artigo em Destaque"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/artigos/fixture-rascunho"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('a[href="/artigos/fixture-agendado"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-slot="post-card-featured"] img'),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="post-card-featured"] time'),
    ).toBeVisible();
  });
  test('md-0002/AC-03: lista vazia mostra mensagem própria', async ({
    page,
  }) => {
    const admin = localAdmin();
    const { data: rows, error } = await admin
      .from('posts')
      .select('id,status')
      .eq('status', 'publicado');
    if (error || !rows) throw new Error('Falha na preparação do estado vazio.');
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
      await page.goto('/');
      await expect(page.getByText('Nenhum artigo publicado')).toBeVisible();
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
    }
    expect(restoreErrors).toEqual([]);
  });
  test('md-0002/AC-03: falha real de transporte mostra erro, não vazio', async ({
    page,
    request,
  }) => {
    // Injeção de falha de transporte real: o critério é a UI mostrar o estado de erro. Exibir
    // "Nenhum artigo publicado" durante uma falha mentiria ao usuário, que acharia que não
    // existe conteúdo — é por isso que vazio e erro são asserções separadas.
    await setFault(request, 'read');
    try {
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Algo deu errado' }),
      ).toBeVisible();
      await expect(page.getByText('Nenhum artigo publicado')).toHaveCount(0);
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
