/**
 * @fileoverview Encerramento da sessão de preview editorial.
 * @module app/api/preview/logout
 * @description Route handler que encerra a sessão Supabase do preview e
 *   zera os cookies de sessão no caminho da resposta. Contrato HTTP: POST único;
 *   303 com redirect para `/` quando dá certo, 503 quando a revogação falha
 *   (os cookies locais são zerados de qualquer forma, para o browser não ficar
 *   com sessão órfã), 403 para `origin` que não seja a do site e 405 com
 *   `Allow: POST` no GET.
 *   Autorização: aqui não se apresenta segredo — sair é livre; o que se valida é
 *   o `origin`, que impede formulário montado em outro domínio de encerrar (ou
 *   de forçar) sessão alheia (CSRF de formulário).
 * @dependencies next/server (NextResponse/NextRequest), @supabase/ssr
 *   (createServerClient + signOut), lib/env, lib/site-config (SITE_ORIGIN),
 *   lib/audit (evento `preview_logout`), lib/preview/config e
 *   lib/preview/session (opções de cookie e nome do cookie de preview).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { audit } from '@/lib/audit';
import { previewCookieOptions } from '@/lib/preview/config';
import { PREVIEW_COOKIE } from '@/lib/preview/session';

/**
 * Encerra a sessão de preview e limpa os cookies associados.
 *
 * `changed` reúne todo cookie que será zerado na resposta: os que o Supabase
 * tenta redefinir durante o `signOut` (via `setAll`) mais o cookie de preview e
 * os `sb-*` já presentes na requisição — o sweep manual cobre o caso em que o
 * `signOut` falha antes de tocar em qualquer cookie, que é justamente quando a
 * resposta vira 503.
 *
 * @param request - Requisição POST vinda do formulário da página `/preview`.
 * @returns 303 redirect para a home no sucesso; 503 quando a chamada ao Supabase
 *   falha; 403 quando o `origin` não é `SITE_ORIGIN`. Toda resposta sai com
 *   `Cache-Control: private, no-store`.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== SITE_ORIGIN)
    return new NextResponse('Origem não autorizada.', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  const changed = new Set<string>();
  let failed = false;
  try {
    const supabase = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => values.forEach(({ name }) => changed.add(name)),
        },
      },
    );
    const { error } = await supabase.auth.signOut();
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  const response = failed
    ? new NextResponse(
        'Sessão local encerrada; revogação remota indisponível.',
        { status: 503 },
      )
    : NextResponse.redirect(new URL('/', SITE_ORIGIN), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  changed.add(PREVIEW_COOKIE);
  // Sweep final: os `sb-*` entram mesmo quando o signOut não rodou — cookie de
  // sessão esquecido no browser manteria o preview utilizável após o logout.
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-'))
    .forEach(({ name }) => changed.add(name));
  changed.forEach((name) =>
    response.cookies.set(name, '', {
      ...previewCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    }),
  );
  audit({ type: 'preview_logout', ok: !failed });
  return response;
}

/**
 * Recusa GET com 405 e cabeçalho `Allow: POST`.
 *
 * Logout é mutação: atingir por link, `<img src>` ou prefetch não só faria nada
 * de útil, como deixaria a intenção do usuário fora do controle dele.
 *
 * @returns Resposta 405 em texto, sem cache.
 */
export function GET() {
  return new NextResponse('Use POST para sair.', {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'private, no-store' },
  });
}
