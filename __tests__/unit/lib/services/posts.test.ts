/**
 * @fileoverview Suíte do serviço de posts — consulta pública e as barreiras do preview.
 * @module __tests__/unit/lib/services/posts
 * @description Mocka o cliente Supabase para validar a construção da query (filtros de
 *   `publicado`, corte por data, ordenação, limite) e a autorização de preview: grant dentro
 *   do prazo, `sub` casando com a identidade configurada, claim em `app_metadata` (nunca
 *   `user_metadata`), sessão apontando para o mesmo usuário — e, sem preview, o retorno ao
 *   leitor anônimo para que um JWT vencido não vá ao banco.
 * @dependencies vitest (vi.mock/hoisting), @supabase/supabase-js, next/headers, @/lib/env,
 *   @/lib/preview/session, @/lib/services/posts.
 *
 * Os mocks de `next/headers` e `@/lib/env` existem porque o serviço lê cookie e config de
 * ambiente: sem eles, o teste teria que subir o runtime do Next só para exercitar uma query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issuePreviewGrant } from '@/lib/preview/session';
const userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const secret = 'preview-entry-test-secret-at-least-32-bytes';
const publicReader = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => publicReader }));
const cookie = vi.hoisted(() => ({ value: '' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookie.value ? { value: cookie.value } : undefined),
  }),
}));
const mockSanityPublished = vi.hoisted(() => vi.fn());
const mockSanityBySlug = vi.hoisted(() => vi.fn());
vi.mock('@/lib/sanity/client', () => ({
  getSanityPublishedPosts: (...args: unknown[]) => mockSanityPublished(...args),
  getSanityPostBySlug: (...args: unknown[]) => mockSanityBySlug(...args),
}));

vi.mock('@/lib/env', () => ({
  env: {
    supabase: { url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' },
    previewToken: 'preview-entry-test-secret-at-least-32-bytes',
    previewPassword: 'different-account-password',
    previewEmail: 'test@example.invalid',
    previewUserId: '11111111-1111-4111-8111-111111111111',
    sanity: {
      projectId: '',
      dataset: '',
    },
  },
}));
import {
  getPublishedPosts,
  getPostBySlug,
  isPreviewSession,
} from '@/lib/services/posts';
import { env } from '@/lib/env';

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

    publicReader.from.mockReset().mockReturnValue(queryBuilderMock);
    supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilderMock),
      auth: {
        getUser: vi.fn(),
        getClaims: vi.fn().mockResolvedValue({
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

  // Quatro barreiras de autorização, uma por teste: identidade, prazo, sessão e origem da
  // claim. Cada sabotagem altera só a barreira em questão — se qualquer uma falhar, rascunho
  // vaza para quem não deveria ler.
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
    // `user_metadata` é editável pelo próprio usuário; só `app_metadata` é escrito pelo
    // servidor. Confiar no primeiro faria qualquer conta se autoatribuir o preview.
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
    // Sem sessão Preview utilizável, a consulta tem de sair por um cliente anônimo novo: o
    // mock que faz `from` lançar prova que o JWT vencido jamais chega ao banco, e o leitor
    // público ainda aplica os filtros de publicação.
    it('sessão Auth expirada usa leitor anônimo e devolve ausência sem enviar JWT vencido', async () => {
      supabaseMock.auth.getUser.mockRejectedValue(
        new Error('refresh expirado'),
      );
      supabaseMock.from.mockImplementation(() => {
        throw new Error('JWT vencido não pode chegar ao banco');
      });
      queryBuilderMock.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      expect(await getPostBySlug(supabaseMock, 'rascunho')).toBeNull();
      expect(supabaseMock.from).not.toHaveBeenCalled();
      expect(publicReader.from).toHaveBeenCalledWith('posts');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('status', 'publicado');
    });

    // Os dois casos abaixo são o espelho um do outro: público só enxerga `publicado` com data
    // vencida; preview enxerga qualquer status — é a mesma query com a guarda mudada.
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

    it('propaga exceção quando a consulta por slug no Supabase falha com erro', async () => {
      queryBuilderMock.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Falha no banco ao buscar por slug'),
      });

      await expect(getPostBySlug(supabaseMock, 'post-erro')).rejects.toThrow(
        'Falha no banco ao buscar por slug',
      );
    });
  });

  describe('Integração com Sanity (quando configurado no env)', () => {
    beforeEach(() => {
      (env as any).sanity.projectId = 'sanity-project-id';
      (env as any).sanity.dataset = 'production';
    });

    afterEach(() => {
      (env as any).sanity.projectId = '';
      (env as any).sanity.dataset = '';
    });

    it('getPublishedPosts delega para getSanityPublishedPosts quando Sanity estiver ativo', async () => {
      mockSanityPublished.mockResolvedValueOnce([
        { id: '1', title: 'Post Sanity', slug: 'post-sanity' },
      ]);

      const posts = await getPublishedPosts(supabaseMock, 5);
      expect(posts).toHaveLength(1);
      expect(mockSanityPublished).toHaveBeenCalledWith(5);
    });

    it('getPostBySlug delega para getSanityPostBySlug quando Sanity estiver ativo', async () => {
      mockSanityBySlug.mockResolvedValueOnce({
        id: '2',
        title: 'Slug Sanity',
        slug: 'slug-sanity',
      });

      const post = await getPostBySlug(supabaseMock, 'slug-sanity');
      expect(post?.title).toBe('Slug Sanity');
      expect(mockSanityBySlug).toHaveBeenCalledWith('slug-sanity', {
        isPreview: false,
      });
    });
  });

  describe('Tratamento de Erros em getPublishedPosts', () => {
    it('propaga exceção quando a consulta de lista no Supabase falha com erro', async () => {
      (env as any).sanity.projectId = '';
      (env as any).sanity.dataset = '';

      queryBuilderMock.limit.mockResolvedValue({
        data: null,
        error: new Error('Erro de conexão ao banco de dados'),
      });

      await expect(getPublishedPosts(supabaseMock, 10)).rejects.toThrow(
        'Erro de conexão ao banco de dados',
      );
    });
  });
});
