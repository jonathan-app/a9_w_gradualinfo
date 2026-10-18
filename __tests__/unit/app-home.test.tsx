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
  SITE_NAME: 'Gradualinfo',
  SITE_DESCRIPTION: 'Descrição da marca.',
  SITE_LOGO: 'https://gradualinfo.com.br/icon.png',
  SITE_LANGUAGE: 'pt-BR',
}));
vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(() => ({})),
}));
vi.mock('@/components/shared/editorial-cover', () => ({
  EditorialCover: () => <div data-testid="home-cover" />,
}));
vi.mock('@/lib/editorial-images', () => ({
  approvedCoverImageUrl: () => null,
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
      { ...basePost, id: '5', slug: 'artigo-5', title: 'Artigo Cinco' },
      { ...basePost, id: '6', slug: 'artigo-6', title: 'Artigo Seis' },
    ]);
    render(await HomePage());
    expect(
      screen.getByRole('region', { name: 'Matéria de capa' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Destaques editoriais' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Últimas leituras' }),
    ).toBeInTheDocument();
    expect(document.getElementById('recentes')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Editorias na home' }),
    ).toBeNull();
    const links = screen.getAllByRole('link', { name: /Artigo Um/ });
    expect(links).toHaveLength(2);
    for (const link of links)
      expect(link).toHaveAttribute('href', '/artigos/artigo-1');
    expect(getPublishedPosts).toHaveBeenCalledWith(expect.anything(), 60);
  });

  it('omite colunas vazias quando existe apenas um artigo', async () => {
    getPublishedPosts.mockResolvedValue([basePost]);
    render(await HomePage());
    expect(
      screen.getByRole('region', { name: 'Matéria de capa' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Destaques editoriais' }),
    ).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Últimas leituras' }),
    ).toBeNull();
  });

  it('exibe destaques mas omite últimas leituras quando há dois ou três artigos sem repetir o hero', async () => {
    getPublishedPosts.mockResolvedValue([
      basePost,
      { ...basePost, id: '2', slug: 'artigo-2', title: 'Artigo Dois' },
      { ...basePost, id: '3', slug: 'artigo-3', title: 'Artigo Três' },
    ]);
    render(await HomePage());
    expect(
      screen.getByRole('region', { name: 'Matéria de capa' }),
    ).toBeInTheDocument();
    const destaques = screen.getByRole('region', {
      name: 'Destaques editoriais',
    });
    expect(destaques).toBeInTheDocument();
    expect(destaques).not.toHaveTextContent('Artigo Um');
    expect(destaques).toHaveTextContent('Artigo Dois');
    expect(destaques).toHaveTextContent('Artigo Três');
    expect(
      screen.queryByRole('region', { name: 'Últimas leituras' }),
    ).toBeNull();
  });

  it('exibe coluna lateral única com dois artigos e omite segunda coluna vazia', async () => {
    getPublishedPosts.mockResolvedValue([
      basePost,
      { ...basePost, id: '2', slug: 'artigo-2', title: 'Artigo Dois' },
    ]);
    render(await HomePage());
    expect(
      screen.getByRole('region', { name: 'Matéria de capa' }),
    ).toBeInTheDocument();
    const destaques = screen.getByRole('region', {
      name: 'Destaques editoriais',
    });
    expect(destaques).toBeInTheDocument();
    expect(destaques).not.toHaveTextContent('Artigo Um');
    expect(destaques).toHaveTextContent('Artigo Dois');
    expect(
      screen.queryByRole('region', { name: 'Últimas leituras' }),
    ).toBeNull();
  });

  it('reúne editorias em uma grade de até 16 artigos, do mais novo ao mais antigo', async () => {
    getPublishedPosts.mockResolvedValue(
      Array.from({ length: 18 }, (_, index) => ({
        ...basePost,
        id: String(index),
        slug: `artigo-${index}`,
        title: `Artigo ${index}`,
        editoria: index % 2 ? 'Performance e SEO' : 'Inteligência Artificial',
        published_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
      })),
    );
    render(await HomePage());
    const section = screen.getByRole('region', { name: 'Grade de artigos' });
    const links = Array.from(section.querySelectorAll('article a'));
    expect(links).toHaveLength(16);
    expect(links[0]).toHaveAttribute('href', '/artigos/artigo-17');
    expect(links[15]).toHaveAttribute('href', '/artigos/artigo-2');
    expect(section).not.toHaveTextContent('Ver mais desta editoria');
  });

  it('identifica rascunhos sem inventar publicação', async () => {
    getPublishedPosts.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        ...basePost,
        id: String(index),
        slug: `rascunho-${index}`,
        title: `Rascunho ${index}`,
        status: 'rascunho',
        published_at: null,
      })),
    );
    const { container } = render(await HomePage());
    expect(
      screen.getAllByText('Rascunho · prévia local').length,
    ).toBeGreaterThan(0);
    expect(container.querySelector('time')).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Grade de artigos' }),
    ).toBeInTheDocument();
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
