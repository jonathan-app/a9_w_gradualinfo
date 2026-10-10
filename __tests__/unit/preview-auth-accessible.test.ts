// @vitest-environment node
/**
 * @fileoverview Testes unitários para isArticleAccessible e verifyPreviewSession em lib/preview/auth.ts.
 * @module __tests__/unit/preview-auth-accessible.test
 * @description Comprova o controle de acesso e visibilidade de artigos na fronteira do middleware/proxy:
 *   - Integração com Sanity (sucesso, rascunho sem preview e propagação de indisponibilidade);
 *   - Fallback de banco de dados Supabase (leitura pública, sessão de preview e propagação de indisponibilidade);
 *   - Validação da sessão de preview com fallback para claims do Supabase Auth.
 * @dependencies vitest, lib/preview/auth.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockEnv, mockSanityPostBySlug } = vi.hoisted(() => ({
  mockSanityPostBySlug: vi.fn(),
  mockEnv: {
    sanity: {
      projectId: 'test-sanity-project',
      dataset: 'production',
    },
    supabase: {
      url: 'http://127.0.0.1:54321',
      anonKey: 'fake-anon-key',
    },
    // O grant legado deve usar outra chave para não simular um grant DO inválido.
    previewSigningKey: 'chave-do-distinta-para-testes-12345',
    previewToken: 'chave-hmac-minimo-32-bytes-para-testes-12345',
    previewUserId: '00000000-0000-4000-8000-000000000000',
  },
}));

vi.mock('@/lib/sanity/client', () => ({
  getSanityPostBySlug: (...args: unknown[]) => mockSanityPostBySlug(...args),
}));

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}));

vi.mock('@/lib/preview/config', () => ({
  isPreviewConfigured: () => true,
}));

import {
  isArticleAccessible,
  verifyPreviewSession,
  ContentUnavailableError,
} from '@/lib/preview/auth';
import { issuePreviewGrant } from '@/lib/preview/session';

describe('isArticleAccessible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.sanity.projectId = 'test-sanity-project';
    mockEnv.sanity.dataset = 'production';
  });

  describe('Caminho Primário: Sanity Content Lake', () => {
    it('retorna true quando o artigo publicado é encontrado no Sanity', async () => {
      mockSanityPostBySlug.mockResolvedValueOnce({
        id: 'sanity-pub-1',
        slug: 'post-sanity',
        title: 'Post Sanity',
        status: 'publicado',
      });

      const fakeSupabase = {} as any;
      const accessible = await isArticleAccessible(
        fakeSupabase,
        'post-sanity',
        false,
      );
      expect(accessible).toBe(true);
      expect(mockSanityPostBySlug).toHaveBeenCalledWith('post-sanity', {
        isPreview: false,
      });
    });

    it('consulta o Sanity em visão de preview quando o leitor tem sessão de preview', async () => {
      // covers: sanity/AC-05 (rascunho e agendado ficam visíveis em preview)
      const draft = {
        id: 'drafts.abc',
        slug: 'rascunho',
        title: 'Rascunho',
        status: 'rascunho',
      };
      mockSanityPostBySlug.mockResolvedValueOnce(draft);

      const fakeSupabase = {} as any;
      const accessible = await isArticleAccessible(
        fakeSupabase,
        'rascunho',
        true,
      );

      expect(accessible).toBe(true);
      expect(mockSanityPostBySlug).toHaveBeenCalledWith('rascunho', {
        isPreview: true,
      });
    });

    it('retorna false quando o artigo não existe ou é rascunho sem permissão de preview', async () => {
      mockSanityPostBySlug.mockResolvedValueOnce(null);

      const fakeSupabase = {} as any;
      const accessible = await isArticleAccessible(
        fakeSupabase,
        'slug-inexistente',
        false,
      );
      expect(accessible).toBe(false);
      expect(mockSanityPostBySlug).toHaveBeenCalledWith('slug-inexistente', {
        isPreview: false,
      });
    });

    it('propaga ContentUnavailableError quando o Sanity falha (proxy responde 503)', async () => {
      mockSanityPostBySlug.mockRejectedValueOnce(
        new Error(
          'Falha na consulta ao Sanity (HTTP 503): Service Unavailable',
        ),
      );

      const fakeSupabase = {} as any;
      await expect(
        isArticleAccessible(fakeSupabase, 'post-qualquer', false),
      ).rejects.toBeInstanceOf(ContentUnavailableError);
    });
  });

  describe('Caminho de Fallback: Banco de Dados Supabase (quando Sanity não está configurado)', () => {
    it('consulta tabela posts pública e retorna true se o registro existir', async () => {
      mockEnv.sanity.projectId = '';
      mockEnv.sanity.dataset = '';

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'post-1' },
          error: null,
        }),
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue(queryBuilder),
      };

      const accessible = await isArticleAccessible(
        mockSupabase as any,
        'post-supabase',
        true,
      );
      expect(accessible).toBe(true);
      expect(queryBuilder.eq).toHaveBeenCalledWith('slug', 'post-supabase');
    });

    it('propaga ContentUnavailableError quando o banco falha (proxy responde 503)', async () => {
      mockEnv.sanity.projectId = '';
      mockEnv.sanity.dataset = '';

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue(queryBuilder),
      };

      await expect(
        isArticleAccessible(mockSupabase as any, 'post-com-falha', true),
      ).rejects.toBeInstanceOf(ContentUnavailableError);
    });

    it('retorna false quando o registro não existe no banco de dados', async () => {
      mockEnv.sanity.projectId = '';
      mockEnv.sanity.dataset = '';

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue(queryBuilder),
      };

      const accessible = await isArticleAccessible(
        mockSupabase as any,
        'post-inexistente',
        true,
      );
      expect(accessible).toBe(false);
    });
  });
});

describe('verifyPreviewSession (Fallback Supabase Auth)', () => {
  it('retorna false se o cookie for ausente ou inválido', async () => {
    const mockSupabase = {} as any;
    const isValid = await verifyPreviewSession(mockSupabase, undefined);
    expect(isValid).toBe(false);
  });

  it('valida usuário com claim app_metadata.preview e sessão ativa', async () => {
    const validSessionId = '11111111-2222-4333-8444-555555555555';
    const cookie = issuePreviewGrant(
      mockEnv.previewUserId,
      validSessionId,
      mockEnv.previewToken,
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: mockEnv.previewUserId,
              app_metadata: { preview: true },
            },
          },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: mockEnv.previewUserId,
              session_id: validSessionId,
            },
          },
          error: null,
        }),
      },
    };

    const isValid = await verifyPreviewSession(mockSupabase as any, cookie);
    expect(isValid).toBe(true);
  });

  it('rejeita se o usuário não possuir o claim app_metadata.preview', async () => {
    const validSessionId = '11111111-2222-4333-8444-555555555555';
    const cookie = issuePreviewGrant(
      mockEnv.previewUserId,
      validSessionId,
      mockEnv.previewToken,
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: mockEnv.previewUserId,
              app_metadata: { preview: false },
            },
          },
          error: null,
        }),
      },
    };

    const isValid = await verifyPreviewSession(mockSupabase as any, cookie);
    expect(isValid).toBe(false);
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
