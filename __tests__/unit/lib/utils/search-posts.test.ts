/**
 * @fileoverview Testes unitários para search-posts.ts
 * @module __tests__/unit/lib/utils/search-posts
 * @description Testa normalize e searchPostsWithFilters.
 */

import { describe, expect, it } from 'vitest';

import { normalize, searchPostsWithFilters } from '@/lib/utils/search-posts';

import type { Post } from '@/lib/services/posts';

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: '1',
  slug: 'meu-artigo',
  title: 'Meu Artigo de Tecnologia',
  content: 'Conteúdo sobre tecnologia e inovação',
  excerpt: 'Resumo do artigo sobre tecnologia',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'Autor Teste',
  fontes_citadas: [],
  status: 'publicado',
  published_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-15T10:00:00Z',
  ...overrides,
});

describe('normalize', () => {
  it('remove acentos e converte para minusculas', () => {
    expect(normalize('Ção')).toBe('cao');
    expect(normalize('ÁÉÍÓÚ')).toBe('aeiou');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalize('')).toBe('');
  });
});

describe('searchPostsWithFilters', () => {
  const posts = [
    makePost({
      id: '1',
      title: 'Meu Artigo de Tecnologia',
      editoria: 'Tecnologia',
      published_at: '2026-01-15T10:00:00Z',
    }),
    makePost({
      id: '2',
      title: 'Outro Artigo de Casa',
      editoria: 'Casa',
      published_at: '2026-01-10T10:00:00Z',
    }),
    makePost({
      id: '3',
      title: 'Terceiro de Tecnologia',
      editoria: 'Tecnologia',
      published_at: '2026-01-20T10:00:00Z',
    }),
  ];

  it('retorna resultado vazio quando nao ha query', () => {
    const result = searchPostsWithFilters(posts, { query: '' });
    expect(result.items).toEqual([]);
    expect(result.totalMatches).toBe(0);
    expect(result.availableEditorias).toEqual(['Casa', 'Tecnologia']);
  });

  it('busca por titulo exato', () => {
    const result = searchPostsWithFilters(posts, { query: 'tecnologia' });
    expect(result.totalMatches).toBe(3);
    expect(result.items.map((p) => p.id)).toEqual(['3', '1', '2']);
  });

  it('filtra por editoria', () => {
    const result = searchPostsWithFilters(posts, {
      query: 'artigo',
      editoria: 'Casa',
    });
    expect(result.totalMatches).toBe(1);
    expect(result.items[0].id).toBe('2');
    expect(result.activeEditoria).toBe('Casa');
  });

  it('retorna todas as paginas quando nao ha correspondencia', () => {
    const result = searchPostsWithFilters(posts, { query: 'xyz' });
    expect(result.items).toEqual([]);
    expect(result.totalMatches).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('aplica paginacao corretamente', () => {
    const result = searchPostsWithFilters(posts, {
      query: 'tecnologia',
      page: 1,
      pageSize: 1,
    });
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it('ordena por relevancia e data', () => {
    const result = searchPostsWithFilters(posts, { query: 'tecnologia' });
    // Ambos tem 'tecnologia' no titulo, mas o terceiro e mais recente
    expect(result.items[0].id).toBe('3');
    expect(result.items[1].id).toBe('1');
  });
});
