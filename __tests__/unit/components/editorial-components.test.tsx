/**
 * @fileoverview Testes dos componentes editoriais (EditorialStory, EditorialCover, ArtigosVazios).
 * @module __tests__/unit/components/editorial-components
 * @description Comprova renderização das três variantes de card, fallback de
 *   capa, estado vazio e comportamento de erro da imagem.
 * @dependencies @testing-library/react, vitest, @/components/shared/editorial-story,
 *   @/components/shared/editorial-cover, @/app/artigos-vazios.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onError,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    <img
      src={src}
      alt={alt}
      onError={onError}
      data-testid="editorial-img"
      {...rest}
    />
  ),
}));

import { EditorialStory } from '@/components/shared/editorial-story';
import { EditorialCover } from '@/components/shared/editorial-cover';
import { ArtigosVazios } from '@/app/artigos-vazios';
import type { Post } from '@/lib/services/posts';

vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
    supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake' },
    editorialImageBucket: 'editorial-covers',
    isProduction: true,
  },
}));

const basePost: Post = {
  id: '1',
  slug: 'guia-notebook',
  title: 'Guia do Notebook',
  content: 'Corpo do artigo',
  excerpt: 'Resumo do artigo',
  cover_image_url: 'https://gradualinfo.com.br/img/capa.jpg',
  editoria: 'hardware',
  author_name: 'Autor',
  fontes_citadas: [],
  status: 'publicado',
  published_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  created_at: '2026-01-15T12:00:00Z',
};

describe('EditorialStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza variante lead com título e link', () => {
    render(<EditorialStory post={basePost} variant="lead" />);
    expect(
      screen.getByRole('heading', { name: 'Guia do Notebook' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/artigos/guia-notebook',
    );
  });

  it('renderiza variante secondary com excerpt', () => {
    render(<EditorialStory post={basePost} variant="secondary" />);
    expect(screen.getByText('Resumo do artigo')).toBeInTheDocument();
  });

  it('renderiza variante recent sem excerpt', () => {
    render(<EditorialStory post={basePost} variant="recent" />);
    expect(screen.queryByText('Resumo do artigo')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Guia do Notebook' }),
    ).toBeInTheDocument();
  });

  it('exibe editoria quando presente', () => {
    render(<EditorialStory post={basePost} variant="lead" />);
    expect(screen.getByText('hardware')).toBeInTheDocument();
  });

  it('não exibe editoria quando vazia', () => {
    render(
      <EditorialStory post={{ ...basePost, editoria: '' }} variant="lead" />,
    );
    expect(screen.queryByText('hardware')).not.toBeInTheDocument();
  });

  it('exibe data com time dateTime', () => {
    render(<EditorialStory post={basePost} variant="lead" />);
    const time = screen.getByText(/15 de jan\./);
    expect(time).toHaveAttribute('datetime', '2026-01-15T12:00:00Z');
  });
});

describe('EditorialCover', () => {
  it('renderiza imagem quando src é válido', () => {
    render(<EditorialCover src="https://gradualinfo.com.br/img/x.jpg" />);
    expect(screen.getByTestId('editorial-img')).toHaveAttribute(
      'src',
      'https://gradualinfo.com.br/img/x.jpg',
    );
  });

  it('renderiza null quando src é null', () => {
    const { container } = render(<EditorialCover src={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('remove a imagem após erro', () => {
    render(
      <EditorialCover src="https://gradualinfo.com.br/img/quebrada.jpg" />,
    );
    const img = screen.getByTestId('editorial-img');
    fireEvent.error(img);
    expect(screen.queryByTestId('editorial-img')).not.toBeInTheDocument();
  });
});

describe('ArtigosVazios', () => {
  it('renderiza título e explicação', () => {
    render(<ArtigosVazios />);
    expect(
      screen.getByRole('heading', { name: 'Nenhum artigo publicado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ainda não há artigos disponíveis/),
    ).toBeInTheDocument();
  });
});
