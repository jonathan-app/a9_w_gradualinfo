import { getLocalPosts, getLocalPostBySlug } from '@/lib/editorial/local-posts';
/**
 * @fileoverview Consultas de leitura de posts (camada de serviço).
 * @module lib/services/posts
 * @description Aplica as regras de visibilidade editorial por cima do Supabase: o público
 *   só enxerga `publicado` com data passada; sessão de preview enxerga também rascunho e
 *   agendado. Erros do banco são propagados (throw) para quem chama decidir o status HTTP.
 * @dependencies next/headers (cookie), @/lib/env, @/lib/preview/session,
 *   @/lib/preview/auth, @supabase/supabase-js.
 *
 * Quando executado: em Server Components e Route Handlers — nunca em Client Component,
 *   que não lê o cookie de preview de forma confiável.
 * Lê: cookie da requisição e tabelas `posts`. Escreve: nada.
 */
import { cookies } from 'next/headers';
import { env, isSanityConfigured } from '@/lib/env';
import { PREVIEW_COOKIE } from '@/lib/preview/session';
import { verifyPreviewSession } from '@/lib/preview/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSanityPublishedPosts,
  getSanityPostBySlug,
} from '@/lib/sanity/client';

/**
 * Avalia se o Sanity está configurado no objeto env para atuar como fonte primária.
 */
function isSanityActive(): boolean {
  return isSanityConfigured;
}

/**
 * Uma linha de `posts` no formato em que a UI consome. `status` espelha o enum
 * gravado na coluna (domínio em português: rascunho/publicado/arquivado) —
 * traduzir aqui quebraria a comparação direta com o valor do banco.
 */
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  editoria: string;
  author_name: string;
  fontes_citadas: Array<{ titulo: string; url: string }>;
  status: 'rascunho' | 'publicado' | 'arquivado';
  published_at: string | null;
  updated_at: string;
  created_at: string;
}
/**
 * Verifica se a requisição corrente tem sessão de preview válida.
 *
 * @param supabase - Cliente criado com o cookie store da requisição.
 * @returns `true` quando o cookie de preview passa na verificação completa
 *   (assinatura, prazo e usuário); `false` nos demais casos.
 */
export async function isPreviewSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PREVIEW_COOKIE)?.value;
  return verifyPreviewSession(supabase, cookieValue);
}

/**
 * Lista posts publicados, mais recentes primeiro.
 * Exceção explícita: a prévia de desenvolvimento usa somente o catálogo local.
 *
 * @param supabase - Cliente com a sessão do leitor.
 * @param [limit=10] - Máximo de linhas devolvidas.
 * @returns As linhas em ordem decrescente de `published_at`, já filtradas por
 *   status e por não estar com data no futuro.
 * @throws O erro do Supabase (inclusive de RLS) quando a consulta falha.
 */
export async function getPublishedPosts(
  supabase: SupabaseClient,
  limit = 10,
): Promise<Post[]> {
  if (env.editorialLocal) return getLocalPosts(limit);
  // Transição editorial da spec 0006: Sanity como fonte primária única
  if (isSanityActive()) {
    return getSanityPublishedPosts(limit);
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'publicado')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data as Post[];
}

/**
 * Busca um post pelo slug na visibilidade do leitor.
 * A prévia local, desativada em produção, não consulta nem altera rascunhos remotos.
 *
 * @param supabase - Cliente com a sessão do leitor (usado para detectar preview).
 * @param slug - Slug do artigo.
 * @returns O post, ou `null` quando não existe — ou não é visível: fora de
 *   preview, rascunho e publicação futura contam como invisível.
 * @throws O erro do Sanity ou Supabase quando a consulta falha.
 */
export async function getPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Post | null> {
  if (env.editorialLocal) return getLocalPostBySlug(slug);
  // Transição editorial da spec 0006: Sanity como fonte primária única
  if (isSanityActive()) {
    // Conteúdo público permanece legível mesmo com cookie de preview e DO indisponível.
    const publicPost = await getSanityPostBySlug(slug, { isPreview: false });
    if (publicPost) return publicPost;
    const isPreview = await isPreviewSession(supabase);
    if (!isPreview) return null;
    return getSanityPostBySlug(slug, { isPreview });
  }

  const isPreview = await isPreviewSession(supabase);

  // Uma sessão vencida não deve contaminar a consulta pública com JWT inválido.
  const reader = isPreview
    ? supabase
    : createClient(env.supabase.url, env.supabase.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
  let query = reader.from('posts').select('*').eq('slug', slug);

  // Leitor comum: a consulta nasce com os mesmos filtros de publicação da
  // lista pública — visibilidade não pode depender só do RLS do banco.
  if (!isPreview) {
    query = query
      .eq('status', 'publicado')
      .lte('published_at', new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as Post | null;
}
