/**
 * @fileoverview Testes unitários para editorial-dashboard.ts
 * @module __tests__/unit/lib/services/editorial-dashboard
 * @description Testa getEditorialDashboardData com estados unconfigured,
 *   empty e configured via modo local.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: { editorialLocal: false },
  isSanityConfigured: false,
}));

vi.mock('@/lib/sanity/client', () => ({
  executeSanityQuery: vi.fn(),
}));

vi.mock('@/lib/editorial/local-posts', () => ({
  getLocalPosts: vi.fn(),
}));

import { getEditorialDashboardData } from '@/lib/services/editorial-dashboard';

describe('editorial-dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEditorialDashboardData', () => {
    it('retorna unconfigured quando Sanity não configurado e modo local desligado', async () => {
      const result = await getEditorialDashboardData();
      expect(result.status).toBe('unconfigured');
      expect(result.source).toBe('none');
      expect(result.posts).toEqual([]);
    });

    it('retorna empty quando modo local não tem posts', async () => {
      const { env } = await import('@/lib/env');
      const { getLocalPosts } = await import('@/lib/editorial/local-posts');
      (env as any).editorialLocal = true;
      vi.mocked(getLocalPosts).mockReturnValue([]);

      const result = await getEditorialDashboardData();
      expect(result.status).toBe('empty');
      expect(result.source).toBe('local');
    });

    it('retorna configured com posts do modo local', async () => {
      const { env } = await import('@/lib/env');
      const { getLocalPosts } = await import('@/lib/editorial/local-posts');
      (env as any).editorialLocal = true;
      vi.mocked(getLocalPosts).mockReturnValue([
        {
          id: 'post-1',
          slug: 'meu-artigo',
          title: 'Meu Artigo Local',
          editoria: 'Tecnologia',
          status: 'publicado',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]);

      const result = await getEditorialDashboardData();
      expect(result.status).toBe('configured');
      expect(result.source).toBe('local');
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('Meu Artigo Local');
    });
  });
});
