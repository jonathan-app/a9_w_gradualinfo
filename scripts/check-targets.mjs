#!/usr/bin/env node
/**
 * @fileoverview Confere a seleção de specs exigidas pelo escopo ativo.
 * @module scripts/check-targets
 * @description Compara o manifesto versionado à fatias em progresso e aos filhos
 *   declarados no índice da spec 0011. Uma omissão nunca vira aprovação.
 * @dependencies node:fs, node:path, node:url.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCOPE = 'docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md';
const BASELINE = 'docs/specs/2026-10-07-1350-md-0002-casca-editorial-home.md';

/**
 * Lista arquivos Markdown sob uma pasta sem seguir links.
 *
 * @param {string} dir - Pasta absoluta.
 * @returns {string[]} Caminhos absolutos.
 */
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? markdownFiles(path)
      : entry.isFile() && entry.name.endsWith('.md')
        ? [path]
        : [];
  });
}

/**
 * Extrai a seleção exigida pelas fatias em progresso.
 *
 * @param {string} repo - Raiz do projeto.
 * @returns {Array<{feature:string,path:string}>} Specs esperadas.
 */
export function expectedTargets(repo) {
  const scope = readFileSync(join(repo, SCOPE), 'utf8');
  const glance = scope.split('## At a glance')[1]?.split(/^## /m)[0] ?? '';
  const features = [
    ...glance.matchAll(/^\| ([A-Z])\s+\|[^\n]*\|\s+in-progress\s+\|$/gm),
  ].map((match) => match[1]);
  const expected = [{ feature: 'baseline', path: BASELINE }];
  if (!features.length) return expected;
  const allSpecs = markdownFiles(join(repo, 'docs/specs'));
  for (const feature of features) {
    const heading = new RegExp(`^### ${feature}\\. [^\\n]+`, 'm');
    const start = scope.search(heading);
    if (start < 0) throw new Error(`Fatia ${feature} sem seção.`);
    const firstLineEnd = scope.indexOf('\n', start);
    const section = scope.slice(firstLineEnd + 1).split(/^### |^## /m)[0];
    const linked = section.match(/^Spec \[[^\]]+\]\(([^)]+)\)/m);
    const id = section.match(/^Spec `([^`]+)`/m)?.[1];
    let paths;
    if (linked) {
      const absolute = resolve(repo, dirname(SCOPE), linked[1]);
      paths = [absolute];
      const text = readFileSync(absolute, 'utf8');
      const structure = text.split('## Structure')[1]?.split(/^## /m)[0] ?? '';
      paths.push(
        ...[...structure.matchAll(/^- \[[^\]]+\]\(([^)]+\.md)\)/gm)].map(
          (match) => resolve(dirname(absolute), match[1]),
        ),
      );
    } else if (id) {
      paths = allSpecs.filter((path) => {
        const name = path.split('/').at(-1);
        return (
          name.includes(`-${id}-`) &&
          /^\*\*Status\*\*: Accepted\s*$/m.test(readFileSync(path, 'utf8')) &&
          readFileSync(path, 'utf8').includes('## Requirements')
        );
      });
      if (paths.length !== 1)
        throw new Error(`Fatia ${feature}: spec ${id} ambígua ou ausente.`);
    } else throw new Error(`Fatia ${feature} sem ponteiro de spec.`);
    for (const path of paths)
      expected.push({
        feature,
        path: relative(repo, path).replaceAll('\\', '/'),
      });
  }
  return expected;
}

/**
 * Valida formato, caminhos e conjunto exato do manifesto.
 *
 * @param {string} repo - Raiz do projeto.
 * @returns {Array<{feature:string,path:string}>} Seleção validada.
 */
export function checkTargets(repo) {
  const data = JSON.parse(
    readFileSync(join(repo, 'workflow/check-targets.json'), 'utf8'),
  );
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.specs) ||
    !data.specs.length
  )
    throw new Error('Manifesto vazio ou schema inválido.');
  const actual = data.specs.map((item) => {
    if (
      !item ||
      typeof item.feature !== 'string' ||
      typeof item.path !== 'string' ||
      !/^docs\/specs\/[A-Za-z0-9/_-]+\.md$/.test(item.path)
    )
      throw new Error('Entrada inválida no manifesto.');
    const path = resolve(repo, item.path);
    const text = readFileSync(path, 'utf8');
    if (!/^\*\*Status\*\*: Accepted\s*$/m.test(text))
      throw new Error(`Spec sem Accepted: ${item.path}.`);
    return `${item.feature}:${item.path}`;
  });
  const expected = expectedTargets(repo).map(
    (item) => `${item.feature}:${item.path}`,
  );
  if (
    new Set(actual).size !== actual.length ||
    JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())
  )
    throw new Error('Manifesto difere das specs exigidas pelo escopo.');
  return data.specs;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const selected = checkTargets(process.cwd());
    console.log(`${selected.length} specs exigidas, conjunto completo.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
