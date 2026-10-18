/**
 * @fileoverview Atualiza o catálogo local a partir dos Markdown do projeto.
 * @module scripts/sync-editorial
 * @description Lê somente campos editoriais e valida capas; não consulta serviços nem variáveis de segredo.
 * @dependencies node:fs, node:path.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

// O frontmatter destes rascunhos usa campos escalares e uma lista de fontes.
const scalar = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) return JSON.parse(trimmed);
  if (trimmed.startsWith("'") && trimmed.endsWith("'"))
    return trimmed.slice(1, -1);
  return trimmed;
};
try {
  const records = [];
  const slugs = new Set();
  for (const file of readdirSync('docs/rascunhos-editoriais')
    .filter((name) => name.endsWith('.md'))
    .sort()) {
    const text = readFileSync(
      resolve('docs/rascunhos-editoriais', file),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
    if (!match) throw new Error();
    const meta = {};
    const sources = [];
    for (const line of match[1].split('\n')) {
      const field = /^([a-z_]+):\s*(.*)$/.exec(line);
      if (field) {
        meta[field[1]] = scalar(field[2]);
        continue;
      }
      const title = /^\s+- titulo:\s*(.+)$/.exec(line);
      const url = /^\s+url:\s*(.+)$/.exec(line);
      if (title) sources.push({ titulo: scalar(title[1]), url: '' });
      else if (url && sources.length) sources.at(-1).url = scalar(url[1]);
      else if (line.trim()) throw new Error();
    }
    for (const key of [
      'slug',
      'title',
      'excerpt',
      'editoria',
      'author',
      'cover_image',
    ])
      if (typeof meta[key] !== 'string' || !meta[key]) throw new Error();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug) || slugs.has(meta.slug))
      throw new Error();
    slugs.add(meta.slug);
    const coverPath = meta.cover_image.replace(/^\//, '');
    const publicRoot = resolve('public');
    const filePath = resolve(publicRoot, coverPath);
    if (!filePath.startsWith(publicRoot + sep) || !existsSync(filePath))
      throw new Error();
    for (const source of sources)
      if (
        !source.titulo ||
        !['http:', 'https:'].includes(new URL(source.url).protocol)
      )
        throw new Error();
    records.push({
      slug: meta.slug,
      title: meta.title,
      excerpt: meta.excerpt,
      editoria: meta.editoria,
      author: meta.author,
      cover: '/' + coverPath.split('/').map(encodeURIComponent).join('/'),
      content: match[2].replace(/^\s*# [^\n]+\n/, '').trim(),
      sources,
    });
  }
  if (!records.length) throw new Error();
  writeFileSync(
    'lib/editorial/local-posts.json',
    JSON.stringify(records, null, 2) + '\n',
  );
  console.log(`Catálogo local atualizado: ${records.length} artigos.`);
} catch {
  console.error(
    'Não foi possível atualizar o catálogo. Confira o frontmatter e as capas dos Markdown locais.',
  );
  process.exitCode = 1;
}
