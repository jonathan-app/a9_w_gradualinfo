/**
 * @fileoverview Testes unitários de paridade estrita entre Markdown locais e catálogo editorial.
 * @module __tests__/unit/editorial-parity.test
 * @description Garante conformidade campo por campo (title, slug, excerpt, editoria, author, cover,
 *   sources e content) entre docs/rascunhos-editoriais/*.md e lib/editorial/local-posts.json,
 *   substituindo o antigo script manual scripts/verify-editorial-parity.mjs conforme Spec 0031.
 * @dependencies vitest, node:fs, node:path.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface PostSource {
  titulo: string;
  url: string;
}

interface LocalPost {
  slug: string;
  title: string;
  excerpt: string;
  editoria: string;
  author: string;
  cover: string;
  content: string;
  sources?: PostSource[];
}

/**
 * Remove aspas de valores literais do frontmatter.
 *
 * @param {string} value - Valor textual da linha.
 * @returns {string} Valor sem aspas.
 */
function cleanScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

describe('Paridade editorial (Spec 0031 - script-clean/AC-02)', () => {
  const cataloguePath = resolve(
    process.cwd(),
    'lib/editorial/local-posts.json',
  );
  const draftsDir = resolve(process.cwd(), 'docs/rascunhos-editoriais');

  it('deve encontrar o catálogo local e arquivos Markdown com contagens idênticas', () => {
    expect(existsSync(cataloguePath)).toBe(true);
    expect(existsSync(draftsDir)).toBe(true);

    const catalogue: LocalPost[] = JSON.parse(
      readFileSync(cataloguePath, 'utf8'),
    );
    const files = readdirSync(draftsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    expect(catalogue.length).toBeGreaterThan(0);
    expect(catalogue.length).toBe(files.length);
  });

  it('deve comprovar paridade campo a campo para todos os artigos Markdown locais', () => {
    const catalogue: LocalPost[] = JSON.parse(
      readFileSync(cataloguePath, 'utf8'),
    );
    const files = readdirSync(draftsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const catalogueBySlug = new Map<string, LocalPost>(
      catalogue.map((post) => [post.slug, post]),
    );

    for (const file of files) {
      const fullPath = resolve(draftsDir, file);
      const text = readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
      const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);

      expect(match, `Frontmatter inválido em ${file}`).not.toBeNull();
      if (!match) continue;

      const meta: Record<string, string> = {};
      const sources: PostSource[] = [];

      for (const line of match[1].split('\n')) {
        const field = /^([a-z_]+):\s*(.*)$/.exec(line);
        if (field && field[1] && field[2] !== undefined) {
          meta[field[1]] = cleanScalar(field[2]);
          continue;
        }
        const titleMatch = /^\s+- titulo:\s*(.+)$/.exec(line);
        const urlMatch = /^\s+url:\s*(.+)$/.exec(line);
        if (titleMatch && titleMatch[1]) {
          sources.push({ titulo: cleanScalar(titleMatch[1]), url: '' });
        } else if (urlMatch && urlMatch[1] && sources.length > 0) {
          const lastSource = sources[sources.length - 1];
          if (lastSource) {
            lastSource.url = cleanScalar(urlMatch[1]);
          }
        }
      }

      const expectedSlug = file.replace(/\.md$/, '');
      expect(meta.slug, `Slug divergente em ${file}`).toBe(expectedSlug);

      const post = catalogueBySlug.get(expectedSlug);
      expect(post, `Post ${expectedSlug} ausente no catálogo`).toBeDefined();
      if (!post) continue;

      // Conferência de metadados principais
      expect(post.title, `Título divergente em ${file}`).toBe(meta.title);
      expect(post.slug, `Slug divergente em ${file}`).toBe(meta.slug);
      expect(post.excerpt, `Resumo divergente em ${file}`).toBe(meta.excerpt);
      expect(post.editoria, `Editoria divergente em ${file}`).toBe(
        meta.editoria,
      );
      expect(post.author, `Autor divergente em ${file}`).toBe(meta.author);

      // Conferência de capa com codificação URI
      const coverPath = (meta.cover_image || '').replace(/^\//, '');
      const expectedCover =
        '/' + coverPath.split('/').map(encodeURIComponent).join('/');
      expect(post.cover, `Capa divergente em ${file}`).toBe(expectedCover);

      // Conferência de corpo sem o título H1 inicial
      const expectedBody = match[2].replace(/^\s*# [^\n]+\n/, '').trim();
      expect(post.content, `Corpo divergente em ${file}`).toBe(expectedBody);

      // Conferência de fontes
      const postSources = post.sources || [];
      expect(
        postSources.length,
        `Quantidade de fontes divergente em ${file}`,
      ).toBe(sources.length);

      for (let i = 0; i < sources.length; i++) {
        expect(postSources[i]?.titulo).toBe(sources[i]?.titulo);
        expect(postSources[i]?.url).toBe(sources[i]?.url);
      }
    }
  });
});
