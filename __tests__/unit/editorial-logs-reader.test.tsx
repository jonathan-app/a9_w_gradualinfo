/**
 * @fileoverview Confere a leitura local do artigo revisado sobre traces.
 * @module __tests__/unit/editorial-logs-reader.test
 * @description Usa o catálogo sincronizado e o mesmo renderizador Markdown do leitor.
 * @dependencies vitest, react-dom/server, ArticleBody, local-posts.json.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleBody } from '@/components/editorial/article-body';
import records from '@/lib/editorial/local-posts.json';

describe('artigo de logs no leitor local', () => {
  it('renderiza seções, tabela, código e capa presente no catálogo', () => {
    const post = records.find(
      (record) => record.slug === 'logs-metricas-traces-diagnostico',
    );
    expect(post).toBeDefined();
    expect(post?.cover).toBe('/artigos/logs-metricas-traces-diagnostico.jpeg');
    const html = renderToStaticMarkup(<ArticleBody content={post!.content} />);
    expect(html).toContain('Diferença entre os três');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Bloco de código"');
    expect(html).toContain('observability.traces.enabled');
    expect(html).not.toContain('&lt;sup&gt;');
  });
});
