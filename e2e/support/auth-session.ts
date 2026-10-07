/**
 * @fileoverview Autenticação E2E sem UI: cookies de sessão e grant de preview no contexto.
 * @module e2e/support/auth-session
 * @description Faz o login pela API do Supabase (na stack descartável) e injeta as cookies
 *   resultantes — somadas ao grant de preview assinado — no `BrowserContext` do Playwright.
 *   O teste começa autenticado sem percorrer a tela de login, e recebe exatamente as mesmas
 *   cookies HttpOnly/Secure que o fluxo real produz. Tudo é infraestrutura só do suíte: nada
 *   aqui existe na aplicação de produção.
 * @dependencies @supabase/ssr (`createServerClient`, devolve cookies no formato que o servidor
 *   usa), @supabase/supabase-js (cliente admin), ../../lib/preview/session
 *   (`issuePreviewGrant`, `PREVIEW_COOKIE`), @playwright/test (`BrowserContext`).
 *
 * Quando executado: importado pelos specs (ex.: `e2e/verify-md0002-tarefa8.spec.ts`).
 * Lê: `E2E_SUPABASE_UPSTREAM`, `CI_LOCAL_SERVICE_ROLE`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
 *   `SUPABASE_PREVIEW_TOKEN`.
 * Escreve: nada em disco; adiciona cookies ao navegador do Playwright.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';
import { issuePreviewGrant, PREVIEW_COOKIE } from '../../lib/preview/session';
/**
 * Cliente admin apontando para a stack Supabase descartável de teste.
 *
 * @returns Cliente `supabase-js` com `SERVICE_ROLE`, sem persistência nem refresh automático
 *   de token — é usado pontualmente pelo spec e descartado.
 * @throws {Error} Sem URL/segredo ou com host que não seja loopback: a mesma trava de
 *   absurdo de outros scripts da CI, para que credencial de admin nunca aponte para um
 *   projeto remoto por engano.
 */
export function localAdmin() {
  const url = process.env.E2E_SUPABASE_UPSTREAM;
  const key = process.env.CI_LOCAL_SERVICE_ROLE;
  if (
    !url ||
    !key ||
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  )
    throw new Error('Admin só na stack descartável.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
/**
 * Loga uma fixture real e devolve a sessão com as cookies já montadas para o navegador.
 *
 * O login roda por `createServerClient` com um "jar" em memória no lugar do armazenamento de
 * cookies: assim a mesma chamada que o servidor faria preenche o `BrowserContext`, no formato
 * e com os nomes que o middleware da aplicação espera ler.
 *
 * @param context - Contexto do navegador do teste; recebe as cookies ao final.
 * @param {string} baseURL - URL que o Playwright usa para associar as cookies (é para ela que
 *   `secure: true` precisa valer — o suíte roda em HTTPS).
 * @param credentials - Credenciais da fixture criada por `scripts/ci-fixtures.mjs`.
 * @returns A sessão Supabase autenticada (útil quando o spec precisa do access token).
 * @throws {Error} Se o login da fixture falhar — sem isso o teste seguiria anônimo e
 *   reprovaria por motivo errado.
 */
export async function installSession(
  context: BrowserContext,
  baseURL: string,
  credentials: { email: string; password: string },
) {
  const jar: { name: string; value: string }[] = [];
  const client = createServerClient(
    process.env.E2E_SUPABASE_UPSTREAM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar,
        // Substituição por nome: o Supabase pode gravar a mesma cookie mais de uma vez no
        // fluxo (ex.: token e refresh); manter as duas cópias faria o navegador enviar a
        // antiga junto com a nova e a sessão lida pelo servidor divergir da emitida.
        setAll: (values) => {
          for (const value of values) {
            const previous = jar.findIndex(
              (cookie) => cookie.name === value.name,
            );
            if (previous >= 0) jar.splice(previous, 1);
            jar.push({ name: value.name, value: value.value });
          }
        },
      },
    },
  );
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.session) throw new Error('Login real da fixture falhou.');
  // O host do proxy usa a mesma chave de storage: ambos têm 127 como project ref.
  // `issuePreviewGrant` precisa do `session_id`, que só existe no payload do access token e
  // não é exposto pela lib — por isso o decode manual. Sem validar assinatura aqui é aceitável:
  // o token veio de um login real contra a stack local, e quem valida a assinatura do grant é
  // a aplicação, no `readPreviewGrant`.
  const claims = JSON.parse(
    Buffer.from(
      data.session.access_token.split('.')[1]!,
      'base64url',
    ).toString(),
  );
  await context.addCookies(
    [
      ...jar,
      {
        name: PREVIEW_COOKIE,
        value: issuePreviewGrant(
          data.user.id,
          claims.session_id,
          process.env.SUPABASE_PREVIEW_TOKEN!,
        ),
      },
    ].map((cookie) => ({
      ...cookie,
      url: baseURL,
      // Flags declaradas aqui e não herdadas do jar: `getAll` do cliente devolve apenas
      // nome/valor, e o cenário de cookies exige exatamente HttpOnly, Secure e SameSite
      // como o login real produziria em HTTPS.
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
    })),
  );
  return data.session;
}
