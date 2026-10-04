import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

/**
 * lib/supabase/middleware.ts — renova a sessão a cada requisição
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
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // A chamada em si é o que dispara o refresh. O retorno é descartado de
  // propósito: o objetivo aqui não é o usuário, é o cookie renovado.
  await supabase.auth.getUser();

  return response;
}
