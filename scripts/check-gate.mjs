#!/usr/bin/env node

/**
 * check-gate.mjs — Gatekeeper da aprovação
 * Verifica se a branch pode ser integrada, checando se a última decisão
 * do check-decision foi APROVADA e se o conteúdo avaliado não mudou.
 *
 * Uso: node scripts/check-gate.mjs <arquivo-de-revisao.md>
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Erro: Forneça o caminho para o arquivo de revisão (docs/reviews/...)',
    );
    process.exit(1);
  }

  const reviewFile = args[0];
  if (!existsSync(reviewFile)) {
    console.error(`Erro: Arquivo de revisão não encontrado (${reviewFile})`);
    process.exit(1);
  }

  // Na prática, leria o arquivo de revisão e extrairia o hash de commit testado
  // e compararia com o HEAD atual.
  const content = readFileSync(reviewFile, 'utf-8');

  const commitMatch = content.match(/Commit Avaliado:\s*([a-f0-9]+)/i);
  if (!commitMatch) {
    console.error(
      "Erro: Arquivo de revisão não contém 'Commit Avaliado: <hash>'",
    );
    process.exit(1);
  }

  const reviewedCommit = commitMatch[1];

  let currentHead;
  try {
    currentHead = execSync('git rev-parse HEAD').toString().trim();
  } catch {
    console.error('Erro: Não foi possível ler o HEAD do git.');
    process.exit(1);
  }

  // Verifica se o working directory está limpo
  let isDirty = false;
  try {
    const status = execSync('git status --porcelain').toString().trim();
    if (status.length > 0) isDirty = true;
  } catch {
    console.error('Erro: Falha ao verificar git status.');
    process.exit(1);
  }

  if (isDirty) {
    console.error(
      'Bloqueado: Há alterações não commitadas (working tree suja). O código em teste pode divergir da revisão.',
    );
    process.exit(1);
  }

  if (
    currentHead !== reviewedCommit &&
    !currentHead.startsWith(reviewedCommit)
  ) {
    console.error(
      `Bloqueado: O conteúdo mudou. HEAD atual (${currentHead}) diverge do commit aprovado (${reviewedCommit}). Refaça a verificação.`,
    );
    process.exit(1);
  }

  if (!content.includes('Veredito: APROVADO')) {
    console.error(
      "Bloqueado: O arquivo de revisão não contém 'Veredito: APROVADO'.",
    );
    process.exit(1);
  }

  console.log('Gate aprovado. O conteúdo bate com a última revisão aprovada.');
  process.exit(0);
}

main();
