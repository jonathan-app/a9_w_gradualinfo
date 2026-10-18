/**
 * @fileoverview lib/services/editorial-dashboard.ts — serviço de consulta editorial paginada para o dashboard administrativo
 * @module lib/services/editorial-dashboard
 * @description Carrega no servidor artigos publicados e rascunhos do Sanity Content Lake com autenticação privada
 *   (readToken) e paginação, ou do catálogo local caso isLocalEditorialMode esteja ativo. Fornece estados
 *   explícitos de vazio, erro contido e não configurado.
 * @dependencies server-only, @/lib/env, @/lib/sanity/client, @/lib/editorial/local-posts
 */
import 'server-only';

import { env, isSanityConfigured } from '@/lib/env';
import {
  executeSanityQuery,
  mapSanityDocumentToPost,
  type SanityPostDocument,
} from '@/lib/sanity/client';
import { getLocalPosts } from '@/lib/editorial/local-posts';
import type { Post } from '@/lib/services/posts';

export interface EditorialDashboardItem {
  id: string;
  slug: string;
  title: string;
  editoria: string;
  status: 'rascunho' | 'publicado' | 'arquivado';
  updatedAt: string;
}

export interface EditorialDashboardData {
  status: 'configured' | 'unconfigured' | 'empty' | 'error';
  posts: EditorialDashboardItem[];
  totalPosts: number;
  page: number;
  pageSize: number;
  source: 'sanity' | 'local' | 'none';
  errorMessage?: string;
}

interface GetEditorialDashboardOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Consulta a mesa editorial de artigos e rascunhos com suporte a paginação.
 *
 * @param options - Parâmetros de paginação (página e tamanho).
 * @returns EditorialDashboardData com estados contidos.
 */
export async function getEditorialDashboardData(
  options: GetEditorialDashboardOptions = {},
): Promise<EditorialDashboardData> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize ?? 10));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // 1. Prioridade para Sanity quando configurado
  if (isSanityConfigured) {
    try {
      // Consulta GROQ com token privado (isPreview = true) recuperando rascunhos e publicados
      const query = `*[_type in ["post", "artigo"]] | order(_updatedAt desc)[$start...$end]`;
      const countQuery = `count(*[_type in ["post", "artigo"]])`;

      const [docs, totalCountArr] = await Promise.all([
        executeSanityQuery<SanityPostDocument>(
          query,
          { start: startIndex, end: endIndex },
          true,
          { timeoutMs: 3000 },
        ),
        executeSanityQuery<number>(countQuery, {}, true, { timeoutMs: 3000 }),
      ]);

      const totalPosts =
        Array.isArray(totalCountArr) && typeof totalCountArr[0] === 'number'
          ? totalCountArr[0]
          : docs.length;

      if (!docs || docs.length === 0) {
        return {
          status: 'empty',
          posts: [],
          totalPosts: 0,
          page,
          pageSize,
          source: 'sanity',
        };
      }

      const posts: EditorialDashboardItem[] = docs.map((doc) => {
        const mapped = mapSanityDocumentToPost(doc);
        return {
          id: mapped.id,
          slug: mapped.slug,
          title: mapped.title,
          editoria: mapped.editoria,
          status: mapped.status,
          updatedAt: mapped.updated_at,
        };
      });

      return {
        status: 'configured',
        posts,
        totalPosts,
        page,
        pageSize,
        source: 'sanity',
      };
    } catch {
      return {
        status: 'error',
        posts: [],
        totalPosts: 0,
        page,
        pageSize,
        source: 'sanity',
        errorMessage:
          'Indisponibilidade momentânea na conexão com o Sanity Content Lake.',
      };
    }
  }

  // 2. Modo editorial local restrito (apenas se ativo explicitamente)
  if (env.editorialLocal) {
    try {
      const local = getLocalPosts();
      if (!local || local.length === 0) {
        return {
          status: 'empty',
          posts: [],
          totalPosts: 0,
          page,
          pageSize,
          source: 'local',
        };
      }

      const paginated = local.slice(startIndex, endIndex);
      const posts: EditorialDashboardItem[] = paginated.map((post: Post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        editoria: post.editoria,
        status: post.status,
        updatedAt: post.updated_at,
      }));

      return {
        status: 'configured',
        posts,
        totalPosts: local.length,
        page,
        pageSize,
        source: 'local',
      };
    } catch {
      return {
        status: 'error',
        posts: [],
        totalPosts: 0,
        page,
        pageSize,
        source: 'local',
        errorMessage: 'Falha ao ler catálogo editorial local.',
      };
    }
  }

  // 3. Nem Sanity nem modo local configurados
  return {
    status: 'unconfigured',
    posts: [],
    totalPosts: 0,
    page,
    pageSize,
    source: 'none',
    errorMessage: 'Sanity CMS não configurado no ambiente atual.',
  };
}
