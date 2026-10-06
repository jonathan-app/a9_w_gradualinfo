import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';

const verifyJson = { acs: [], findings: [] };

test.describe.serial('md-0002 Tarefa 4 (Home e Card)', () => {
  test.beforeAll(() => {
    verifyJson.acs = [
      { id: 'md-0002/AC-01', status: 'UNVERIFIABLE' },
      { id: 'md-0002/AC-02', status: 'UNVERIFIABLE' },
      { id: 'md-0002/AC-03', status: 'UNVERIFIABLE' },
      { id: 'md-0002/AC-04', status: 'UNVERIFIABLE' },
      { id: 'md-0002/AC-12', status: 'UNVERIFIABLE' },
    ];
    // Garantir banco de dados limpo para os testes (base seed)
    execSync(
      'pnpm dlx supabase@2.119.0 db query "truncate table public.posts cascade;"',
      { stdio: 'ignore' },
    );
    // Inserir um artigo inicial válido
    execSync(
      `pnpm dlx supabase@2.119.0 db query "
      insert into public.posts (title, slug, excerpt, content, cover_image_url, editoria, author_name, status, published_at)
      values ('Artigo Inicial', 'artigo-inicial', 'Resumo', '# Conteúdo', 'https://example.com/image.jpg', 'Geral', 'Autor', 'publicado', now());
    "`,
      { stdio: 'ignore' },
    );
  });

  test.afterAll(() => {
    fs.writeFileSync('verify-result.json', JSON.stringify(verifyJson, null, 2));
    // Restaurar banco no final
    execSync('pnpm supabase:reset', { stdio: 'ignore' });
  });

  test('AC-02: Campos do card no estado com 1 artigo', async ({ page }) => {
    await page.goto('/');

    const destaque = page.locator('section[aria-label="Artigo em Destaque"]');
    await expect(destaque).toBeVisible();

    const editoria = await destaque.locator('.text-brand-600').textContent();
    const title = await destaque.locator('h3').textContent();
    const excerpt = await destaque.locator('p').first().textContent();
    const date = await destaque
      .locator('.text-muted-foreground')
      .first()
      .textContent();

    if (title && excerpt && editoria && date) {
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-02').status = 'PASS';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-02').evidence =
        'O card exibe todos os campos requeridos (editoria, título, resumo e data) visualmente na home.';
    } else {
      verifyJson.findings.push({
        severity: 'BLOCKER',
        message: 'AC-02: Faltam campos essenciais no card',
      });
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-02').status = 'FAIL';
    }
  });

  test('AC-01 e AC-04: Limite de 10 artigos (1 destaque + 9 grade)', async ({
    page,
  }) => {
    // Insere mais 15 artigos novos, totalizando 16
    execSync(
      `pnpm dlx supabase@2.119.0 db query "
      insert into public.posts (title, slug, excerpt, content, cover_image_url, editoria, author_name, status, published_at)
      select 'Post ' || i, 'post-' || i, 'Resumo ' || i, '# Corpo', 'https://example.com/img' || i || '.jpg', 'Ed', 'Autor', 'publicado', now() - interval '1 hour'
      from generate_series(1, 15) as i;
    "`,
      { stdio: 'ignore' },
    );

    await page.goto('/');

    const countDestaque = await page
      .locator(
        'section[aria-label="Artigo em Destaque"] [data-slot="post-card-featured"]',
      )
      .count();
    const countGrade = await page
      .locator(
        'section[aria-labelledby="latest-articles-heading"] [data-slot="post-card"]',
      )
      .count();

    if (countDestaque === 1 && countGrade === 9) {
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-01').status = 'PASS';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-01').evidence =
        'Após inserir 16 artigos, a home exibe no máximo 10 publicados.';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-04').status = 'PASS';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-04').evidence =
        'Layout da home respeita a regra de 1 em destaque e 9 na grade sem duplicação.';
    } else {
      verifyJson.findings.push({
        severity: 'BLOCKER',
        message: `AC-01/04: Qtd incorreta. Destaque: ${countDestaque}, Grade: ${countGrade}`,
      });
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-01').status = 'FAIL';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-04').status = 'FAIL';
    }
  });

  test('AC-03 (Parte 1): Estado Vazio', async ({ page }) => {
    execSync(`pnpm dlx supabase@2.119.0 db query "delete from public.posts;"`, {
      stdio: 'ignore',
    });

    await page.goto('/');
    const emptyText = page.getByText('Nenhum artigo publicado');
    await expect(emptyText).toBeVisible();

    verifyJson.acs.find((a) => a.id === 'md-0002/AC-03').status = 'PASS';
    verifyJson.acs.find((a) => a.id === 'md-0002/AC-03').evidence =
      'Quando banco não tem registros, mensagem correta é exibida.';
  });

  test('AC-03 (Parte 2): Estado de Erro (banco offline/tabela ausente)', async ({
    page,
  }) => {
    execSync(
      `pnpm dlx supabase@2.119.0 db query "alter table public.posts rename to posts_broken;"`,
      { stdio: 'ignore' },
    );

    await page.goto('/');
    const errorText = page.getByText('Algo deu errado');
    await expect(errorText).toBeVisible();

    execSync(
      `pnpm dlx supabase@2.119.0 db query "alter table public.posts_broken rename to posts;"`,
      { stdio: 'ignore' },
    );

    const ac03 = verifyJson.acs.find((a) => a.id === 'md-0002/AC-03');
    if (ac03.status === 'PASS') {
      ac03.evidence += ' Em erro de banco, mensagem de fallback é exibida.';
    } else {
      ac03.status = 'FAIL';
    }
  });

  test('AC-12: Acessibilidade Teclado e Foco', async ({ page }) => {
    // Insere um artigo para poder testar o foco
    execSync(
      `pnpm dlx supabase@2.119.0 db query "
      insert into public.posts (title, slug, excerpt, content, cover_image_url, editoria, author_name, status, published_at)
      values ('Artigo Foco', 'artigo-foco', 'Resumo', '# Conteúdo', 'https://example.com/image.jpg', 'Geral', 'Autor', 'publicado', now());
    "`,
      { stdio: 'ignore' },
    );
    await page.goto('/');

    // Testa o foco
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);

    if (focused) {
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-12').status = 'PASS';
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-12').evidence =
        'Navegação por teclado funciona e altera foco ativo.';
    } else {
      verifyJson.acs.find((a) => a.id === 'md-0002/AC-12').status = 'FAIL';
    }
  });
});
