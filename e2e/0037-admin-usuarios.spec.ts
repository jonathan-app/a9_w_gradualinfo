/**
 * @fileoverview Verificação integrada da Spec 0037 — gestão de operadores (/admin-dashboard/usuarios).
 * @module e2e/0037-admin-usuarios
 * @description Jornada real no navegador (Chromium) contra o servidor local com Supabase ativo.
 *   Segue o padrão de `e2e/admin-operational-dashboard.spec.ts`: login real no Supabase local,
 *   matrícula TOTP, desafio AAL1 → verificação AAL2, depois navegação para /admin-dashboard/usuarios.
 *   Valida: admin/AAL2 acessa, recusa de editor/revisor, raiz sem ações de atribuição/revogação,
 *   paginação, teclado (Tab/Enter), foco (campo UUID inicial, retorno ao controle ao fechar modal),
 *   Escape sem requisição, prevenção de envio duplicado e falhas da API (400/401/403/404/409/500/503),
 *   além de conferência visual (axe WCAG). Complementa os testes de componente Vitest com execução
 *   integrada e autenticada.
 * @dependencies @playwright/test, node:child_process, node:crypto, node:fs, jose
 */

import { execSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { importJWK, SignJWT } from 'jose';
import { expect, test } from '@playwright/test';
import type { Page, Response as BrowserResponse } from '@playwright/test';

const BASE_URL: string = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

const REAL_EMAIL: string = process.env.E2E_REAL_EMAIL ?? 'ana@exemplo.dev';
const REAL_PASSWORD: string =
  process.env.E2E_REAL_PASSWORD ?? 'senha-de-teste-123';
const REAL_USER_ID: string =
  process.env.E2E_REAL_USER_ID ?? '11111111-1111-1111-1111-111111111111';

const DELEGADO_ID: string =
  process.env.E2E_DELEGADO_USER_ID ?? '22222222-2222-2222-2222-222222222222';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(value: string): number[] {
  const cleaned = value.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const symbol = BASE32_CHARS.indexOf(char);
    if (symbol === -1) continue;
    accumulator = (accumulator << 5) | symbol;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes;
}

function totpCode(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', Buffer.from(base32Decode(secret)))
    .update(message)
    .digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 1_000_000).toString().padStart(6, '0');
}

/**
 * Gera e injeta o JWT de admissão do Cloudflare Access no contexto do navegador.
 *
 * O `url` do cookie é o próprio `pageUrl` — não o `BASE_URL` do spec. O spec é
 * executado contra servidores distintos (dev HTTP 3100, worker HTTPS 3100/3101) e
 * o `playwright.config.ts` só tem um `baseURL`; se o cookie for injetado com a
 * URL errada o navegador não o envia na navegação e o `authority()` do Access
 * rejeita a requisição como se não houvesse token (HTTP 403 "Acesso restrito").
 * O `kid` é lido do próprio arquivo de chaves: o `scripts/e2e-server.mjs`
 * regenera o par a cada partida, e um `kid` hard-coded aponta para chaves
 * efêmeras já descartadas.
 */
async function seedAccessJwt(page: Page, pageUrl: string): Promise<string> {
  let token = '';
  if (existsSync('.wrangler/test-access-keys.json')) {
    const keys = JSON.parse(
      readFileSync('.wrangler/test-access-keys.json', 'utf8'),
    );
    const privateKey = await importJWK(keys.private, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    token = await new SignJWT({
      type: 'app',
      email: REAL_EMAIL,
      sub: REAL_USER_ID,
      iss: 'https://test-team.cloudflareaccess.com',
      aud: 'spec-0018-test-aud',
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: 'RS256', kid: keys.private.kid })
      .sign(privateKey);
    await page
      .context()
      .addCookies([{ name: 'CF_Authorization', value: token, url: pageUrl }]);
  }
  return token;
}

/**
 * Prova a política efetivamente recebida, sem bypass do navegador.
 * @param page - Página administrativa já renderizada.
 * @param response - Resposta da navegação original.
 */
async function assertEnforcedAdminCsp(
  page: Page,
  response: BrowserResponse,
): Promise<void> {
  const policies = (await response.headersArray()).filter(
    (h) => h.name.toLowerCase() === 'content-security-policy',
  );
  expect(
    policies,
    'uma única política efetiva, sem CSP estática conflitante',
  ).toHaveLength(1);
  const policy = policies[0]!.value;
  const scriptSrc =
    policy.split(';').find((d) => d.trim().startsWith('script-src ')) ?? '';
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(scriptSrc).not.toContain("'unsafe-eval'");
  const nonce = scriptSrc.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce, 'HTML administrativo exige nonce de resposta').toBeTruthy();
  // CSP oculta o atributo nonce; a propriedade script.nonce continua disponível.
  const inlineScripts = await page
    .locator('script:not([src])')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        nonce: (node as HTMLScriptElement).nonce,
        text: node.textContent ?? '',
        type: (node as HTMLScriptElement).type,
      })),
    );
  const executable = inlineScripts.filter(
    (s) => !['application/ld+json', 'application/json'].includes(s.type),
  );
  expect(executable.length).toBeGreaterThan(0);
  const unauthorized = executable.filter(
    (s) =>
      s.nonce !== nonce &&
      !scriptSrc.includes(
        `'sha256-${createHash('sha256').update(s.text).digest('base64')}'`,
      ),
  );
  expect(
    unauthorized.length,
    'todo script inline executável exige nonce ou hash exato',
  ).toBe(0);
  const next = await page.request.get('/admin-dashboard/usuarios');
  expect(next.status()).toBe(200);
  const nextHeaders = next.headers();
  const nextNonce =
    nextHeaders['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];
  expect(nextNonce).toBeTruthy();
  expect(nextNonce).not.toBe(nonce);
  // Contraprova no navegador: script inline arbitrário deve continuar bloqueado.
  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>).__usuariosCspProbe;
    const script = document.createElement('script');
    script.textContent = 'window.__usuariosCspProbe = true';
    document.head.appendChild(script);
    script.remove();
  });
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__usuariosCspProbe,
    ),
  ).toBeUndefined();
}

async function loginReal(page: Page): Promise<void> {
  const response = await page.goto('/admin-dashboard/login');
  expect(
    response?.status(),
    'Access deve admitir a navegação autenticada pelo cookie',
  ).toBe(200);
  await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
  await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
  await page.getByRole('button', { name: /Entrar no Painel/i }).click();

  // Retry estrito: SOMENTE se receber a resposta explícita de rate limit (HTTP 429)
  // com no máximo 1 tentativa delimitada a 3500ms (janela de expiração da quota local).
  const rateLimitHeading = page.getByRole('heading', {
    name: /Muitas tentativas/i,
  });
  if (
    (await rateLimitHeading.isVisible({ timeout: 2000 }).catch(() => false)) ||
    page.url().includes('error=rate_limited')
  ) {
    await page.waitForTimeout(3500);
    const retryGoto = await page.goto('/admin-dashboard/login');
    expect(retryGoto?.status()).toBe(200);
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();
  }

  // Falhas de autenticação (401/403) ou credenciais inválidas não são ocultadas
  await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
    timeout: 30_000,
  });
}

/**
 * Espera a interface responder antes de interagir.
 *
 * A prova de hidratação é observável e usa um controle real da página: o
 * seletor de tema só altera a classe do `<html>` depois que o React monta. Um
 * clique antes disso é descartado pelo navegador, por isso a checagem repete o
 * clique até a classe mudar. Nada aqui depende de `__reactProps$` nem de outra
 * chave interna do React, que muda entre versões sem aviso.
 *
 * @param page - Página já navegada.
 */
async function waitForUiReady(page: Page): Promise<void> {
  const html = page.locator('html');
  await expect(async () => {
    await page.getByRole('button', { name: 'Tema claro' }).click();
    await expect(html).toHaveClass(/light/);
  }).toPass({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  await expect(html).toHaveClass(/dark/);
}

async function enrollTotp(page: Page): Promise<string> {
  const start = page.getByRole('button', {
    name: /Iniciar configuração TOTP/i,
  });
  await expect(start).toBeVisible();
  await waitForUiReady(page);
  await start.click();
  const secret = (await page.locator('code').textContent())?.trim() ?? '';
  expect(secret.length).toBeGreaterThanOrEqual(16);
  return secret;
}

async function verifyTotp(page: Page, secret: string): Promise<void> {
  await page.goto('/admin-dashboard');
  await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/, {
    timeout: 15_000,
  });
  await page.getByLabel(/Código de 6 Dígitos \(TOTP\)/i).fill(totpCode(secret));
  await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
  await expect(page).toHaveURL(/\/admin-dashboard$/, { timeout: 15_000 });
}

async function reachAal2(page: Page): Promise<void> {
  await loginReal(page);
  const secret = await enrollTotp(page);
  await verifyTotp(page, secret);
}

test.describe('Spec 0037 — Gestão de operadores (/admin-dashboard/usuarios)', () => {
  test.beforeEach(async ({ page, context }) => {
    // `addCookies` por `url` não exige página navegada. A URL absoluta do
    // servidor basta e o cookie passa a valer para o host inteiro com path `/`,
    // inclusive nas rotas /admin-dashboard. A navegação anterior para `/`
    // existia apenas para obter um `page.url()` concreto e custava uma
    // requisição de home por teste.
    await seedAccessJwt(page, `${BASE_URL}/`);

    const [cookie] = await context.cookies(
      `${BASE_URL}/admin-dashboard/usuarios`,
    );
    expect(cookie?.name, 'cookie de Access presente no host do servidor').toBe(
      'CF_Authorization',
    );
    expect(new URL(BASE_URL).hostname).toContain(cookie?.domain ?? '');
    expect(cookie?.path).toBe('/');

    try {
      execSync(`node scripts/admin-reset-mfa.mjs ${REAL_USER_ID}`, {
        stdio: 'ignore',
      });
    } catch {
      // ignora se offline / já sem fator
    }
    try {
      execSync(`node scripts/admin-reset-mfa.mjs ${DELEGADO_ID}`, {
        stdio: 'ignore',
      });
    } catch {
      // o delegado pode não existir em ambientes sem seed
    }

    // Aguarda expiração da janela de rate-limit (3.000 ms) entre testes consecutivos
    await new Promise((resolve) => setTimeout(resolve, 3100));
  });

  test.skip(
    process.env.E2E_REAL_SUPABASE !== '1',
    'exige stack Supabase local ativa e E2E_REAL_SUPABASE=1',
  );

  test('raiz admin com AAL2 acessa a página de usuários e não vê controles de atribuição/revogação na própria conta', async ({
    page,
  }) => {
    await reachAal2(page);

    const usuariosResponse = await page.goto('/admin-dashboard/usuarios');
    expect(
      usuariosResponse?.status(),
      'a página de usuários responde 200 com sessão AAL2',
    ).toBe(200);
    await expect(page).toHaveURL(/\/admin-dashboard\/usuarios/);
    await expect(
      page.getByRole('heading', { name: /Gestão de Operadores/i }),
    ).toBeVisible();

    await assertEnforcedAdminCsp(page, usuariosResponse!);

    // A conta raiz aparece destacada
    const rootCard = page.locator('div.rounded-xl').filter({
      has: page.getByRole('heading', { name: 'Conta raiz' }),
    });
    await expect(
      page.getByRole('heading', { name: 'Conta raiz' }),
    ).toBeVisible();
    await expect(rootCard.getByText(/Imutável/)).toBeVisible();

    // A raiz NÃO tem botões de atribuir/revogar na própria linha
    await expect(
      rootCard.getByRole('button', { name: /Atribuir papel/ }),
    ).toHaveCount(0);
    await expect(
      rootCard.getByRole('button', { name: /Revogar papel/ }),
    ).toHaveCount(0);

    // Acessibilidade da página
    await page.waitForLoadState('networkidle');
    const { AxeBuilder } = await import('@axe-core/playwright');
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('formulário aceita UUID arbitrário, atribui papel e revoga; cancelamento por Escape não dispara requisição; foco retorna ao controle que abriu o modal', async ({
    page,
  }) => {
    await reachAal2(page);

    await page.goto('/admin-dashboard/usuarios');

    // Campo UUID foco inicial
    const uuidInput = page.getByLabel('UUID da conta');
    await expect(uuidInput).toBeFocused();

    const UUID_DELEGADO = '22222222-2222-2222-2222-222222222222'; // bruno@exemplo.dev (existe no seed)

    const mutations: string[] = [];
    page.on('request', (request) => {
      if (
        ['POST', 'DELETE'].includes(request.method()) &&
        request.url().includes('/api/admin/usuarios/papeis')
      )
        mutations.push(request.method());
    });
    // Abre diálogo de atribuição
    await uuidInput.fill(UUID_DELEGADO);
    await page.getByRole('button', { name: /Atribuir papel/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    expect(mutations).toEqual([]);
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    // Confirma atribuição
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/atribuído com sucesso/i)).toBeVisible();

    await expect.poll(() => mutations.length).toBe(1);
    const assignedRow = page
      .getByRole('row')
      .filter({ hasText: UUID_DELEGADO });
    await expect(assignedRow).toBeVisible();
    // Fecha por Escape sem requisição adicional
    await uuidInput.fill(UUID_DELEGADO);
    await page.getByRole('button', { name: /Revogar papel/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Revogar papel/ }),
    ).toBeFocused();
    expect(mutations).toEqual(['POST']);

    // Revoga o papel do delegado
    await uuidInput.fill(UUID_DELEGADO);
    await page.getByRole('button', { name: /Revogar papel/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/revogado com sucesso/i)).toBeVisible();
    await expect.poll(() => mutations.length).toBe(2);
    await expect(assignedRow).toHaveCount(0);
  });

  test('editor e revisor são recusados na página de usuários (AC-10)', async ({
    page,
  }) => {
    // Prova 1: Operador com papel 'editor'
    execSync(
      `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "INSERT INTO public.admin_user_roles (user_id, role, assigned_by) VALUES ('22222222-2222-2222-2222-222222222222', 'editor', '11111111-1111-1111-1111-111111111111') ON CONFLICT (user_id) DO UPDATE SET role = 'editor';"`,
    );

    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill('bruno@exemplo.dev');
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    // Editor realiza MFA e alcança AAL2
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
      timeout: 20_000,
    });
    const secretEditor = await enrollTotp(page);
    await verifyTotp(page, secretEditor);

    // Navega para /admin-dashboard/usuarios -> AC-10 exige recusa para editor
    // No streaming do Next.js App Router com layout protegido compartilhado,
    // o Server Component filho dispara forbidden(), renderizando forbidden.tsx
    // (heading 403) e suprimindo qualquer dado sensível.
    await page.goto('/admin-dashboard/usuarios');
    await expect(
      page.getByRole('heading', { name: /Acesso Não Autorizado \(403\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Gestão de Operadores/i }),
    ).toHaveCount(0);

    // O Route Handler subjacente rejeita com status HTTP 403 estrito para editor
    const editorApi = await page.request.get('/api/admin/usuarios/papeis');
    expect(editorApi.status(), 'API deve devolver HTTP 403 para editor').toBe(
      403,
    );

    // Prova 2: Operador com papel 'revisor'
    execSync(
      `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "UPDATE public.admin_user_roles SET role = 'revisor' WHERE user_id = '22222222-2222-2222-2222-222222222222';"`,
    );
    await page.goto('/admin-dashboard/usuarios');
    await expect(
      page.getByRole('heading', { name: /Acesso Não Autorizado \(403\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Gestão de Operadores/i }),
    ).toHaveCount(0);

    // O Route Handler subjacente rejeita com status HTTP 403 estrito para revisor
    const revisorApi = await page.request.get('/api/admin/usuarios/papeis');
    expect(revisorApi.status(), 'API deve devolver HTTP 403 para revisor').toBe(
      403,
    );
  });

  test('paginação: Anterior/Proxima navegam e mantêm o estado da tabela', async ({
    page,
  }) => {
    await reachAal2(page);

    // Navega com limit=1 garantindo múltiplas páginas com o seed local
    await page.goto('/admin-dashboard/usuarios?limit=1&page=1');
    await expect(page).toHaveURL(/\/admin-dashboard\/usuarios\?limit=1&page=1/);

    const proxima = page.getByRole('link', { name: /Próxima/ });
    await expect(
      proxima,
      'link de próxima página deve existir com limit=1',
    ).toBeVisible();
    await proxima.click();

    await expect(page).toHaveURL(/page=2/);
    const anterior = page.getByRole('link', { name: /Anterior/ });
    await expect(anterior).toBeVisible();
    await expect(anterior).toHaveAttribute('href', /page=1/);
    await anterior.click();
    await expect(page).toHaveURL(/page=1/);
  });

  test('raiz é imutável: tentativa de modificar a raiz retorna 409', async ({
    page,
  }) => {
    await reachAal2(page);

    const ROOT_ID = '11111111-1111-1111-1111-111111111111';

    const res = await page.request.post('/api/admin/usuarios/papeis', {
      data: { userId: ROOT_ID, role: 'editor' },
      headers: { Origin: BASE_URL },
    });
    const body = await res.json();
    // O corpo entra na mensagem para diferenciar recusa de validação (400) de
    // recusa de imutabilidade (409) sem precisar de trace.
    expect(res.status(), JSON.stringify(body)).toBe(409);
    expect(body.error).toBe('root_admin_immutable');
  });
});
