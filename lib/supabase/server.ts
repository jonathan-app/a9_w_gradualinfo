import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * lib/supabase/server.ts — cliente Supabase para Server Components e Route Handlers
 *
 * `server-only` faz o erro aparecer em tempo de build, não em produção: se
 * algum Client Component importar este arquivo, o build quebra na hora em vez
 * de vazar chave para o browser.
 *
 * A sessão vive em cookie gerenciado pelo `@supabase/ssr`. `getAll` (e não
 * `get`) é o que o SSR espera: `get` só existe na versão anterior do Next e
 * deixa passar cookie undefined, o que derruba o refresh de token.
 *
 * Por que `async`: `cookies()` é assíncrono a partir do Next 15. Todo mundo
 * que chama esta função precisa de `await` — assinatura única, sem o bug
 * clássico de esquecer o await e receber `{}` em vez de cookie.
 *
 * @fileoverview Cliente Supabase do servidor, com sessão em cookie.
 * @returns Cliente `@supabase/ssr` com `getAll`/`setAll` encaixados no cookie
 *   store desta requisição; nenhum parâmetro — tudo vem de `env` e dos cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // `setAll` é chamado pelo Supabase quando ele renova o token. Num Server
      // Component o cookie é somente leitura: a tentativa é silenciosamente
      // ignorada e o refresh acontece no `proxy.ts`, que roda no meioRequest e
      // tem permissão de escrita. O `try/catch` existe porque o Supabase não
      // trata o erro de cookie readonly.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component: sem escrita de cookie.
        }
      },
    },
  });
}

/** Leitura pública não envia cookies nem tokens de sessões editoriais. */
export function createPublicClient() {
  return createSupabaseClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
