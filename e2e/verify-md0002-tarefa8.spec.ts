/**
 * @fileoverview Evidência da autorização de preview em md-0002 (Tarefa 8) — ponta a ponta.
 * @module e2e/verify-md0002-tarefa8
 * @description Contra a stack local com HTTPS e cookies reais: anônimo e identidade sem claim
 *   não veem rascunho (404), grant vencido nega sem apagar a sessão Supabase, outra identidade
 *   com claim válida não lê, logout apaga tudo, falha de logout responde 503 sem deixar
 *   autorização local, sessão Auth realmente expirada é bloqueada, e os cookies mantêm
 *   HttpOnly/Secure/SameSite.
 * @dependencies e2e/support/{preview,auth-session,faults}, `lib/preview/session` (o grant é
 *   reemitido pelo próprio código do app), fixtures de env `E2E_*` (scripts/ci-fixtures.mjs).
 *
 * `describe.serial` com `storageState` zerado: os testes compartilham a mesma stack e o mesmo
 * banco, e estado vazando entre eles falsificaria exatamente a autorização que se quer provar.
 */
import { test, expect } from '@playwright/test';
import { setFault } from './support/faults';
import { localAdmin, installSession } from './support/auth-session';
import { loginPreview, logoutPreview } from './support/preview';
import { issuePreviewGrant, PREVIEW_COOKIE } from '../lib/preview/session';
test.describe.serial('preview em produção local', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // Sem sessão, rascunho é 404 — igual a inexistente: a resposta não pode confirmar que o
  // conteúdo existe.
  test('rascunho anônimo retorna HTTP 404', async ({ page }) => {
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  // GET não é método de autenticação (405) e token errado morre no POST (401): a rota antiga
  // de trocar token por query string não pode sobreviver como caminho alternativo.
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
    // Conteúdo visível só para quem tem sessão, e sem cachear nem indexar: `no-store` +
    // `private` evitam cópia em proxy, `noindex` evita que o buscador registre o rascunho.
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
    // O grant é reemitido com o MESMO payload e prazo vencido, mudando só o `expires_at`:
    // prova que o prazo é conferido na leitura, não só na emissão. Os cookies `sb-*` têm de
    // sobreviver — o que venceu foi a autorização de preview, não a sessão Supabase.
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
  // Saída limpa: sem cookie de preview e sem cookie `sb-*`, o rascunho volta a ser 404. Deixar
  // qualquer um deles seria sair "com aparência de sair".
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
  // Sessão real de outra conta com claim de preview válida não basta: o que decide é o par
  // grant/sub — autorização não se herda por ter uma claim parecida.
  test('outra identidade com claim válida não lê rascunho', async ({
    context,
    page,
    baseURL,
  }) => {
    await installSession(
      context,
      baseURL!,
      JSON.parse(process.env.E2E_OTHER_IDENTITY!),
    );
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  // Mutação de `app_metadata` na stack descartável, restaurada em `finally`: sem restaurar, a
  // conta de teste ficaria sem claim para todos os specs seguintes.
  test('identidade permitida sem claim não lê rascunho', async ({ page }) => {
    await loginPreview(page);
    const admin = localAdmin();
    const id = process.env.SUPABASE_PREVIEW_USER_ID!;
    const result = await admin.auth.admin.updateUserById(id, {
      app_metadata: { preview: false },
    });
    expect(result.error).toBeNull();
    let restored;
    try {
      expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(
        404,
      );
    } finally {
      restored = await admin.auth.admin.updateUserById(id, {
        app_metadata: { preview: true },
      });
    }
    expect(restored.error).toBeNull();
  });
  // Conta real e autenticada, mas sem a claim: a sessão sozinha não autoriza leitura de
  // rascunho — é o caso do editor comum que loga normalmente no site.
  test('conta sem claim com sessão real permanece pública', async ({
    context,
    page,
    baseURL,
  }) => {
    await installSession(
      context,
      baseURL!,
      JSON.parse(process.env.E2E_NO_CLAIM!),
    );
    expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(404);
  });
  test('falha real de logout responde 503 e remove autorização local', async ({
    page,
    request,
    context,
    baseURL,
  }) => {
    // Provedor de logout fora do ar: 503 avisa que a saída falhou, mas os cookies locais saem
    // mesmo assim — autorização pendurada no browser não pode sobreviver à falha remota.
    await loginPreview(page);
    await setFault(request, 'logout');
    try {
      const response = await page.request.post('/api/preview/logout', {
        headers: { Origin: baseURL! },
      });
      expect(response.status()).toBe(503);
      expect(
        (await context.cookies()).filter(
          (cookie) =>
            cookie.name === PREVIEW_COOKIE || cookie.name.startsWith('sb-'),
        ),
      ).toEqual([]);
      expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(
        404,
      );
    } finally {
      await setFault(request, 'none');
    }
  });
  test('sessão Auth realmente expirada nega rascunho sem apagar cookies', async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    // Expiração REAL da sessão (não simulada): por isso o timeout de 90s e o `remaining`
    // abaixo — instala a sessão e espera o próprio token vencer com o refresh bloqueado,
    // provando que sessão vencida não abre rascunho sem apagar os cookies.
    test.setTimeout(90_000);
    const session = await installSession(context, baseURL!, {
      email: process.env.SUPABASE_PREVIEW_EMAIL!,
      password: process.env.SUPABASE_PREVIEW_PASSWORD!,
    });
    const remaining = session.expires_at! * 1000 - Date.now();
    // O token instalado precisa estar perto do vencimento (<= 65s) para a espera caber no
    // timeout do teste: sessão recém-criada de 1h não caberia aqui.
    expect(remaining).toBeLessThanOrEqual(65_000);
    await setFault(request, 'refresh');
    try {
      await page.waitForTimeout(Math.max(0, remaining) + 1100);
      expect(
        (await context.cookies()).some((cookie) =>
          cookie.name.startsWith('sb-'),
        ),
      ).toBe(true);
      expect((await page.goto('/artigos/fixture-rascunho'))?.status()).toBe(
        404,
      );
    } finally {
      await setFault(request, 'none');
    }
  });
  test('cookies preservam HttpOnly, Secure e prazo em HTTPS', async ({
    page,
    context,
    baseURL,
  }) => {
    // O teste só faz sentido sobre HTTPS (a stack local de produção roda com TLS): `Secure`
    // não existe sem isso, e `HttpOnly` + `SameSite=Lax` fecham leitura por script e envio
    // cross-site dos cookies de autenticação.
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
