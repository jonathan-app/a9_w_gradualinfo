/**
 * @fileoverview Testes da home (`app/page.tsx`).
 * @module __tests__/unit/app-home
 * @description Comprova os três estados da home: lista com artigos, estado
 *   vazio e bloco de indisponibilidade sob ContentUnavailableError.
 * @dependencies @testing-library/react, vitest, @/app/page (mock das deps).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
  SITE_URL: 'https://gradualinfo.com.br/',
}));
vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(() => ({})),
}));
vi.mock('@/components/shared/editorial-story', () => ({
  EditorialStory: ({
    post,
    variant,
  }: {
    post: { slug: string; title: string };
    variant: string;
  }) => (
    <div data-testid={`story-${variant}`} data-slug={post.slug}>
      {post.title}
    </div>
  ),
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

import HomePage from '@/app/page';
import { ContentUnavailableError } from '@/lib/errors/content';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo Um',
  content: 'x',
  excerpt: 'resumo',
  cover_image_url: '',
  editoria: 'tech',
  author_name: 'a',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza H1 institucional', async () => {
    getPublishedPosts.mockResolvedValue([]);
    render(await HomePage());
    expect(
      screen.getByRole('heading', {
        name: /Gradualinfo, tecnologia para estudar programação/,
      }),
    ).toBeInTheDocument();
  });

  it('renderiza estado vazio quando não há artigos', async () => {
    getPublishedPosts.mockResolvedValue([]);
    render(await HomePage());
    expect(screen.getByText('Nenhum artigo publicado')).toBeInTheDocument();
  });

  it('renderiza artigos quando existem', async () => {
    getPublishedPosts.mockResolvedValue([
      basePost,
      { ...basePost, id: '2', slug: 'artigo-2', title: 'Artigo Dois' },
      { ...basePost, id: '3', slug: 'artigo-3', title: 'Artigo Três' },
      { ...basePost, id: '4', slug: 'artigo-4', title: 'Artigo Quatro' },
    ]);
    render(await HomePage());
    expect(screen.getByTestId('story-lead')).toBeInTheDocument();
    expect(screen.getAllByTestId('story-secondary')).toHaveLength(2);
    expect(screen.getByTestId('story-recent')).toBeInTheDocument();
    expect(screen.getByText('Artigo Um')).toBeInTheDocument();
  });

  it('renderiza bloco de indisponibilidade sob ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(
      new ContentUnavailableError('Sanity fora'),
    );
    const { container } = render(await HomePage());
    expect(container.textContent).toContain(
      'Conteúdo temporariamente indisponível',
    );
  });

  it('relança erro que não é ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(new Error('bug inesperado'));
    await expect(HomePage()).rejects.toThrow('bug inesperado');
  });

  it('exporta metadata com canonical para o apex', async () => {
    const mod = await import('@/app/page');
    expect(mod.metadata.alternates?.canonical).toBe(
      'https://gradualinfo.com.br',
    );
  });
});
