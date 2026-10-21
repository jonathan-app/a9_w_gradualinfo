/**
 * @fileoverview Testes unitários para posts.ts
 * @module __tests__/unit/lib/services/posts
 * @description Testa getPublishedPosts e getPostBySlug com estados
 *   editorialLocal, Sanity ativo e Supabase público.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: undefined })),
  })),
}));

vi.mock('@/lib/env', () => ({
  env: {
    editorialLocal: false,
    supabase: { url: 'http://localhost:54321', anonKey: 'test-anon-key' },
  },
  isSanityConfigured: false,
}));

vi.mock('@/lib/preview/session', () => ({
  PREVIEW_COOKIE: 'gradualinfo_preview',
}));

vi.mock('@/lib/preview/auth', () => ({
  verifyPreviewSession: vi.fn(async () => false),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  })),
}));

vi.mock('@/lib/sanity/client', () => ({
  getSanityPublishedPosts: vi.fn(async () => []),
  getSanityPostBySlug: vi.fn(async () => null),
}));

vi.mock('@/lib/editorial/local-posts', () => ({
  getLocalPosts: vi.fn(async () => []),
  getLocalPostBySlug: vi.fn(async () => null),
}));

import { getPublishedPosts, getPostBySlug } from '@/lib/services/posts';

describe('posts', () => {
  describe('getPublishedPosts', () => {
    it('retorna lista vazia quando nao ha posts publicados', async () => {
      const supabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(async () => ({ data: [], error: null })),
                })),
              })),
            })),
          })),
        })),
      } as any;
      const result = await getPublishedPosts(supabase);
      expect(result).toEqual([]);
    });

    it('usa catálogo local quando editorialLocal esta ativo', async () => {
      const { env } = await import('@/lib/env');
      const { getLocalPosts } = await import('@/lib/editorial/local-posts');
      (env as any).editorialLocal = true;
      vi.mocked(getLocalPosts).mockResolvedValueOnce([
        {
          id: '1',
          slug: 's1',
          title: 'T1',
          content: '',
          excerpt: '',
          cover_image_url: '',
          editoria: 'T',
          author_name: 'A',
          fontes_citadas: [],
          status: 'publicado',
          published_at: '2026-01-01',
          updated_at: '2026-01-01',
          created_at: '2026-01-01',
        },
      ]);

      const supabase = { from: vi.fn() } as any;
      const result = await getPublishedPosts(supabase);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPostBySlug', () => {
    it('retorna null quando post nao existe', async () => {
      const supabase = { from: vi.fn() } as any;
      const result = await getPostBySlug(supabase, 'nao-existe');
      expect(result).toBeNull();
    });

    it('usa catálogo local quando editorialLocal esta ativo', async () => {
      const { env } = await import('@/lib/env');
      const { getLocalPostBySlug } =
        await import('@/lib/editorial/local-posts');
      (env as any).editorialLocal = true;
      vi.mocked(getLocalPostBySlug).mockResolvedValueOnce({
        id: '1',
        slug: 's1',
        title: 'T1',
        content: '',
        excerpt: '',
        cover_image_url: '',
        editoria: 'T',
        author_name: 'A',
        fontes_citadas: [],
        status: 'publicado',
        published_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_at: '2026-01-01',
      });

      const supabase = { from: vi.fn() } as any;
      const result = await getPostBySlug(supabase, 's1');
      expect(result?.title).toBe('T1');
    });
  });
});
