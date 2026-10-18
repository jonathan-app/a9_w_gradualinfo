#!/usr/bin/env node
/**
 * @fileoverview Guarda de integridade do catálogo de skills instaladas.
 * @module scripts/check-skills
 * @description Compara `.agents/skills/` com a baseline aprovada (`security/skills-allowlist.json`
 *   + `skills-lock.json`): nomes idênticos, origem, hash do lock e hash de conteúdo de cada
 *   skill e seus arquivos versionados. Diferente de `check-portability.mjs` (forma e prosa), este script trata só de
 *   confiança — o que está instalado é exatamente o que foi revisado e aprovado.
 * @dependencies node:fs, node:crypto (SHA-256), node:path, node:url.
 *
 * Quando executado: `pnpm skills:check`. Também é a ferramenta citada por
 *   `security/skills-quarantine.json` para separar habilidade instalada de habilidade vigente.
 * Lê: `security/skills-allowlist.json`, `skills-lock.json` e a árvore `.agents/skills/`.
 * Escreve: nada — apenas motivos em stderr.
 * Códigos de saída: 0 = catálogo íntegro; 1 = ao menos um motivo ou erro de leitura.
 */
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Calcula o hash canônico do conteúdo de uma pasta de skill.
 *
 * A entrada é `rel + NUL + bytes + NUL` por arquivo, na ordem lexicográfica dos caminhos:
 * o separador elimina a ambiguidade de concatenação (idem hashes de Merkle) e a ordenação
 * torna o resultado independente da ordem que o readdir devolve.
 *
 * @param root - Diretório da skill (ex.: `<repo>/.agents/skills/develop`).
 * @returns {string} SHA-256 hex do conteúdo.
 * @throws {Error} Symlink dentro da pasta — não reproduzível entre plataformas, o guard
 *   recusa em vez de calcular um hash que outro SO não repetiria.
 */
export function contentHash(root) {
  const hash = createHash('sha256');
  const files = [];
  const walk = (dir, prefix = '') => {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      const rel = prefix + name;
      const stat = lstatSync(file);
      if (stat.isSymbolicLink())
        throw new Error(`Symlink não controlado: ${rel}`);
      if (stat.isDirectory()) walk(file, rel + '/');
      else if (stat.isFile()) files.push(rel);
    }
  };
  walk(root);
  for (const rel of files.sort())
    hash
      .update(rel)
      .update('\0')
      .update(readFileSync(join(root, rel)))
      .update('\0');
  return hash.digest('hex');
}

/**
 * Compara o catálogo instalado com a baseline aprovada.
 *
 * @param repo - Raiz do repositório (de onde partem `security/` e `.agents/skills/`).
 * @returns {string[]} Vazio quando íntegro; uma frase por motivo caso contrário — o CLI
 *   apenas imprime e sai com 1. Skill ilegível ou ausente vira motivo, não exceção;
 *   allowlist/lock ilegíveis sobem (sem baseline não há o que comparar).
 */
export function checkSkills(repo) {
  const allow = JSON.parse(
    readFileSync(join(repo, 'security/skills-allowlist.json'), 'utf8'),
  );
  const lockBytes = readFileSync(join(repo, 'skills-lock.json'));
  const lock = JSON.parse(lockBytes).skills;
  const reasons = [];
  // A allowlist carrega o hash do próprio arquivo de lock: lock adulterado e allowlist
  // atualizada em conjunto são detectados, não apenas divergências nome a nome.
  if (
    allow.schemaVersion !== 1 ||
    allow.algorithm !== 'sha256-path-content-v1' ||
    allow.lockSha256 !== createHash('sha256').update(lockBytes).digest('hex')
  )
    reasons.push('Lock ou algoritmo diferente da baseline aprovada.');
  // Ordens diferentes dos mesmos nomes também são divergência: o lock é gerado de forma
  // determinística, então qualquer diferença de chaves indica baseline dessincronizada.
  if (
    JSON.stringify(Object.keys(lock).sort()) !==
    JSON.stringify(Object.keys(allow.skills).sort())
  )
    reasons.push('Allowlist não coincide com nomes do lock.');
  // Skill instalada fora da allowlist é a inversa de skill ausente: alvo nunca revisado
  // entrando no catálogo sem passar pela baseline.
  const installed = readdirSync(join(repo, '.agents/skills'));
  for (const name of installed)
    if (!allow.skills[name]) reasons.push(`Skill extra: ${name}`);
  // Por skill: localizar no lock, conferir origem e hash de conteúdo real. `contentHash`
  // lança para pasta ausente/ilegível; aqui o erro vira motivo em vez de derrubar o scan.
  for (const [name, value] of Object.entries(allow.skills)) {
    try {
      if (
        !lock[name] ||
        lock[name].computedHash !== value.lockComputedHash ||
        lock[name].source !== value.source ||
        contentHash(join(repo, '.agents/skills', name)) !==
          value.contentSha256 ||
        contentHash(join(repo, 'security/skills-catalog', name)) !==
          value.contentSha256 ||
        contentHash(join(repo, '.claude/skills', name)) !==
          value.pointerSha256 ||
        contentHash(join(repo, 'security/skills-catalog-pointers', name)) !==
          value.pointerSha256
      )
        reasons.push(`Conteúdo ou origem divergente: ${name}`);
    } catch {
      reasons.push(`Skill ausente ou ilegível: ${name}`);
    }
  }
  return reasons;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const reasons = checkSkills(process.cwd());
    for (const reason of reasons) console.error(reason);
    process.exitCode = reasons.length ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
