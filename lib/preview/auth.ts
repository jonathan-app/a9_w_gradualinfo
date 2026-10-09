/**
 * @fileoverview Verificação de sessão e autorização de preview via Cloudflare Durable Object e Supabase.
 * @module lib/preview/auth
 * @description Centraliza as regras de autorização de preview compartilhadas entre o proxy,
 *   rotas de API e Server Components. Implementa a semântica de falha fechada estrita:
 *   - Sessão inválida, expirada ou revogada + artigo não público -> 404 Not Found;
 *   - Durable Object indisponível durante a autorização -> 503 Service Unavailable (sem entregar rascunho);
 *   - Artigo público -> 200 OK diretamente, sem exigir nem depender do status de preview.
 * @dependencies @supabase/supabase-js, lib/env, lib/preview/session, lib/preview/durable-object.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { isPreviewConfigured } from '@/lib/preview/config';
import { readPreviewGrant } from '@/lib/preview/session';
import { getPreviewSessionStore } from '@/lib/preview/durable-object';
import { getSanityPostBySlug } from '@/lib/sanity/client';

/**
 * Resultado da avaliação de autorização de preview.
 */
export interface PreviewAuthResult {
  authorized: boolean;
  status: 200 | 404 | 503;
  reason?:
    'valid' | 'invalid_grant' | 'revoked' | 'expired' | 'store_unavailable';
  sessionId?: string;
}

/**
 * Valida se o cookie de preview confere acesso ativo via Cloudflare Durable Object.
 *
 * @param previewCookieValue - Valor bruto do cookie `gradualinfo-preview`.
 * @returns `PreviewAuthResult` com o status discriminado: 200 (autorizado),
 *   404 (inválido/expirado/revogado) ou 503 (Durable Object indisponível).
 */
export async function verifyDurableObjectPreviewSession(
  previewCookieValue?: string,
): Promise<PreviewAuthResult> {
  // Lê o grant criptográfico HMAC-SHA256
  const grant = readPreviewGrant(previewCookieValue, env.previewSigningKey);
  if (!grant) {
    return { authorized: false, status: 404, reason: 'invalid_grant' };
  }

  try {
    const store = getPreviewSessionStore();
    const result = await store.validateSession(grant.session_id);

    if (result.revoked) {
      return { authorized: false, status: 404, reason: 'revoked' };
    }
    if (result.expired) {
      return { authorized: false, status: 404, reason: 'expired' };
    }
    if (!result.valid) {
      return { authorized: false, status: 404, reason: 'invalid_grant' };
    }

    return {
      authorized: true,
      status: 200,
      sessionId: grant.session_id,
      reason: 'valid',
    };
  } catch {
    // Falha fechada: indisponibilidade do armazenamento responde 503 sem liberar rascunho
    return { authorized: false, status: 503, reason: 'store_unavailable' };
  }
}

/**
 * Avalia o acesso a um artigo distinguindo conteúdo público, rascunho e falha de infraestrutura.
 *
 * @param params - Dados da requisição e do artigo a verificar.
 * @returns Decisão de acesso com status HTTP e flag de preview.
 */
export async function evaluateArticleAccess(params: {
  isPublicArticle: boolean;
  previewCookieValue?: string;
}): Promise<{
  accessible: boolean;
  status: 200 | 404 | 503;
  isPreview: boolean;
}> {
  // 1. Artigo público: sempre acessível via leitura pública normal sem depender de preview
  if (params.isPublicArticle) {
    return { accessible: true, status: 200, isPreview: false };
  }

  // 2. Artigo não público: exige autorização no Durable Object
  const auth = await verifyDurableObjectPreviewSession(
    params.previewCookieValue,
  );
  if (auth.authorized) {
    return { accessible: true, status: 200, isPreview: true };
  }

  // Falha fechada discriminada:
  // Se o DO estiver indisponível -> 503 (não mascarar falha de infra como 404)
  // Se sessão for inválida/expirada/revogada -> 404 (preserva o sigilo do rascunho)
  return {
    accessible: false,
    status: auth.status,
    isPreview: false,
  };
}

/**
 * Verificação legado do Supabase Auth (mantida para compatibilidade transitória).
 *
 * @param supabase - Cliente Supabase.
 * @param previewCookieValue - Valor do cookie.
 * @returns boolean indicando se a sessão é válida no Supabase Auth.
 */
export async function verifyPreviewSession(
  supabase: SupabaseClient,
  previewCookieValue?: string,
): Promise<boolean> {
  // Se houver grant assinado com a nova chave e DO ativo, avalia pelo DO
  const doResult = await verifyDurableObjectPreviewSession(previewCookieValue);
  if (doResult.authorized) {
    return true;
  }

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
  // Transição editorial da spec 0006: Sanity como fonte primária única
  if (env.sanity?.projectId && env.sanity?.dataset) {
    try {
      const post = await getSanityPostBySlug(slug, { isPreview });
      return Boolean(post);
    } catch {
      // Erros de infraestrutura transitória não devem gerar falso 404; deixa fluir para a página
      return true;
    }
  }

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
