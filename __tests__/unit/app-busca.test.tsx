/**
 * @fileoverview Testes da página de busca (`app/busca/page.tsx`).
 * @module __tests__/unit/app-busca
 * @description Comprova os estados da busca: convite sem termo, resultados com
 *   contagem singular e plural, nenhum resultado, correspondência sem acento,
 *   corte do termo em 120 caracteres e o aviso de indisponibilidade sob
 *   ContentUnavailableError — seo/AC-05, seo/AC-06.
 * @dependencies @testing-library/react, vitest, @/app/busca/page (deps de
 *   dados e sessão mockadas).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
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

import SearchPage from '@/app/busca/page';
import { ContentUnavailableError } from '@/lib/errors/content';

const basePost = {
  id: '1',
  slug: 'artigo-1',
  title: 'Artigo Um',
  content: 'x',
  excerpt: 'resumo',
  cover_image_url: '',
  editoria: 'Tecnologia',
  author_name: 'a',
  fontes_citadas: [],
  status: 'publicado' as const,
  published_at: '2026-01-15T12:00:00+00:00',
  updated_at: '2026-01-15T12:00:00+00:00',
  created_at: '2026-01-15T12:00:00+00:00',
};

/**
 * Renderiza a página com os parâmetros de busca pedidos.
 *
 * @param q - Termo enviado pelo leitor; ausente vira URL sem `q`.
 * @param editoria - Editoria para recorte opcional.
 * @param page - Número da página opcional.
 * @returns O resultado do render para consultas de container.
 */
async function renderPage(q?: string, editoria?: string, page?: string) {
  const params: Record<string, string> = {};
  if (q !== undefined) params.q = q;
  if (editoria !== undefined) params.editoria = editoria;
  if (page !== undefined) params.page = page;

  return render(
    await SearchPage({
      searchParams: Promise.resolve(params),
    }),
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('convida a digitar um termo sem consultar o catálogo', async () => {
    await renderPage();
    expect(
      screen.getByText('Digite um termo para encontrar artigos.'),
    ).toBeInTheDocument();
    expect(getPublishedPosts).not.toHaveBeenCalled();
  });

  it('lista o resultado com contagem no singular e link para o artigo', async () => {
    getPublishedPosts.mockResolvedValue([basePost]);

    await renderPage('Artigo');

    expect(
      screen.getByRole('heading', { name: 'Resultados para “Artigo”' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 artigo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Artigo Um/ })).toHaveAttribute(
      'href',
      '/artigos/artigo-1',
    );
    expect(screen.getByText('resumo')).toBeInTheDocument();
    expect(getPublishedPosts).toHaveBeenCalledWith(expect.anything(), 500);
  });

  it('pluraliza a contagem com dois resultados', async () => {
    getPublishedPosts.mockResolvedValue([
      basePost,
      { ...basePost, id: '2', slug: 'artigo-2', title: 'Artigo Dois' },
    ]);

    await renderPage('Artigo');

    expect(screen.getByText('2 artigos')).toBeInTheDocument();
  });

  it('avisa quando nenhum artigo corresponde e aponta as editorias', async () => {
    getPublishedPosts.mockResolvedValue([]);

    await renderPage('inexistente');

    expect(screen.getByText(/Nenhum artigo encontrado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'editorias' })).toHaveAttribute(
      'href',
      '/#editorias',
    );
  });

  it('ignora acentos e caixa na correspondência', async () => {
    getPublishedPosts.mockResolvedValue([
      { ...basePost, title: 'Inteligência Artificial' },
    ]);

    await renderPage('inteligencia artificial');

    expect(
      screen.getByRole('link', { name: /Inteligência Artificial/ }),
    ).toBeInTheDocument();
  });

  it('apara espaços e corta o termo em 120 caracteres', async () => {
    getPublishedPosts.mockResolvedValue([]);
    const long = 'a'.repeat(130);

    await renderPage(`  ${long}  `);

    const heading = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    expect(heading).toContain('a'.repeat(120));
    expect(heading).not.toContain('a'.repeat(121));
    expect(screen.getByRole('searchbox')).toHaveValue('a'.repeat(120));
  });

  it('mostra o aviso de indisponibilidade sob ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(
      new ContentUnavailableError('Sanity fora'),
    );

    await renderPage('qualquer');

    expect(
      screen.getByText(
        'A pesquisa está indisponível agora. Tente novamente em instantes.',
      ),
    ).toBeInTheDocument();
  });

  it('relança erro que não é ContentUnavailableError', async () => {
    getPublishedPosts.mockRejectedValue(new Error('bug inesperado'));
    await expect(
      SearchPage({ searchParams: Promise.resolve({ q: 'x' }) }),
    ).rejects.toThrow('bug inesperado');
  });

  it('expõe o formulário de busca rotulado e limitado', async () => {
    await renderPage();

    expect(screen.getByRole('search')).toBeInTheDocument();
    const field = screen.getByRole('searchbox', {
      name: 'Pesquisar artigos',
    });
    expect(field).toHaveAttribute('maxlength', '120');
  });

  it('filtra por editoria e marca a pílula correspondente como ativa (busca/AC-04, busca/AC-07)', async () => {
    getPublishedPosts.mockResolvedValue([
      {
        ...basePost,
        id: '1',
        slug: 'art-tech',
        title: 'Novidade Tech',
        editoria: 'Tecnologia',
      },
      {
        ...basePost,
        id: '2',
        slug: 'art-seg',
        title: 'Novidade Segurança',
        editoria: 'Segurança',
      },
    ]);

    await renderPage('Novidade', 'Tecnologia');

    expect(
      screen.getByRole('heading', {
        name: 'Resultados para “Novidade” em Tecnologia',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 artigo')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Novidade Tech/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Novidade Segurança/ }),
    ).not.toBeInTheDocument();

    // Pílulas de editoria
    const pillTodas = screen.getByRole('link', { name: 'Todas' });
    expect(pillTodas).not.toHaveAttribute('aria-current', 'page');

    const pillTech = screen.getByRole('link', { name: 'Tecnologia' });
    expect(pillTech).toHaveAttribute('aria-current', 'page');
    expect(pillTech).toHaveAttribute('data-active', 'true');
  });

  it('exibe atalho para limpar o recorte de editoria no estado vazio (busca/AC-08)', async () => {
    getPublishedPosts.mockResolvedValue([
      {
        ...basePost,
        id: '1',
        slug: 'art-tech',
        title: 'TypeScript Puro',
        editoria: 'Tecnologia',
      },
      {
        ...basePost,
        id: '2',
        slug: 'art-seg',
        title: 'Guia de Firewall',
        editoria: 'Segurança',
      },
    ]);

    await renderPage('TypeScript', 'Segurança');

    expect(
      screen.getByText(
        /Nenhum artigo encontrado em Segurança para “TypeScript”/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Limpar filtro de editoria' }),
    ).toHaveAttribute('href', '/busca?q=TypeScript');
  });

  it('renderiza controles de paginação quando há mais de 20 resultados (busca/AC-06)', async () => {
    const posts = Array.from({ length: 25 }, (_, i) => ({
      ...basePost,
      id: `post-${i + 1}`,
      slug: `post-${i + 1}`,
      title: `Artigo Python ${i + 1}`,
    }));
    getPublishedPosts.mockResolvedValue(posts);

    await renderPage('Python', undefined, '1');

    expect(screen.getByText('25 artigos')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/busca?q=Python&page=2',
    );
  });

  it('suporta busca com tolerância a erro de digitação no leitor (busca/AC-03)', async () => {
    getPublishedPosts.mockResolvedValue([
      {
        ...basePost,
        id: 'ai-doc',
        slug: 'ai-doc',
        title: 'Inteligência Artificial Aplicada',
      },
    ]);

    await renderPage('artifisial');

    expect(
      screen.getByRole('heading', { name: 'Resultados para “artifisial”' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Inteligência Artificial Aplicada/ }),
    ).toBeInTheDocument();
  });
});
