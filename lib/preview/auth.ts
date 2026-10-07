import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { isPreviewConfigured } from '@/lib/preview/config';
import { readPreviewGrant } from '@/lib/preview/session';

/**
 * lib/preview/auth.ts — verificação de sessão e autorização de preview
 * @fileoverview Sessão e autorização de preview, compartilhadas com o proxy.
 *
 * Compartilhado entre Server Components e o Proxy/Middleware.
 * Não importa `next/headers` para poder rodar de forma segura em ambos os runtimes.
 */
export async function verifyPreviewSession(
  supabase: SupabaseClient,
  previewCookieValue?: string,
): Promise<boolean> {
  if (!isPreviewConfigured()) return false;
  const grant = readPreviewGrant(previewCookieValue, env.previewToken);
  if (!grant || grant.sub !== env.previewUserId) return false;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      user.id !== grant.sub ||
      ![true, 'true'].includes(user.app_metadata?.preview)
    ) {
      return false;
    }
    const { data, error: claimsError } = await supabase.auth.getClaims();
    return (
      !claimsError &&
      data?.claims?.sub === user.id &&
      data?.claims?.session_id === grant.session_id
    );
  } catch {
    return false;
  }
}

/**
 * Checa se um artigo por slug está acessível para o usuário atual (público ou preview).
 * Retorna true caso o artigo exista e seja legível, ou se ocorrer erro transitório
 * de infraestrutura (para não mascarar falhas de banco com 404 indevido).
 */
export async function isArticleAccessible(
  supabase: SupabaseClient,
  slug: string,
  isPreview: boolean,
): Promise<boolean> {
  const reader = isPreview
    ? supabase
    : createClient(env.supabase.url, env.supabase.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

  let query = reader.from('posts').select('id').eq('slug', slug);

  if (!isPreview) {
    query = query
      .eq('status', 'publicado')
      .lte('published_at', new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    // Erros no banco não devem gerar falsos 404 no middleware; deixa fluir para a página
    return true;
  }

  return Boolean(data);
}
