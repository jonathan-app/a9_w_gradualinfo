import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPublishedPosts,
  getPostBySlug,
  isPreviewSession,
} from '@/lib/services/posts';

describe('Posts Service', () => {
  let supabaseMock: any;
  let queryBuilderMock: any;

  beforeEach(() => {
    queryBuilderMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
    };

    supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilderMock),
      auth: {
        getUser: vi.fn(),
      },
    };
  });

  describe('getPublishedPosts', () => {
    it('deve aplicar filtros de status publicado e data, limitando e ordenando corretamente', async () => {
      queryBuilderMock.limit.mockResolvedValue({ data: [], error: null });

      await getPublishedPosts(supabaseMock, 5);

      expect(supabaseMock.from).toHaveBeenCalledWith('posts');
      expect(queryBuilderMock.select).toHaveBeenCalledWith('*');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('status', 'publicado');
      expect(queryBuilderMock.lte).toHaveBeenCalledWith(
        'published_at',
        expect.any(String),
      );
      expect(queryBuilderMock.order).toHaveBeenCalledWith('published_at', {
        ascending: false,
      });
      expect(queryBuilderMock.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('isPreviewSession', () => {
    it('deve retornar true se jwt claim de preview for true (booleano)', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: { app_metadata: { preview: true } } },
      });
      const result = await isPreviewSession(supabaseMock);
      expect(result).toBe(true);
    });

    it('deve retornar true se jwt claim de preview for string "true"', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: { app_metadata: { preview: 'true' } } },
      });
      const result = await isPreviewSession(supabaseMock);
      expect(result).toBe(true);
    });

    it('deve retornar false se não houver claim', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await isPreviewSession(supabaseMock);
      expect(result).toBe(false);
    });
  });

  describe('getPostBySlug', () => {
    it('deve buscar por slug e aplicar filtros de rascunho se não for sessão de preview', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
      queryBuilderMock.maybeSingle.mockResolvedValue({
        data: { slug: 'teste' },
        error: null,
      });

      await getPostBySlug(supabaseMock, 'teste');

      expect(queryBuilderMock.eq).toHaveBeenCalledWith('slug', 'teste');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('status', 'publicado');
      expect(queryBuilderMock.lte).toHaveBeenCalledWith(
        'published_at',
        expect.any(String),
      );
    });

    it('deve buscar por slug e NÃO aplicar filtros de rascunho se for sessão de preview', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: { app_metadata: { preview: true } } },
      });
      queryBuilderMock.maybeSingle.mockResolvedValue({
        data: { slug: 'teste-rascunho' },
        error: null,
      });

      await getPostBySlug(supabaseMock, 'teste-rascunho');

      expect(queryBuilderMock.eq).toHaveBeenCalledWith(
        'slug',
        'teste-rascunho',
      );
      expect(queryBuilderMock.eq).not.toHaveBeenCalledWith(
        'status',
        'publicado',
      );
      expect(queryBuilderMock.lte).not.toHaveBeenCalledWith(
        'published_at',
        expect.any(String),
      );
    });
  });
});
