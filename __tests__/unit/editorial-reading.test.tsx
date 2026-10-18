/**
 * @fileoverview Contratos de leitura e limites do modo local.
 * @module tests/editorial-reading
 * @description Exercita âncoras reais, rolagem acessível e bloqueios de produção.
 * @dependencies Vitest, Testing Library, componentes editoriais.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isLocalEditorialMode } from '@/lib/env';
import { isLocalEditorialPath } from '@/lib/editorial/local-mode';
import { readingMinutes, relatedPosts } from '@/lib/editorial/reading';
import { ArticleBody } from '@/components/editorial/article-body';
import { ArticleShare } from '@/components/editorial/article-share';
import type { Post } from '@/lib/services/posts';

describe('limites do modo local', () => {
  it.each(['production', 'test', undefined])(
    'não ativa fora de desenvolvimento: %s',
    (mode) => {
      expect(isLocalEditorialMode(mode, '1', 'http://127.0.0.1:3000')).toBe(
        false,
      );
    },
  );
  it('exige flag e origem loopback', () => {
    expect(
      isLocalEditorialMode('development', '1', 'http://127.0.0.1:3200'),
    ).toBe(true);
    expect(
      isLocalEditorialMode('development', undefined, 'http://localhost:3000'),
    ).toBe(false);
    expect(
      isLocalEditorialMode('development', '1', 'https://gradualinfo.com.br'),
    ).toBe(false);
    expect(isLocalEditorialMode('development', '1', 'inválido')).toBe(false);
  });
  it.each([
    '/admin-dashboard',
    '/api/admin/preview',
    '/api/preview',
    '/preview',
    '/artigos/a/b',
    '/artigos/exemplo.jpeg',
    '/artigos/capa.png',
  ])('não pula guarda de %s', (path) => {
    expect(isLocalEditorialPath('127.0.0.1', path)).toBe(false);
  });
  it('aceita só home e artigo local', () => {
    expect(isLocalEditorialPath('localhost', '/')).toBe(true);
    expect(isLocalEditorialPath('127.0.0.1', '/artigos/exemplo')).toBe(true);
    expect(isLocalEditorialPath('gradualinfo.com.br', '/artigos/exemplo')).toBe(
      false,
    );
  });
});

describe('leitura editorial', () => {
  it('liga sumário a títulos repetidos sem incluir código como seção', () => {
    const { container } = render(
      <ArticleBody
        content={
          '## Ação **prática**\n\n## Ação prática\n\n### Próximo passo\n\n```md\n## Não é título\n```'
        }
      />,
    );
    const links = screen
      .getByRole('navigation', { name: 'Sumário do artigo' })
      .querySelectorAll('a');
    expect(links).toHaveLength(3);
    expect([...links].map((link) => link.getAttribute('href'))).toEqual([
      '#sec-acao-pratica',
      '#sec-acao-pratica-2',
      '#sec-proximo-passo',
    ]);
    for (const link of links)
      expect(container.querySelector(link.getAttribute('href')!)).toBeTruthy();
  });
  it('omite sumário curto e preserva h1 único no cabeçalho da página', () => {
    const { container } = render(
      <ArticleBody content={'# Título interno\n\nTexto.'} />,
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Título interno',
    );
  });
  it('preserva semântica da tabela dentro de área focável', () => {
    render(
      <ArticleBody content={'| Nome | Valor |\n| --- | --- |\n| A | 1 |'} />,
    );
    expect(
      screen.getByRole('region', { name: 'Tabela do artigo' }),
    ).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  it('estima sem contar URLs como texto e nunca exibe zero', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('palavra '.repeat(441))).toBe(3);
    expect(readingMinutes('[texto](https://exemplo.com/caminho)')).toBe(1);
  });
  it('prioriza editoria e elimina artigo corrente e duplicados', () => {
    const post = { slug: 'atual', editoria: 'SEO' } as Post;
    const candidates = [
      { slug: 'outro', editoria: 'IA' },
      post,
      { slug: 'seo', editoria: 'SEO' },
      { slug: 'seo', editoria: 'SEO' },
    ] as Post[];
    expect(relatedPosts(post, candidates).map((item) => item.slug)).toEqual([
      'seo',
      'outro',
    ]);
  });
  it('mostra alternativa acessível quando clipboard não está disponível', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('indisponível')),
      },
    });
    render(<ArticleShare title="Artigo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Selecione e copie'),
    );
    expect(
      screen.getByRole('textbox', { name: 'Link do artigo' }),
    ).toHaveAttribute('readonly');
  });
});
