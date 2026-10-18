/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Regiões de código e tabela recebem foco para rolagem por teclado. */
/**
 * @fileoverview Corpo Markdown e sumário sincronizados.
 * @module components/editorial/article-body
 * @description Âncoras vêm da árvore Markdown, incluindo títulos repetidos.
 * @dependencies react-markdown, remark-gfm, reading.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { articleHeadings, type ArticleHeading } from '@/lib/editorial/reading';

/** Renderiza GFM e sumário sem carregar um parser adicional no cliente. */
export function ArticleBody({ content }: { content: string }) {
  const headings: ArticleHeading[] = [];
  // O export síncrono do react-markdown processa a árvore antes da composição.
  const body = ReactMarkdown({
    children: content,
    remarkPlugins: [remarkGfm, articleHeadings(headings)],
    components: {
      h1: 'h2',
      // A região rolável precisa receber foco para permitir rolagem por teclado.
      table: ({ children }) => (
        <div
          className="article-table"
          role="region"
          aria-label="Tabela do artigo"
          tabIndex={0}>
          <table>{children}</table>
        </div>
      ),
      pre: ({ children }) => (
        <pre tabIndex={0} aria-label="Bloco de código">
          {children}
        </pre>
      ),
    },
  });
  return (
    <div className="article-reading-grid">
      {headings.length >= 3 && (
        <aside className="article-outline">
          <details open>
            <summary>Neste artigo</summary>
            <nav aria-label="Sumário do artigo">
              <ol>
                {headings.map((heading) => (
                  <li key={heading.id} data-depth={heading.depth}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
        </aside>
      )}
      <article className="editorial-body article-prose prose prose-lg dark:prose-invert">
        {body}
      </article>
    </div>
  );
}
