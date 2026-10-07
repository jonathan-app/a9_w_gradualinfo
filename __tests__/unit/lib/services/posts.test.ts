import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issuePreviewGrant } from '@/lib/preview/session';
const userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const secret = 'preview-entry-test-secret-at-least-32-bytes';
const cookie = vi.hoisted(() => ({ value: '' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookie.value ? { value: cookie.value } : undefined),
  }),
}));
vi.mock('@/lib/env', () => ({
  env: {
    previewToken: 'preview-entry-test-secret-at-least-32-bytes',
    previewPassword: 'different-account-password',
    previewEmail: 'test@example.invalid',
    previewUserId: '11111111-1111-4111-8111-111111111111',
  },
}));
import {
  getPublishedPosts,
  getPostBySlug,
  isPreviewSession,
} from '@/lib/services/posts';

/**
 * Testes unitários do serviço de posts.
 *
 * Cada teste isola uma função do `lib/services/posts.ts` mockando o cliente
 * Supabase. O foco é validar a construção da query (filtros, ordenação, limite)
 * e a lógica de preview, não a integração real com o banco.
 */
describe('Posts Service', () => {
  let supabaseMock: any;
  let queryBuilderMock: any;

  beforeEach(() => {
    cookie.value = issuePreviewGrant(userId, sessionId, secret);
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
        getClaims: vi
          .fn()
          .mockResolvedValue({
            data: { claims: { sub: userId, session_id: sessionId } },
            error: null,
          }),
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
        data: { user: { id: userId, app_metadata: { preview: true } } },
      });
      const result = await isPreviewSession(supabaseMock);
      expect(result).toBe(true);
    });

    it('deve retornar true se jwt claim de preview for string "true"', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, app_metadata: { preview: 'true' } } },
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

  it('nega outra identidade com a mesma claim', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: sessionId, app_metadata: { preview: true } } },
    });
    expect(await isPreviewSession(supabaseMock)).toBe(false);
  });
  it('nega prazo vencido mantendo usuário e sessão válidos', async () => {
    cookie.value = issuePreviewGrant(
      userId,
      sessionId,
      secret,
      Date.now() - 1800_000,
    );
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: userId, app_metadata: { preview: true } } },
    });
    expect(await isPreviewSession(supabaseMock)).toBe(false);
  });
  it('nega troca de sessão sem trocar usuário', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: userId, app_metadata: { preview: true } } },
    });
    supabaseMock.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: userId, session_id: userId } },
    });
    expect(await isPreviewSession(supabaseMock)).toBe(false);
  });
  it('nega user_metadata mesmo com autorização assinada', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          app_metadata: {},
          user_metadata: { preview: true },
        },
      },
    });
    expect(await isPreviewSession(supabaseMock)).toBe(false);
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
        data: { user: { id: userId, app_metadata: { preview: true } } },
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
