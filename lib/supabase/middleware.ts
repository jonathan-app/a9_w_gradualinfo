import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { previewCookieOptions } from '@/lib/preview/config';
import { PREVIEW_COOKIE } from '@/lib/preview/session';
import { isArticleAccessible, verifyPreviewSession } from '@/lib/preview/auth';

/**
 * lib/supabase/middleware.ts — renova a sessão a cada requisição e protege rotas
 *
 * Por que isso roda em TODAS as requisições
 * O token de acesso do Supabase é curto. Se ninguém o renovar, o usuário é
 * deslogado sozinho no meio da navegação — e o pior sintoma é intermitente:
 * funciona, derruba, funciona. Este arquivo é a rede de segurança: ele lê o
 * cookie, chama `getUser()` (que valida o token no servidor do Supabase e
 * devolve um token novo se estiver perto de expirar) e reescreve o cookie na
 * resposta.
 *
 * Por que `getUser()` e não `getSession()`
 * `getSession()` devolve o conteúdo do cookie sem contatar o Supabase — ou
 * seja, confia em dado que o cliente controla. `getUser()` vai ao servidor.
 * Em Route Handler que decide autorização, trocar um pelo outro é bypass:
 * qualquer um pode forjar um cookie com a role que quiser.
 *
 * @param request - Requisição corrente: fornece cookies, pathname e a URL usada
 *   no rewrite de artigo inacessível.
 * @returns Response com a sessão reescrita nos cookies; ou rewrite para
 *   `/_not-found` com status 404 quando o artigo não é acessível ao leitor.
 */
export async function updateSession(request: NextRequest) {
  // `NextResponse.next()` carrega os cookies de request adiante; sem isso a
  // response nasce limpa e some o header de autenticação do middleware.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 1. request: o cookie novo passa adiante para o Server Component,
        //    que já o vê na mesma renderização (evita o "piscar" de estado).
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        // 2. response: o cookie precisa ser emitido para o browser, senão o
        //    token novo morre com a resposta.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            ...previewCookieOptions,
          }),
        );
      },
    },
  });

  // A chamada em si é o que dispara o refresh. O retorno é descartado de
  // propósito: o objetivo aqui não é o usuário, é o cookie renovado.
  // As rotas públicas não dependem de Auth disponível para filtrar publicados.
  try {
    await supabase.auth.getUser();
  } catch {
    /* leitura protegida falha fechada */
  }

  if (
    request.nextUrl.pathname.startsWith('/artigos/') ||
    request.nextUrl.pathname.startsWith('/preview') ||
    request.nextUrl.pathname.startsWith('/api/preview')
  ) {
    // Artigo e preview mudam conforme a sessão (rascunho visível só no
    // preview): no-store impede CDN/browser de servir a variação errada a
    // partir de cache compartilhado.
    response.headers.set('Cache-Control', 'private, no-store');
  }

  // Intercepta rotas de artigo dinâmico `/artigos/[slug]` para garantir que
  // inexistente, rascunho sem preview ou data futura devolva status HTTP 404
  // antes do streaming do layout iniciar (evitando o "soft 200" do streaming).
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  if (segments.length === 2 && segments[0] === 'artigos') {
    const slug = segments[1]!;
    const previewCookie = request.cookies.get(PREVIEW_COOKIE)?.value;
    const isPreview = await verifyPreviewSession(supabase, previewCookie);
    const accessible = await isArticleAccessible(supabase, slug, isPreview);

    if (!accessible) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), {
        status: 404,
        headers: response.headers,
      });
    }
  }

  return response;
}
