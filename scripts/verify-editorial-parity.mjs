/**
 * @fileoverview Verificação estrita de paridade entre Markdown locais e catálogo editorial.
 * @module scripts/verify-editorial-parity
 * @description Compara campo por campo (title, slug, excerpt, editoria, author, cover, sources, content)
 *   entre docs/rascunhos-editoriais/*.md e lib/editorial/local-posts.json.
 *   Falha com código 1 caso haja qualquer divergência ou ausência.
 * @dependencies node:fs, node:path.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const scalar = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) return JSON.parse(trimmed);
  if (trimmed.startsWith("'") && trimmed.endsWith("'"))
    return trimmed.slice(1, -1);
  return trimmed;
};

const cataloguePath = resolve('lib/editorial/local-posts.json');
if (!existsSync(cataloguePath)) {
  console.error(
    'ERRO: Catálogo lib/editorial/local-posts.json não encontrado.',
  );
  process.exit(1);
}

const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));
const files = readdirSync('docs/rascunhos-editoriais')
  .filter((f) => f.endsWith('.md'))
  .sort();

if (catalogue.length !== files.length) {
  console.error(
    `DIVERGÊNCIA: Catálogo tem ${catalogue.length} itens mas existem ${files.length} arquivos Markdown.`,
  );
  process.exit(1);
}

const catalogueBySlug = new Map(catalogue.map((p) => [p.slug, p]));

let totalChecked = 0;

for (const file of files) {
  const fullPath = resolve('docs/rascunhos-editoriais', file);
  const text = readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) {
    console.error(`ERRO: Formato de frontmatter inválido em ${file}`);
    process.exit(1);
  }

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
    else if (line.trim()) {
      console.error(
        `ERRO: Linha de frontmatter não reconhecida em ${file}: "${line}"`,
      );
      process.exit(1);
    }
  }

  const expectedSlug = file.replace(/\.md$/, '');
  if (meta.slug !== expectedSlug) {
    console.error(
      `DIVERGÊNCIA: slug no frontmatter (${meta.slug}) não bate com nome do arquivo (${expectedSlug})`,
    );
    process.exit(1);
  }

  const post = catalogueBySlug.get(meta.slug);
  if (!post) {
    console.error(
      `DIVERGÊNCIA: post com slug "${meta.slug}" ausente no catálogo JSON.`,
    );
    process.exit(1);
  }

  // Comparação exata campo por campo:
  const checks = [
    ['title', meta.title, post.title],
    ['slug', meta.slug, post.slug],
    ['excerpt', meta.excerpt, post.excerpt],
    ['editoria', meta.editoria, post.editoria],
    ['author', meta.author, post.author],
  ];

  for (const [fieldName, expectedVal, actualVal] of checks) {
    if (expectedVal !== actualVal) {
      console.error(
        `DIVERGÊNCIA em ${file} [${fieldName}]:\nEsperado: "${expectedVal}"\nObtido no catálogo: "${actualVal}"`,
      );
      process.exit(1);
    }
  }

  // Cover image:
  const coverPath = meta.cover_image.replace(/^\//, '');
  const expectedCover =
    '/' + coverPath.split('/').map(encodeURIComponent).join('/');
  if (post.cover !== expectedCover) {
    console.error(
      `DIVERGÊNCIA em ${file} [cover]:\nEsperado: "${expectedCover}"\nObtido: "${post.cover}"`,
    );
    process.exit(1);
  }

  // Content body:
  const expectedBody = match[2].replace(/^\s*# [^\n]+\n/, '').trim();
  if (post.content !== expectedBody) {
    console.error(
      `DIVERGÊNCIA em ${file} [content]: Corpo Markdown não bate com o catálogo. Diferença de tamanho: ${expectedBody.length} vs ${post.content.length}`,
    );
    process.exit(1);
  }

  // Sources (títulos e URLs):
  if (!Array.isArray(post.sources) || post.sources.length !== sources.length) {
    console.error(
      `DIVERGÊNCIA em ${file} [sources]: Quantidade de fontes difere (${sources.length} no Markdown vs ${post.sources?.length} no catálogo).`,
    );
    process.exit(1);
  }

  for (let i = 0; i < sources.length; i++) {
    if (
      post.sources[i].titulo !== sources[i].titulo ||
      post.sources[i].url !== sources[i].url
    ) {
      console.error(
        `DIVERGÊNCIA em ${file} [sources[${i}]]:\nMarkdown: ${JSON.stringify(sources[i])}\nCatálogo: ${JSON.stringify(post.sources[i])}`,
      );
      process.exit(1);
    }
  }

  totalChecked++;
}

console.log(
  `SUCESSO: 100% de paridade comprovada campo a campo entre ${totalChecked} arquivos Markdown e o catálogo local.`,
);
process.exit(0);
