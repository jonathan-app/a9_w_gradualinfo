/**
 * @fileoverview Renovação de sessão e bloqueio de artigos sem autorização.
 * @module lib/supabase/middleware
 * @description Preserva cookies de sessão também nas respostas de bloqueio.
 * @dependencies @supabase/ssr, next/server, lib/env e lib/preview.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isSanityConfigured } from '@/lib/env';
import { previewCookieOptions } from '@/lib/preview/config';
import { PREVIEW_COOKIE } from '@/lib/preview/session';
import { probeSanityAvailability } from '@/lib/sanity/client';
import {
  isArticleAccessible,
  verifyPreviewSession,
  PreviewStoreUnavailableError,
  ContentUnavailableError,
} from '@/lib/preview/auth';
import { securityHeaders } from '@/lib/security-headers';

/**
 * Monta a resposta 503 de indisponibilidade, fixa antes de o streaming começar.
 *
 * O corpo é HTML estático e sem conteúdo editorial: falha fechada não vaza
 * rascunho nem diagnostica qual fonte caiu para quem estiver lendo a resposta.
 * Cookies vivos da requisição são reaplicados para não perder refresh de sessão.
 * Os headers de segurança entram porque resposta construída à mão não passa
 * pelo `headers()` do `next.config.ts` — sem eles a home 503 ficava sem CSP.
 *
 * @param response - Resposta parcial que carrega os cookies a preservar.
 * @returns Resposta 503 com `private, no-store`, `noindex, nofollow` e os
 *   headers de segurança de `lib/security-headers`.
 */
function unavailableResponse(response: NextResponse): NextResponse {
  const unavailable = new NextResponse(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Serviço indisponível</title><body><h1>Serviço temporariamente indisponível</h1><p>Tente novamente em alguns instantes.</p></body></html>',
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        ...securityHeaders({
          isProduction: env.isProduction,
          siteUrl: env.siteUrl,
        }),
      },
    },
  );
  response.cookies
    .getAll()
    .forEach((cookie) => unavailable.cookies.set(cookie));
  return unavailable;
}

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
 * @fileoverview Renova a sessão e protege rotas a cada requisição.
 * @param request - Requisição corrente: fornece cookies, pathname e a URL usada
 *   no rewrite de artigo inacessível.
 * @returns Response com a sessão reescrita nos cookies; ou rewrite para
 *   `/_not-found` com status 404 quando o artigo não é acessível ao leitor;
 *   ou 503 quando o Durable Object ou a fonte de conteúdo está indisponível.
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
    (request.nextUrl.pathname.startsWith('/artigos/') &&
      !request.nextUrl.pathname.includes('.')) ||
    request.nextUrl.pathname.startsWith('/preview') ||
    request.nextUrl.pathname.startsWith('/api/preview')
  ) {
    // Artigo e preview mudam conforme a sessão (rascunho visível só no
    // preview): no-store impede CDN/browser de servir a variação errada a
    // partir de cache compartilhado.
    response.headers.set('Cache-Control', 'private, no-store');
  }

  if (
    request.nextUrl.pathname.startsWith('/admin-dashboard') ||
    request.nextUrl.pathname.startsWith('/api/admin')
  ) {
    // Painel administrativo nunca é público nem indexável (spec 0007).
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Sonda de disponibilidade editorial da Home (`/`) antes do streaming iniciar (Spec 0006, 3.C).
  // Só executa quando o Sanity está configurado/ativo; com rollback para Supabase, a sonda é pulada.
  if (request.nextUrl.pathname === '/') {
    if (isSanityConfigured) {
      try {
        await probeSanityAvailability();
      } catch (error) {
        if (error instanceof ContentUnavailableError) {
          return unavailableResponse(response);
        }
        throw error;
      }
    }
  }

  // Intercepta rotas de artigo dinâmico `/artigos/[slug]` para garantir que
  // inexistente, rascunho sem preview ou data futura devolva status HTTP 404
  // antes do streaming do layout iniciar (evitando o "soft 200" do streaming).
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  if (
    segments.length === 2 &&
    segments[0] === 'artigos' &&
    segments[1] &&
    !segments[1].includes('.')
  ) {
    const slug = segments[1];
    const previewCookie = request.cookies.get(PREVIEW_COOKIE)?.value;
    let accessible: boolean;
    try {
      // A leitura pública precede o DO para não tornar sua disponibilidade
      // obrigatória: artigo público responde sem tocar o armazenamento.
      accessible = await isArticleAccessible(supabase, slug, false);
      if (!accessible) {
        const isPreview = await verifyPreviewSession(supabase, previewCookie);
        accessible =
          isPreview && (await isArticleAccessible(supabase, slug, true));
      }
    } catch (error) {
      // DO ou fonte de conteúdo fora do ar: o 503 precisa sair aqui, antes que
      // qualquer layout comece o streaming e o Next responda 200 com a UI de
      // erro (soft 200). Erro inesperado segue para o tratador global.
      if (
        error instanceof PreviewStoreUnavailableError ||
        error instanceof ContentUnavailableError
      ) {
        return unavailableResponse(response);
      }
      throw error;
    }

    if (!accessible) {
      // Copiar os headers de next() também copiaria x-middleware-next: 1,
      // contradizendo o rewrite de bloqueio. Só os cookies precisam sobreviver.
      // Os headers de segurança entram pelo mesmo motivo do 503: resposta
      // montada à mão não passa pelo `headers()` do next.config.
      const blocked = NextResponse.rewrite(
        new URL('/_not-found', request.url),
        {
          status: 404,
          request: { headers: request.headers },
          headers: {
            'Cache-Control': 'private, no-store',
            ...securityHeaders({
              isProduction: env.isProduction,
              siteUrl: env.siteUrl,
            }),
          },
        },
      );
      response.cookies
        .getAll()
        .forEach((cookie) => blocked.cookies.set(cookie));
      return blocked;
    }
  }

  return response;
}
