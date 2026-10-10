/**
 * @fileoverview Testes do sitemap dinâmico.
 * @module __tests__/unit/sitemap
 * @description Comprova que o sitemap inclui home e artigos, e que degrada
 *   para só a home sob ContentUnavailableError.
 * @dependencies vitest, @/app/sitemap (mock das deps).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));
vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(() => ({})),
}));
const getPublishedPosts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/posts', () => ({
  getPublishedPosts,
}));
vi.mock('@/lib/errors/content', () => ({
  ContentUnavailableError: class ContentUnavailableError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ContentUnavailableError';
    }
  },
}));

import sitemap from '@/app/sitemap';
import { ContentUnavailableError } from '@/lib/errors/content';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo',
  content: 'x',
  excerpt: '',
  cover_image_url: '',
  editoria: '',
  author_name: 'a',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  created_at: '2026-01-15T12:00:00Z',
};

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inclui home e um item por artigo publicado', async () => {
    getPublishedPosts.mockResolvedValue([basePost]);
    const result = await sitemap();
    expect(result).toHaveLength(2);
    expect(result[0]?.url).toBe('https://gradualinfo.com.br');
    expect(result[1]?.url).toBe('https://gradualinfo.com.br/artigos/artigo-1');
  });

  it('inclui apenas a home quando a lista é vazia', async () => {
    getPublishedPosts.mockResolvedValue([]);
    const result = await sitemap();
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe('https://gradualinfo.com.br');
  });

  it('degrada para só a home sob ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(
      new ContentUnavailableError('Sanity fora'),
    );
    const result = await sitemap();
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe('https://gradualinfo.com.br');
  });

  it('relança erro que não é ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(new Error('bug'));
    await expect(sitemap()).rejects.toThrow('bug');
  });
});
