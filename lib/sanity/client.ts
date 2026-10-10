/**
 * @fileoverview Cliente HTTP server-side para consulta à API do Sanity Content Lake.
 * @module lib/sanity/client
 * @description Realiza consultas GROQ diretamente pela API REST do Sanity em tempo de execução no
 *   servidor/Worker, sem incluir tokens no bundle JavaScript do cliente.
 *   Separa consultas públicas (apenas documentos publicados) de consultas de preview
 *   (que incluem rascunhos sob autorização). Converte os documentos do Sanity para
 *   a interface de domínio `Post` do GradualInfo.
 * @dependencies lib/env (configurações do Sanity), lib/services/posts (tipo Post).
 */
import { env, isSanityConfigured } from '@/lib/env';
import type { Post } from '@/lib/services/posts';
import { ContentUnavailableError } from '@/lib/errors/content';

/**
 * Interface do documento Sanity conforme modelagem editorial.
 */
export interface SanityPostDocument {
  _id: string;
  _type: 'post' | 'artigo';
  _createdAt: string;
  _updatedAt: string;
  title: string;
  slug?: { current: string } | string;
  excerpt?: string;
  content?: string;
  body?: string;
  coverImage?: {
    url?: string;
    asset?: { url?: string; _ref?: string };
  };
  cover_image_url?: string;
  editoria?: string;
  author?: {
    name?: string;
  };
  author_name?: string;
  fontesCitadas?: Array<{ titulo: string; url: string }>;
  fontes_citadas?: Array<{ titulo: string; url: string }>;
  publishedAt?: string;
  published_at?: string;
  status?: 'rascunho' | 'publicado' | 'arquivado';
}

/**
 * Converte um documento retornado pelo Sanity no modelo unificado `Post`.
 *
 * @param doc - Documento bruto vindo do Sanity.
 * @returns Instância padronizada de `Post`.
 */
export function mapSanityDocumentToPost(doc: SanityPostDocument): Post {
  const isDraft = doc._id.startsWith('drafts.');
  const slug =
    typeof doc.slug === 'string'
      ? doc.slug
      : doc.slug?.current || doc._id.replace(/^drafts\./, '');

  const coverUrl =
    doc.cover_image_url ||
    doc.coverImage?.url ||
    doc.coverImage?.asset?.url ||
    '';

  const author = doc.author_name || doc.author?.name || 'Redação GradualInfo';
  const fontes = doc.fontes_citadas || doc.fontesCitadas || [];
  const publishedAt = doc.published_at || doc.publishedAt || null;

  return {
    id: doc._id,
    slug,
    title: doc.title || 'Sem título',
    content: doc.content || doc.body || '',
    excerpt: doc.excerpt || '',
    cover_image_url: coverUrl,
    editoria: doc.editoria || 'Tecnologia',
    author_name: author,
    fontes_citadas: fontes,
    status: isDraft ? 'rascunho' : doc.status || 'publicado',
    published_at: publishedAt,
    updated_at: doc._updatedAt || new Date().toISOString(),
    created_at: doc._createdAt || new Date().toISOString(),
  };
}

/**
 * Executa uma consulta GROQ contra o Sanity Content Lake via HTTP fetch.
 *
 * @param query - String da consulta GROQ.
 * @param params - Parâmetros da consulta.
 * @param isPreview - Se verdadeiro, inclui token de leitura privado para acessar rascunhos.
 * @returns Array de documentos tipados.
 */
export async function executeSanityQuery<T = unknown>(
  query: string,
  params: Record<string, string | number | boolean> = {},
  isPreview = false,
  options?: { timeoutMs?: number },
): Promise<T[]> {
  if (!isSanityConfigured) {
    return [];
  }

  const { projectId, dataset, apiVersion, readToken } = env.sanity;
  const baseUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;

  const url = new URL(baseUrl);
  url.searchParams.set('query', query);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (isPreview && readToken) {
    headers.Authorization = `Bearer ${readToken}`;
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ContentUnavailableError) {
      throw error;
    }
    throw new ContentUnavailableError(
      `Falha na conexão com o Sanity: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ContentUnavailableError(
      `Falha na consulta ao Sanity (HTTP ${response.status})`,
    );
  }

  try {
    const data = (await response.json()) as { result?: T[] };
    return data.result || [];
  } catch {
    throw new ContentUnavailableError(
      'Resposta inválida do Sanity Content Lake.',
    );
  }
}

/**
 * Sonda leve de disponibilidade da fonte Sanity para uso no proxy antes do streaming da Home.
 *
 * Executa uma consulta GROQ mínima com timeout rígido de 800ms sem cache.
 *
 * @throws ContentUnavailableError quando a fonte não responder ou estourar o timeout de 800ms.
 */
export async function probeSanityAvailability(): Promise<void> {
  const query =
    '*[_type in ["post", "artigo"] && (!defined(status) || status == "publicado")][0]._id';
  await executeSanityQuery(query, {}, false, { timeoutMs: 800 });
}

/**
 * Busca artigos publicados no Sanity para exibição na home ou listagens públicas.
 *
 * @param limit - Quantidade máxima de artigos.
 * @returns Lista de posts publicados ordenados por data decrescente.
 */
export async function getSanityPublishedPosts(limit = 10): Promise<Post[]> {
  const now = new Date().toISOString();
  // Exclui rascunhos, posts agendados no futuro e posts com status diferente de publicado
  const query = `*[_type in ["post", "artigo"] && !(_id in path("drafts.**")) && (!defined(status) || status == "publicado") && (!defined(publishedAt) || publishedAt <= $now) && defined(slug.current)] | order(publishedAt desc, _createdAt desc)[0...${limit}]`;
  const docs = await executeSanityQuery<SanityPostDocument>(
    query,
    { now },
    false,
  );
  return docs.map(mapSanityDocumentToPost);
}

/**
 * Busca um artigo pelo slug no Sanity.
 *
 * @param slug - Slug do artigo desejado.
 * @param options - Se `isPreview: true`, busca também rascunhos correspondentes e publicações futuras.
 * @returns O post encontrado ou `null`.
 */
export async function getSanityPostBySlug(
  slug: string,
  options: { isPreview?: boolean } = {},
): Promise<Post | null> {
  const isPreview = Boolean(options.isPreview);
  const now = new Date().toISOString();

  // Em preview: permite drafts e posts agendados, priorizando versão rascunho se existir
  // Em público: restrito a posts não-draft, com status publicado e data passada
  const query = isPreview
    ? `*[_type in ["post", "artigo"] && slug.current == $slug] | order(_id match "drafts.*" desc)[0]`
    : `*[_type in ["post", "artigo"] && slug.current == $slug && !(_id in path("drafts.**")) && (!defined(status) || status == "publicado") && (!defined(publishedAt) || publishedAt <= $now)][0]`;

  const docs = await executeSanityQuery<SanityPostDocument>(
    query,
    isPreview ? { slug } : { slug, now },
    isPreview,
  );

  const doc = Array.isArray(docs) ? docs[0] : docs;
  if (!doc) {
    return null;
  }

  return mapSanityDocumentToPost(doc);
}
