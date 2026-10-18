#!/usr/bin/env node
/**
 * @fileoverview Avalia todas as specs exigidas pelo escopo na mesma revisão.
 * @module scripts/ci-check-matrix
 * @description Preserva o avaliador legado de md-0002 e exige evidência própria
 *   para cada outra spec. Falta de prova vira UNVERIFIABLE, nunca PASS.
 * @dependencies scripts/check-targets.mjs, scripts/check-decision.mjs,
 *   scripts/check-gate.mjs, scripts/ci-check-results.mjs, node:child_process.
 */
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTargets } from './check-targets.mjs';

/**
 * Extrai os IDs que a autoridade espera de uma spec.
 *
 * @param {string} spec - Caminho da spec.
 * @returns {string[]} IDs na seção Requirements.
 */
function acceptanceIds(spec) {
  const text = readFileSync(spec, 'utf8');
  const section = text.split('## Requirements')[1]?.split(/^## /m)[0] ?? '';
  return [...section.matchAll(/^- \*\*([^*]+\/AC-\d+)\*\*/gm)].map(
    (match) => match[1],
  );
}

/**
 * Roda um CLI preservando a saída para auditoria.
 *
 * @param {string[]} argv - Argumentos do Node.
 * @param {string} logPath - Arquivo de saída.
 * @returns {number} Código de saída.
 */
function runNode(argv, logPath) {
  const run = spawnSync(process.execPath, argv, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  writeFileSync(logPath, `${run.stdout ?? ''}${run.stderr ?? ''}`);
  return run.status ?? 1;
}

/**
 * Avalia cada spec com a autoridade existente e agrega os vereditos.
 *
 * @param {string} outputDir - Pasta fora do checkout para os resultados.
 * @param {string} evidenceDir - Artefatos baixados da CI.
 * @returns {boolean} Verdadeiro somente quando todas as specs passam.
 */
export function evaluateMatrix(outputDir, evidenceDir) {
  const targets = checkTargets(process.cwd());
  mkdirSync(outputDir, { recursive: true });
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8' }).trim();
  const commit = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  const results = [];
  for (const target of targets) {
    const spec = resolve(target.path);
    // O caminho completo evita colisão entre `index.md` de duas specs guarda chuva.
    const key = createHash('sha256')
      .update(target.path)
      .digest('hex')
      .slice(0, 16);
    const runDir = join(outputDir, `${target.feature}-${key}`);
    mkdirSync(runDir, { recursive: true });
    const resultPath = join(runDir, 'result.json');
    if (target.feature === 'baseline') {
      runNode(
        ['scripts/ci-check-results.mjs', resultPath, evidenceDir],
        join(runDir, 'generate.log'),
      );
    } else {
      const supplied = join(evidenceDir, 'spec-results', key, 'result.json');
      if (existsSync(supplied)) copyFileSync(supplied, resultPath);
      else {
        const note = join(runDir, 'missing-evidence.txt');
        writeFileSync(
          note,
          `Sem evidência desta revisão para ${target.path}.\n`,
        );
        const hash = (path) =>
          createHash('sha256').update(readFileSync(path)).digest('hex');
        writeFileSync(
          resultPath,
          JSON.stringify(
            {
              schemaVersion: 1,
              evaluatedCommit: commit,
              evaluatedTree: tree,
              spec: { path: target.path, sha256: hash(spec) },
              acs: acceptanceIds(spec).map((id) => ({
                id,
                status: 'UNVERIFIABLE',
                evidence: note,
                evidenceSha256: hash(note),
              })),
              findings: [
                {
                  severity: 'BLOCKER',
                  description: 'Evidência da spec ausente nesta revisão.',
                },
              ],
            },
            null,
            2,
          ) + '\n',
        );
      }
    }
    const decisionPath = join(runDir, 'decision.json');
    const decision = spawnSync(
      process.execPath,
      ['scripts/check-decision.mjs', resultPath, '--spec', target.path],
      { encoding: 'utf8' },
    );
    writeFileSync(decisionPath, decision.stdout ?? '');
    writeFileSync(join(runDir, 'decision.log'), decision.stderr ?? '');
    const gate = runNode(
      [
        'scripts/check-gate.mjs',
        decisionPath,
        '--spec',
        target.path,
        '--commit',
        commit,
      ],
      join(runDir, 'gate.log'),
    );
    results.push({
      path: target.path,
      approved: decision.status === 0 && gate === 0,
    });
  }
  const approved = results.length > 0 && results.every((item) => item.approved);
  writeFileSync(
    join(outputDir, 'summary.json'),
    JSON.stringify({ commit, tree, approved, results }, null, 2) + '\n',
  );
  return approved;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const outputDir = process.argv[2];
    const evidenceDir = process.argv[3];
    if (!outputDir || !evidenceDir)
      throw new Error('Informe saída e pasta de evidências.');
    const approved = evaluateMatrix(resolve(outputDir), resolve(evidenceDir));
    console.log(approved ? 'Matriz APROVADA.' : 'Matriz REPROVADA.');
    process.exitCode = approved ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
