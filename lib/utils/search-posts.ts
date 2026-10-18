/**
 * @fileoverview Busca textual no catálogo público de artigos com suporte a recorte por editoria e tolerância a erros de digitação.
 * @module lib/utils/search-posts
 * @description Compara palavras sem diferenciar acentos ou maiúsculas, aceita pequenas variações ortográficas e prioriza títulos e datas recentes.
 * @dependencies lib/services/posts, lib/utils/fuzzy-match.
 */
import type { Post } from '@/lib/services/posts';
import {
  extractUniqueWords,
  matchTermInWordList,
} from '@/lib/utils/fuzzy-match';

/**
 * Normaliza uma cadeia de texto removendo diacríticos e convertendo para minúsculas.
 *
 * @param value Texto de entrada.
 * @returns Texto normalizado em minúsculas e sem acentos.
 */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export interface SearchFilterOptions {
  query: string;
  editoria?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: Post[];
  totalMatches: number;
  currentPage: number;
  totalPages: number;
  availableEditorias: string[];
  activeEditoria?: string;
}

/**
 * Pesquisa e filtra artigos com tolerância a erros de digitação, recorte por editoria, pontuação ponderada e paginação.
 *
 * @param posts Lista de artigos autorizados para leitura pública.
 * @param options Parâmetros de pesquisa, editoria e paginação.
 * @returns Estrutura com os artigos da página atual, metadados de paginação e lista de editorias disponíveis.
 */
export function searchPostsWithFilters(
  posts: Post[],
  options: SearchFilterOptions,
): SearchResult {
  const availableEditorias = Array.from(
    new Set(
      posts
        .map((p) => p.editoria?.trim())
        .filter((e): e is string => Boolean(e)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const rawEditoria = options.editoria?.trim();
  let activeEditoria: string | undefined = undefined;

  if (rawEditoria && normalize(rawEditoria) !== 'todas') {
    const matched = availableEditorias.find(
      (e) => normalize(e) === normalize(rawEditoria),
    );
    if (matched) {
      activeEditoria = matched;
    }
  }

  // Filtragem estrita por editoria quando válida (busca/AC-04)
  const scopedPosts = activeEditoria
    ? posts.filter((p) => p.editoria === activeEditoria)
    : posts;

  const rawQuery = options.query?.trim() ?? '';
  const terms = normalize(rawQuery).split(/\s+/).filter(Boolean);

  // Sem termos de pesquisa: retorna vazio se não houver query
  if (terms.length === 0) {
    return {
      items: [],
      totalMatches: 0,
      currentPage: 1,
      totalPages: 0,
      availableEditorias,
      activeEditoria,
    };
  }

  // Avaliação e ranqueamento ponderado (busca/AC-02, busca/AC-03, busca/AC-05)
  const scored = scopedPosts
    .map((post, index) => {
      const titleNorm = normalize(post.title ?? '');
      const excerptNorm = normalize(post.excerpt ?? '');
      const editoriaNorm = normalize(post.editoria ?? '');
      const bodyNorm = normalize(post.content ?? '');

      const titleWords = extractUniqueWords(titleNorm);
      const excerptWords = extractUniqueWords(excerptNorm);
      const editoriaWords = extractUniqueWords(editoriaNorm);
      const bodyWords = extractUniqueWords(bodyNorm);

      let totalScore = 0;

      // Todos os termos pesquisados devem coincidir em ao menos um campo
      for (const term of terms) {
        let termMatched = false;
        let termScore = 0;

        // Título: exato peso 4, aproximado peso 3
        if (titleNorm.includes(term)) {
          termMatched = true;
          termScore = Math.max(termScore, 4);
        } else {
          const evalTitle = matchTermInWordList(titleWords, term);
          if (evalTitle.matched) {
            termMatched = true;
            termScore = Math.max(termScore, evalTitle.exact ? 4 : 3);
          }
        }

        // Resumo: exato peso 2, aproximado peso 1.5
        if (excerptNorm.includes(term)) {
          termMatched = true;
          termScore = Math.max(termScore, 2);
        } else {
          const evalExcerpt = matchTermInWordList(excerptWords, term);
          if (evalExcerpt.matched) {
            termMatched = true;
            termScore = Math.max(termScore, evalExcerpt.exact ? 2 : 1.5);
          }
        }

        // Editoria: exato peso 2, aproximado peso 1.5
        if (editoriaNorm.includes(term)) {
          termMatched = true;
          termScore = Math.max(termScore, 2);
        } else {
          const evalEd = matchTermInWordList(editoriaWords, term);
          if (evalEd.matched) {
            termMatched = true;
            termScore = Math.max(termScore, evalEd.exact ? 2 : 1.5);
          }
        }

        // Corpo: exato peso 1, aproximado peso 0.5
        if (bodyNorm.includes(term)) {
          termMatched = true;
          termScore = Math.max(termScore, 1);
        } else {
          const evalBody = matchTermInWordList(bodyWords, term);
          if (evalBody.matched) {
            termMatched = true;
            termScore = Math.max(termScore, evalBody.exact ? 1 : 0.5);
          }
        }

        if (!termMatched) {
          return null;
        }

        totalScore += termScore;
      }

      return {
        post,
        index,
        score: totalScore,
        publishedTime: post.published_at
          ? new Date(post.published_at).getTime()
          : 0,
      };
    })
    .filter(
      (
        item,
      ): item is {
        post: Post;
        index: number;
        score: number;
        publishedTime: number;
      } => item !== null,
    )
    .sort((a, b) => {
      // 1. Pontuação de relevância decrescente
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. Data de publicação mais recente (busca/AC-05)
      if (b.publishedTime !== a.publishedTime) {
        return b.publishedTime - a.publishedTime;
      }
      // 3. Ordem original do catálogo
      return a.index - b.index;
    })
    .map((item) => item.post);

  const totalMatches = scored.length;
  const pageSize = Math.max(1, options.pageSize ?? 20);
  const totalPages = Math.ceil(totalMatches / pageSize);
  const requestedPage = Math.max(1, options.page ?? 1);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const startIndex = (currentPage - 1) * pageSize;
  const items = scored.slice(startIndex, startIndex + pageSize);

  return {
    items,
    totalMatches,
    currentPage,
    totalPages,
    availableEditorias,
    activeEditoria,
  };
}

/**
 * Filtra artigos visíveis cujo título, resumo, editoria ou corpo contenha todos os termos.
 * Preserva compatibilidade estrita com a assinatura anterior de searchPosts.
 *
 * @param posts Artigos já autorizados pelo serviço de leitura pública.
 * @param query Termos digitados pelo leitor.
 * @param editoria Recorte opcional por editoria.
 * @returns Lista de correspondências ordenadas por relevância e data.
 */
export function searchPosts(
  posts: Post[],
  query: string,
  editoria?: string,
): Post[] {
  return searchPostsWithFilters(posts, {
    query,
    editoria,
    page: 1,
    pageSize: 500,
  }).items;
}
