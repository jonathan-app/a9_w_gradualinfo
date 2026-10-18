#!/usr/bin/env node
/**
 * @fileoverview Reproduz o catálogo aprovado de skills sem baixar código.
 * @module scripts/materialize-skills
 * @description Confere o catálogo versionado e cria somente instalações ausentes.
 *   Uma instalação diferente ou extra reprova para preservar alterações locais.
 * @dependencies node:fs, node:path, node:crypto, scripts/check-skills.mjs.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash } from './check-skills.mjs';

/**
 * Materializa somente arquivos aprovados e rejeita deriva local.
 *
 * @param {string} repo - Raiz do projeto.
 * @returns {void} Lança erro quando o catálogo ou a instalação diverge.
 */
export function materializeSkills(repo) {
  const allow = JSON.parse(
    readFileSync(join(repo, 'security/skills-allowlist.json'), 'utf8'),
  );
  const lockBytes = readFileSync(join(repo, 'skills-lock.json'));
  const lock = JSON.parse(lockBytes).skills;
  const names = Object.keys(allow.skills).sort();
  if (
    allow.schemaVersion !== 1 ||
    allow.algorithm !== 'sha256-path-content-v1' ||
    allow.lockSha256 !== createHash('sha256').update(lockBytes).digest('hex') ||
    JSON.stringify(names) !== JSON.stringify(Object.keys(lock).sort())
  )
    throw new Error('Baseline de skills e lock divergentes.');

  const destinations = [
    { source: 'security/skills-catalog', target: '.agents/skills' },
    {
      source: 'security/skills-catalog-pointers',
      target: '.claude/skills',
    },
  ];
  for (const { source, target } of destinations) {
    const sourceRoot = join(repo, source);
    const targetRoot = join(repo, target);
    if (
      JSON.stringify(readdirSync(sourceRoot).sort()) !== JSON.stringify(names)
    )
      throw new Error(`Nomes inesperados no catálogo ${source}.`);
    if (existsSync(targetRoot)) {
      for (const extra of readdirSync(targetRoot))
        if (!names.includes(extra))
          throw new Error(`Skill ou ponteiro extra: ${extra}.`);
    }
    for (const name of names) {
      const sourcePath = join(sourceRoot, name);
      const targetPath = join(targetRoot, name);
      const expected =
        source === 'security/skills-catalog'
          ? allow.skills[name].contentSha256
          : allow.skills[name].pointerSha256;
      if (typeof expected !== 'string' || contentHash(sourcePath) !== expected)
        throw new Error(`Catálogo divergente: ${name}.`);
      if (existsSync(targetPath)) {
        if (contentHash(targetPath) !== expected)
          throw new Error(`Instalação local divergente: ${name}.`);
      } else {
        mkdirSync(targetRoot, { recursive: true });
        cpSync(sourcePath, targetPath, { recursive: true, errorOnExist: true });
      }
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    materializeSkills(process.cwd());
    console.log('Catálogo de skills materializado e conferido.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
