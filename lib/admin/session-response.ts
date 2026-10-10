/**
 * @fileoverview Captura de cookies SSR para respostas administrativas.
 * @module lib/admin/session-response
 * @description Preserva as opções do SDK ao reconstruir respostas, sem copiar cookies recebidos.
 * @dependencies lib/supabase/server, @supabase/ssr, next/server.
 */
import type { CookieOptions } from '@supabase/ssr';
import type { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Cria cliente por requisição e finalizador de resposta com cookies do SDK.
 * @returns Cliente, finalizador e opção de descartar cookies de sessão recém-criada.
 */
export async function createAdminSessionResponse() {
  const updates = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const supabase = await createClient((cookies) => {
    for (const cookie of cookies) updates.set(cookie.name, cookie);
  });
  return {
    supabase,
    /**
     * Aplica cookies da autenticação na resposta definitiva.
     * @param response - Resposta a devolver ao navegador.
     * @param clear - Remove os cookies capturados quando identidade não foi autorizada.
     * @returns Resposta com atributos e cache privado.
     */
    finish(response: NextResponse, clear = false) {
      for (const { name, value, options } of updates.values()) {
        response.cookies.set(
          name,
          clear ? '' : value,
          clear ? { ...options, maxAge: 0, expires: new Date(0) } : options,
        );
      }
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    },
  };
}
