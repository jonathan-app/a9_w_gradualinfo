#!/usr/bin/env node

/**
 * check-decision.mjs — Autoridade executável da decisão de qualidade
 * Uso: node scripts/check-decision.mjs <resultado.json>
 *
 * resultado.json deve ter o formato:
 * {
 *   "acs": [
 *     { "id": "AC-01", "status": "PASS", "evidence": "screenshot.png", "note": "..." }
 *   ],
 *   "findings": [
 *     { "severity": "BLOCKER", "description": "..." }
 *   ]
 * }
 */

import { readFileSync, existsSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      JSON.stringify(
        {
          approved: false,
          verdict: 'Erro: Forneça o caminho para resultado.json',
          counts: {},
          reasons: ['Arquivo não fornecido.'],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const filePath = args[0];
  if (!existsSync(filePath)) {
    console.error(
      JSON.stringify(
        {
          approved: false,
          verdict: 'Erro: Arquivo não encontrado',
          counts: {},
          reasons: [`O arquivo ${filePath} não existe.`],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  let data;
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    data = JSON.parse(fileContent);
  } catch {
    console.error(
      JSON.stringify(
        {
          approved: false,
          verdict: 'Erro: JSON inválido',
          counts: {},
          reasons: ['O arquivo não é um JSON válido.'],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const acs = data.acs || [];
  const findings = data.findings || [];

  const reasons = [];
  let approved = true;

  const counts = {
    totalACs: acs.length,
    PASS: 0,
    FAIL: 0,
    UNVERIFIABLE: 0,
    missingEvidence: 0,
    BLOCKER: 0,
    WARNING: 0,
  };

  if (acs.length === 0) {
    approved = false;
    reasons.push('Nenhum critério de aceite (AC) fornecido ou lista vazia.');
  }

  for (const ac of acs) {
    const status = ac.status ? ac.status.toUpperCase() : 'vazio';
    if (status === 'PASS') counts.PASS++;
    else if (status === 'FAIL') counts.FAIL++;
    else if (status === 'UNVERIFIABLE') counts.UNVERIFIABLE++;
    else reasons.push(`AC inválido ou vazio: ${ac.id}`);

    if (status !== 'PASS') {
      approved = false;
      reasons.push(`AC reprovado ou não verificável: ${ac.id} (${status})`);
    }

    if (!ac.evidence || ac.evidence.trim() === '') {
      counts.missingEvidence++;
      approved = false;
      reasons.push(`Falta evidência para o AC: ${ac.id}`);
    }
  }

  for (const finding of findings) {
    const severity = finding.severity ? finding.severity.toUpperCase() : 'INFO';
    if (severity === 'BLOCKER') {
      counts.BLOCKER++;
      approved = false;
      reasons.push(
        `Encontrado achado bloqueante (BLOCKER): ${finding.description}`,
      );
    } else if (severity === 'WARNING') {
      counts.WARNING++;
    }
  }

  const result = {
    approved,
    verdict: approved ? 'APROVADO' : 'REPROVADO',
    counts,
    reasons,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(approved ? 0 : 1);
}

main();
