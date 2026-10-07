import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * lib/supabase/client.ts — cliente Supabase para o navegador
 * @fileoverview Singleton do cliente Supabase para o navegador.
 *
 * Por que a instância é memorizada no módulo
 * `createBrowserClient` caches a sessão no cookie e dispara o refresh de token
 * quando o expira. Criar um cliente novo a cada render cria outro watcher: o
 * token é renewed em paralelo, o último a escrever ganha, e a sessão "pisca"
 * entre logado e deslogado. Guardar a instância em uma variável de módulo faz
 * o singleton existir uma vez por página.
 *
 * Importar este arquivo a partir de um Server Component quebra: ele usa
 * `document`. No servidor, use `@/lib/supabase/server`.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Devolve o singleton do cliente Supabase de browser.
 *
 * @returns A instância memorizada no módulo — a primeira chamada a cria, as
 *   seguintes devolvem a mesma; ver cabeçalho do arquivo para o porquê.
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabase.url, env.supabase.anonKey);
  }
  return browserClient;
}
