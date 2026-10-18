/**
 * @fileoverview Testes E2E de recuperação administrativa e contingência TOTP (Spec 0019).
 * @module e2e/recovery
 * @description Valida no navegador real (Chromium via Playwright) contra o servidor local
 *   do Worker e o Supabase local ativo (GoTrue v2.197.0 e Mailpit na porta 54324):
 *   - Ciclo real: solicitação → email local → callback PKCE → desafio TOTP → nova senha → login
 *   - Casos negativos: verificador PKCE ausente (cross-browser), link reutilizado, rate limit e CSRF
 *   - Contingência operacional: remoção de TOTP via script privilegiado e nova matrícula forçada
 * @dependencies @playwright/test, jose, node:crypto, node:child_process
 */

import { execSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { importJWK, SignJWT } from 'jose';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL: string = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const MAILPIT_URL = 'http://127.0.0.1:54324';
const E2E_REAL_SUPABASE: boolean = process.env.E2E_REAL_SUPABASE === '1';
const REAL_EMAIL = 'ana@exemplo.dev';
const REAL_PASSWORD = 'senha-de-teste-123';
const NEW_PASSWORD = 'nova-senha-de-teste-456';
const REAL_USER_ID = '11111111-1111-1111-1111-111111111111';

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

async function seedAccessJwt(page: Page): Promise<string> {
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
      .setProtectedHeader({ alg: 'RS256', kid: 'spec0018-rsa-key-01' })
      .sign(privateKey);
    await page
      .context()
      .addCookies([{ name: 'CF_Authorization', value: token, url: BASE_URL }]);
  }
  return token;
}

function cleanupUserDbState(): void {
  if (!E2E_REAL_SUPABASE) return;
  const testUserIds = `'${REAL_USER_ID}'`;
  const cmd = `psql -U postgres -c "delete from auth.mfa_factors where user_id in (${testUserIds}); delete from auth.sessions where user_id in (${testUserIds}); update auth.users set encrypted_password = crypt('${REAL_PASSWORD}', gen_salt('bf')) where id in (${testUserIds});"`;
  try {
    execSync(`podman exec supabase_db_gradualinfo-editorial ${cmd}`, {
      stdio: 'ignore',
    });
  } catch {
    try {
      execSync(`docker exec supabase_db_gradualinfo-editorial ${cmd}`, {
        stdio: 'ignore',
      });
    } catch {
      // Ignora erro se contêiner não estiver ativo
    }
  }
  try {
    const doDir = '.wrangler/state/v3/do/gradualinfo-AdminRateLimitDO';
    if (existsSync(doDir)) {
      execSync(
        `find "${doDir}" -name "*.sqlite" ! -name "metadata.sqlite" -exec sqlite3 {} "DELETE FROM quotas;" \\;`,
        { stdio: 'ignore' },
      );
    }
  } catch {
    // Ignora se sqlite3 ou diretório não existirem
  }
}

async function fetchLatestRecoveryLink(
  sinceTimestampMs: number,
): Promise<string> {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
      if (res.ok) {
        const data = await res.json();
        const messages = data.messages ?? [];
        for (const msg of messages) {
          const createdMs = new Date(msg.Created).getTime();
          if (
            createdMs >= sinceTimestampMs - 5000 &&
            msg.To?.[0]?.Address === REAL_EMAIL
          ) {
            const detailRes = await fetch(
              `${MAILPIT_URL}/api/v1/message/${msg.ID}`,
            );
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const body = detail.HTML || detail.Text || '';
              const match = body.match(/href="([^"]+verify\?[^"]+)"/);
              if (match?.[1]) {
                return match[1].replace(/&amp;/g, '&');
              }
            }
          }
        }
      }
    } catch {
      // Tenta novamente
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error('Link de recuperação não foi recebido no Mailpit a tempo.');
}

async function fetchRecoveryCallbackUrl(
  sinceTimestampMs: number,
): Promise<string> {
  const verifyLink = await fetchLatestRecoveryLink(sinceTimestampMs);
  const res = await fetch(verifyLink, { redirect: 'manual' });
  const location = res.headers.get('location') || '';
  const url = new URL(location, 'http://127.0.0.1:3000');
  const code = url.searchParams.get('code') || '';
  if (!code) {
    throw new Error(
      `Código de autorização não retornado pelo GoTrue. Location: ${location}`,
    );
  }
  return `${BASE_URL}/api/admin/auth/recovery/callback?code=${encodeURIComponent(code)}`;
}

test.describe('Spec 0019 — Recuperação Administrativa e Contingência no Navegador Real', () => {
  test.beforeEach(() => {
    cleanupUserDbState();
  });

  test.afterAll(() => {
    cleanupUserDbState();
  });

  test('Ciclo real completo: solicitação, email local, callback PKCE, desafio TOTP, nova senha e login', async ({
    page,
  }) => {
    test.skip(
      !E2E_REAL_SUPABASE,
      'fluxo real exige stack Supabase local ativa; defina E2E_REAL_SUPABASE=1',
    );
    test.setTimeout(120_000);

    // 1. Matricular TOTP inicialmente para comprovar que o usuário possui fator ativo
    await seedAccessJwt(page);
    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
      timeout: 20_000,
    });
    await page
      .getByRole('button', { name: /Iniciar configuração TOTP/i })
      .click();
    const secret = (await page.locator('code').textContent())?.trim() ?? '';
    expect(secret.length).toBeGreaterThanOrEqual(16);

    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/, {
      timeout: 15_000,
    });
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/, { timeout: 15_000 });

    // 2. Deslogar e iniciar o fluxo de recuperação
    await page.request.post('/api/admin/auth/logout', {
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    await page.context().clearCookies();
    await seedAccessJwt(page);

    // 3. Acessar tela de solicitação de recuperação
    await page.goto('/admin-dashboard/recovery/request');
    await expect(
      page.getByRole('heading', { name: /Recuperação de Acesso/i }),
    ).toBeVisible();

    const requestTime = Date.now();
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page
      .getByRole('button', { name: /Enviar Link de Redefinição/i })
      .click();

    // Mensagem uniforme de sucesso exibida na página
    await expect(page.getByText(/Instruções enviadas/i)).toBeVisible({
      timeout: 15_000,
    });

    // 4. Capturar link de recuperação e obter a URL de callback com o code
    const callbackUrl = await fetchRecoveryCallbackUrl(requestTime);
    expect(callbackUrl).toContain('/api/admin/auth/recovery/callback?code=');

    // 5. Acessar o callback no mesmo navegador (que possui os cookies PKCE sb-*-code-verifier)
    await page.goto(callbackUrl);

    // Como o usuário possui TOTP ativo, o callback redireciona obrigatoriamente para o desafio TOTP
    await expect(page).toHaveURL(
      /\/admin-dashboard\/mfa\/verify\?redirectTo=%2Fadmin-dashboard%2Frecovery%2Fupdate-password/,
      { timeout: 20_000 },
    );
    await expect(
      page.getByRole('heading', { name: /Verificação de Segurança/i }),
    ).toBeVisible();

    // 6. Superar o desafio TOTP para elevar a AAL2
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();

    // 7. Chega à tela de atualização de senha sob AAL2
    await expect(page).toHaveURL(
      /\/admin-dashboard\/recovery\/update-password/,
      {
        timeout: 15_000,
      },
    );
    await expect(
      page.getByRole('heading', { name: /Definir Nova Senha/i }),
    ).toBeVisible();

    // 8. Preencher e submeter a nova senha
    await page.getByLabel(/^Nova Senha/i).fill(NEW_PASSWORD);
    await page.getByLabel(/Confirmar Nova Senha/i).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /Salvar e Continuar/i }).click();

    // Redirecionamento após atualização para o dashboard protegido
    await expect(page).toHaveURL(/\/admin-dashboard/, { timeout: 15_000 });

    // 9. Limpar sessão e testar login com senha antiga
    await page.request.post('/api/admin/auth/logout', {
      headers: { Origin: BASE_URL },
      maxRedirects: 0,
    });
    await page.context().clearCookies();
    await seedAccessJwt(page);
    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    // Senha antiga deve falhar!
    await expect(page).toHaveURL(
      /\/admin-dashboard\/login\?.*error=invalid_credentials/,
    );

    // 10. Testar login com a nova senha
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    // Sucesso no primeiro degrau, direcionado para o desafio TOTP
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/, {
      timeout: 15_000,
    });
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();

    // Atinge o dashboard com AAL2
    await expect(page).toHaveURL(/\/admin-dashboard$/, { timeout: 15_000 });
    await expect(
      page.getByText(/Sessão AAL2 Protegida/i).first(),
    ).toBeVisible();
  });

  test('Casos negativos: verificador PKCE ausente (outro navegador) e link reutilizado', async ({
    page,
    browser,
  }) => {
    test.skip(
      !E2E_REAL_SUPABASE,
      'fluxo real exige stack Supabase local ativa; defina E2E_REAL_SUPABASE=1',
    );
    test.setTimeout(60_000);

    await seedAccessJwt(page);
    await page.goto('/admin-dashboard/recovery/request');
    const reqTime = Date.now();
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page
      .getByRole('button', { name: /Enviar Link de Redefinição/i })
      .click();
    await expect(page.getByText(/Instruções enviadas/i)).toBeVisible();

    const callbackUrl = await fetchRecoveryCallbackUrl(reqTime);

    // Cenário 1: Abrir o link em um novo contexto limpo (sem cookie PKCE)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await seedAccessJwt(newPage);

    await newPage.goto(callbackUrl);

    // Deve redirecionar para login com recovery_verifier_missing
    await expect(newPage).toHaveURL(
      /\/admin-dashboard\/login\?.*error=recovery_verifier_missing/,
      { timeout: 20_000 },
    );
    await expect(
      newPage.getByText(/Verificador de segurança ausente/i),
    ).toBeVisible();
    await newContext.close();

    // Cenário 2: Consumir no navegador original
    await page.goto(callbackUrl);
    // Como o usuário está sem TOTP no banco limpo, vai direto para update-password
    await expect(page).toHaveURL(
      /\/admin-dashboard\/recovery\/update-password/,
      {
        timeout: 20_000,
      },
    );

    // Cenário 3: Tentar reutilizar o mesmo link já consumido
    await page.goto(callbackUrl);
    await expect(page).toHaveURL(
      /\/admin-dashboard\/login\?.*error=(recovery_link_invalid|recovery_verifier_missing)/,
      { timeout: 20_000 },
    );
    await expect(page.locator('.rounded-lg[role="alert"]')).toBeVisible();
  });

  test('Casos negativos de API: CSRF origin, rate limit e chamadas diretas sem sessão', async ({
    page,
  }) => {
    test.skip(
      !E2E_REAL_SUPABASE,
      'fluxo real exige stack Supabase local ativa; defina E2E_REAL_SUPABASE=1',
    );
    await seedAccessJwt(page);

    // 1. Origem cruzada rejeitada em POST
    const crossOrigin = await page.request.post('/api/admin/auth/recovery', {
      data: { email: REAL_EMAIL },
      headers: { Origin: 'https://malicious-site.test' },
    });
    expect(crossOrigin.status()).toBe(403);

    // 2. Rate limit em solicitações sucessivas (máximo 5 por janela)
    const ipHeaders = { Origin: BASE_URL, 'x-forwarded-for': '198.51.100.77' };
    for (let i = 0; i < 5; i++) {
      await page.request.post('/api/admin/auth/recovery', {
        data: { email: REAL_EMAIL },
        headers: ipHeaders,
      });
    }
    const limited = await page.request.post('/api/admin/auth/recovery', {
      data: { email: REAL_EMAIL },
      headers: ipHeaders,
    });
    expect(limited.status()).toBe(429);
    const limitedBody = await limited.text();
    expect(limitedBody).toContain('"rate_limited"');

    // 3. Chamada direta de atualização de senha sem sessão
    await page.context().clearCookies();
    await seedAccessJwt(page);
    const unauthUpdate = await page.request.post(
      '/api/admin/auth/recovery/update-password',
      {
        data: { password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        headers: { Origin: BASE_URL },
      },
    );
    expect(unauthUpdate.status()).toBe(401);

    // 4. API de negócio sob assertAdminApiAuth recusa AAL1 ou deslogado com 401/403
    const businessApi = await page.request.post('/api/admin/preview', {
      data: { slug: 'fixture-publicado' },
      headers: { Origin: BASE_URL },
    });
    expect([401, 403]).toContain(businessApi.status());
  });

  test('Contingência operacional de perda de TOTP via scripts/admin-reset-mfa.mjs', async ({
    page,
  }) => {
    test.skip(
      !E2E_REAL_SUPABASE,
      'fluxo real exige stack Supabase local ativa; defina E2E_REAL_SUPABASE=1',
    );
    test.setTimeout(60_000);

    // 1. Cadastrar TOTP para o usuário de teste
    await seedAccessJwt(page);
    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
      timeout: 20_000,
    });
    await page
      .getByRole('button', { name: /Iniciar configuração TOTP/i })
      .click();
    const secret = (await page.locator('code').textContent())?.trim() ?? '';
    expect(secret.length).toBeGreaterThanOrEqual(16);

    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/verify/, {
      timeout: 15_000,
    });
    await page
      .getByLabel(/Código de 6 Dígitos \(TOTP\)/i)
      .fill(totpCode(secret));
    await page.getByRole('button', { name: /Confirmar e Acessar/i }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/, { timeout: 15_000 });

    // 2. Simular operador executando o script privilegiado de contingência para o UUID de teste
    const scriptOut = execSync(
      `node scripts/admin-reset-mfa.mjs ${REAL_USER_ID}`,
      { encoding: 'utf8' },
    );
    expect(scriptOut).toContain('[ADMIN-MFA-RESET] Excluindo fator');
    expect(scriptOut).toContain('AUDITORIA DE CONTINGÊNCIA MFA CONCLUÍDA');

    // 3. Limpar cookies do navegador simulando reabertura
    await page.context().clearCookies();
    await seedAccessJwt(page);

    // 4. Logar com e-mail e senha
    await page.goto('/admin-dashboard/login');
    await page.getByLabel(/E-mail/i).fill(REAL_EMAIL);
    await page.getByLabel(/Senha/i).fill(REAL_PASSWORD);
    await page.getByRole('button', { name: /Entrar no Painel/i }).click();

    // Como o TOTP foi removido pela contingência, o login identifica ausência de fatores
    // e conduz obrigatoriamente para nova matrícula limpa em /admin-dashboard/mfa/setup!
    await expect(page).toHaveURL(/\/admin-dashboard\/mfa\/setup/, {
      timeout: 20_000,
    });
    await expect(
      page.getByRole('button', { name: /Iniciar configuração TOTP/i }),
    ).toBeVisible();
  });
});
