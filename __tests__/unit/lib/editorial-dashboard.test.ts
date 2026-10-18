import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    sanity: {
      projectId: 'proj-teste',
      dataset: 'production',
      apiVersion: '2024-01-01',
      readToken: 'token-privado',
    },
    editorialLocal: false,
  },
  isSanityConfigured: true,
}));

import { getEditorialDashboardData } from '@/lib/services/editorial-dashboard';

vi.mock('@/lib/sanity/client', () => ({
  executeSanityQuery: vi.fn(),
  mapSanityDocumentToPost: vi.fn((doc) => ({
    id: doc._id,
    slug: doc.slug?.current || 'slug-teste',
    title: doc.title,
    editoria: doc.editoria || 'Tecnologia',
    status: doc._id.startsWith('drafts.') ? 'rascunho' : 'publicado',
    updated_at: doc._updatedAt || '2026-10-16T12:00:00Z',
  })),
}));

import { executeSanityQuery } from '@/lib/sanity/client';

describe('editorial-dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna lista mapeada com status e paginação do Sanity', async () => {
    vi.mocked(executeSanityQuery).mockImplementation(async (query: string) => {
      if (query.startsWith('count')) {
        return [2] as any;
      }
      return [
        {
          _id: 'drafts.post-1',
          title: 'Artigo Rascunho',
          slug: { current: 'artigo-rascunho' },
          editoria: 'Hardware',
          _updatedAt: '2026-10-16T10:00:00Z',
        },
        {
          _id: 'post-2',
          title: 'Artigo Publicado',
          slug: { current: 'artigo-publicado' },
          editoria: 'Software',
          _updatedAt: '2026-10-15T10:00:00Z',
        },
      ] as any;
    });

    const result = await getEditorialDashboardData({ page: 1, pageSize: 10 });
    expect(result.status).toBe('configured');
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]?.status).toBe('rascunho');
    expect(result.posts[1]?.status).toBe('publicado');
    expect(result.totalPosts).toBe(2);
  });

  it('retorna status empty quando dataset do Sanity não contém documentos', async () => {
    vi.mocked(executeSanityQuery).mockResolvedValue([] as any);

    const result = await getEditorialDashboardData({ page: 1, pageSize: 10 });
    expect(result.status).toBe('empty');
    expect(result.posts).toEqual([]);
    expect(result.totalPosts).toBe(0);
  });

  it('retorna status error com mensagem sanitizada em caso de exceção de rede no Sanity', async () => {
    vi.mocked(executeSanityQuery).mockRejectedValue(
      new Error('Sanity API rate limit / 503'),
    );

    const result = await getEditorialDashboardData({ page: 1, pageSize: 10 });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('Sanity Content Lake');
  });
});
