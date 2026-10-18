/**
 * @fileoverview Testes unitários da busca textual de artigos e utilitários de fuzzy match.
 * @module __tests__/unit/lib/search-posts.test
 * @description Comprova normalização, tolerância a digitação (Levenshtein Damerau), recorte por editoria, relevância ponderada e paginação — busca/AC-01 a busca/AC-06.
 * @dependencies vitest, lib/utils/search-posts, lib/utils/fuzzy-match.
 */
import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/services/posts';
import {
  searchPosts,
  searchPostsWithFilters,
  normalize,
} from '@/lib/utils/search-posts';
import {
  damerauLevenshtein,
  maxAllowedDistance,
  matchTermInWord,
} from '@/lib/utils/fuzzy-match';

const basePost: Post = {
  id: '1',
  slug: 'artigo-base',
  title: 'Artigo Base',
  excerpt: 'Resumo do artigo',
  content: 'Conteúdo textual completo do artigo',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'Autor Teste',
  fontes_citadas: [],
  status: 'publicado',
  published_at: '2026-10-15T12:00:00Z',
  updated_at: '2026-10-15T12:00:00Z',
  created_at: '2026-10-15T12:00:00Z',
};

describe('fuzzy-match', () => {
  it('calcula a distância Levenshtein Damerau com transposições', () => {
    expect(damerauLevenshtein('teclado', 'teclado')).toBe(0);
    expect(damerauLevenshtein('teclado', 'telcado')).toBe(1); // transposição
    expect(damerauLevenshtein('artifisial', 'artificial')).toBe(1); // substituição
    expect(damerauLevenshtein('prograamacao', 'programacao')).toBe(1); // inserção
    expect(damerauLevenshtein('teste', '')).toBe(5);
    expect(damerauLevenshtein('', 'teste')).toBe(5);
  });

  it('aplica limites proporcionais de distância conforme busca/AC-03', () => {
    expect(maxAllowedDistance(2)).toBe(0);
    expect(maxAllowedDistance(4)).toBe(0);
    expect(maxAllowedDistance(5)).toBe(1);
    expect(maxAllowedDistance(8)).toBe(1);
    expect(maxAllowedDistance(9)).toBe(2);
    expect(maxAllowedDistance(15)).toBe(2);
  });

  it('avalia palavras com regras estritas para termos curtos (<= 4) e tolerância para longos', () => {
    // Termo curto: aceita exato ou prefixo
    expect(matchTermInWord('nextjs', 'next')).toEqual({
      matched: true,
      exact: true,
    });
    expect(matchTermInWord('next', 'next')).toEqual({
      matched: true,
      exact: true,
    });
    // Termo curto: rejeita 1 edição
    expect(matchTermInWord('next', 'nxt')).toEqual({
      matched: false,
      exact: false,
    });

    // Termo médio (5 a 8 chars): aceita 1 edição
    expect(matchTermInWord('seguranca', 'seguramca')).toEqual({
      matched: true,
      exact: false,
    });
    expect(matchTermInWord('seguranca', 'segurxx')).toEqual({
      matched: false,
      exact: false,
    });

    // Termo longo (> 8 chars): aceita até 2 edições
    expect(matchTermInWord('inteligencia', 'inteligensia')).toEqual({
      matched: true,
      exact: false,
    });
    expect(matchTermInWord('artificial', 'artifisial')).toEqual({
      matched: true,
      exact: false,
    });
  });
});

describe('searchPosts e searchPostsWithFilters', () => {
  it('normaliza caracteres removendo diacríticos e convertendo para minúsculas', () => {
    expect(normalize('Atenção Épica Ímpar Órbita Úmido Ç')).toBe(
      'atencao epica impar orbita umido c',
    );
  });

  it('encontra correspondência exata nos campos título, resumo, editoria e corpo (busca/AC-02)', () => {
    const p1 = {
      ...basePost,
      id: '1',
      slug: 'p1',
      title: 'Segurança em Nuvem',
    };
    const p2 = {
      ...basePost,
      id: '2',
      slug: 'p2',
      excerpt: 'Guia de criptografia',
    };
    const p3 = {
      ...basePost,
      id: '3',
      slug: 'p3',
      editoria: 'Segurança Digital',
    };
    const p4 = {
      ...basePost,
      id: '4',
      slug: 'p4',
      content: 'Auditoria de firewall',
    };

    const catalog = [p1, p2, p3, p4];

    expect(searchPosts(catalog, 'nuvem')).toEqual([p1]);
    expect(searchPosts(catalog, 'criptografia')).toEqual([p2]);
    expect(searchPosts(catalog, 'digital')).toEqual([p3]);
    expect(searchPosts(catalog, 'firewall')).toEqual([p4]);
  });

  it('permite encontrar artigos com pequenos erros de digitação (busca/AC-03)', () => {
    const aiPost = {
      ...basePost,
      id: 'ai',
      slug: 'ai',
      title: 'Inteligência Artificial na Medicina',
      excerpt: 'Modelos neurais aplicados a diagnósticos',
    };

    const res = searchPosts([aiPost], 'inteligensia artifisial');
    expect(res).toEqual([aiPost]);
  });

  it('restringe resultados pela editoria informada quando válida (busca/AC-04)', () => {
    const t1 = {
      ...basePost,
      id: '1',
      slug: 't1',
      editoria: 'Tecnologia',
      title: 'Novidades Tech',
    };
    const s1 = {
      ...basePost,
      id: '2',
      slug: 's1',
      editoria: 'Segurança',
      title: 'Novidades de Segurança',
    };

    const catalog = [t1, s1];

    const techOnly = searchPostsWithFilters(catalog, {
      query: 'novidades',
      editoria: 'Tecnologia',
    });
    expect(techOnly.items).toEqual([t1]);
    expect(techOnly.activeEditoria).toBe('Tecnologia');

    const segOnly = searchPostsWithFilters(catalog, {
      query: 'novidades',
      editoria: 'seguranca', // normalizado sem acento
    });
    expect(segOnly.items).toEqual([s1]);
    expect(segOnly.activeEditoria).toBe('Segurança');
  });

  it('ignora editoria desconhecida ou "todas" retornando todas as categorias (busca/AC-04)', () => {
    const t1 = {
      ...basePost,
      id: '1',
      slug: 't1',
      editoria: 'Tecnologia',
      title: 'Guia 1',
    };
    const s1 = {
      ...basePost,
      id: '2',
      slug: 's1',
      editoria: 'Segurança',
      title: 'Guia 2',
    };

    const catalog = [t1, s1];

    const todas = searchPostsWithFilters(catalog, {
      query: 'guia',
      editoria: 'todas',
    });
    expect(todas.items).toHaveLength(2);
    expect(todas.activeEditoria).toBeUndefined();

    const desconhecida = searchPostsWithFilters(catalog, {
      query: 'guia',
      editoria: 'Inexistente',
    });
    expect(desconhecida.items).toHaveLength(2);
    expect(desconhecida.activeEditoria).toBeUndefined();
  });

  it('classifica por relevância ponderada e usa data recente como desempate (busca/AC-05)', () => {
    // pExactTitle: título tem correspondência exata (peso 4)
    const pExactTitle = {
      ...basePost,
      id: 'exact',
      slug: 'exact',
      title: 'Aprender Programação Rápido',
      content: 'conteudo neutro',
      published_at: '2026-01-01T00:00:00Z',
    };

    // pApproxTitle: título tem correspondência aproximada com typo (peso 3)
    const pApproxTitle = {
      ...basePost,
      id: 'approx',
      slug: 'approx',
      title: 'Aprender Prograamacao Rápido',
      content: 'conteudo neutro',
      published_at: '2026-05-01T00:00:00Z',
    };

    // pBodyOnly: apenas corpo tem match (peso 1)
    const pBodyOnly = {
      ...basePost,
      id: 'body',
      slug: 'body',
      title: 'Outro Assunto',
      content: 'Aprender Programação em 2026',
      published_at: '2026-09-01T00:00:00Z',
    };

    const sorted = searchPosts(
      [pBodyOnly, pApproxTitle, pExactTitle],
      'programacao',
    );
    expect(sorted[0]?.slug).toBe('exact');

    // Desempate por data quando o score for igual
    const dateOld = {
      ...basePost,
      id: 'old',
      slug: 'old',
      title: 'React 19 Hooks',
      published_at: '2026-01-01T00:00:00Z',
    };
    const dateNew = {
      ...basePost,
      id: 'new',
      slug: 'new',
      title: 'React 19 Hooks',
      published_at: '2026-06-01T00:00:00Z',
    };

    const dateSorted = searchPosts([dateOld, dateNew], 'react');
    expect(dateSorted[0]?.slug).toBe('new');
    expect(dateSorted[1]?.slug).toBe('old');
  });

  it('pagina os resultados respeitando o tamanho de página e preserva metadados (busca/AC-06)', () => {
    const manyPosts = Array.from({ length: 25 }, (_, i) => ({
      ...basePost,
      id: `post-${i + 1}`,
      slug: `post-${i + 1}`,
      title: `Artigo TypeScript ${i + 1}`,
      published_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const page1 = searchPostsWithFilters(manyPosts, {
      query: 'typescript',
      page: 1,
      pageSize: 20,
    });

    expect(page1.totalMatches).toBe(25);
    expect(page1.totalPages).toBe(2);
    expect(page1.currentPage).toBe(1);
    expect(page1.items).toHaveLength(20);

    const page2 = searchPostsWithFilters(manyPosts, {
      query: 'typescript',
      page: 2,
      pageSize: 20,
    });

    expect(page2.currentPage).toBe(2);
    expect(page2.items).toHaveLength(5);
  });
});
