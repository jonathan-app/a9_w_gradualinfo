#!/usr/bin/env node
/**
 * @fileoverview CLI de decisão do gate: avalia o artefato de resultados e imprime o veredito.
 * @module scripts/check-decision
 * @description Fronteira fina sobre `decide()` (check-contract.mjs): lê o JSON de resultados,
 *   recalcula a aprovação e emite o JSON de decisão no stdout — exatamente o arquivo que
 *   `check-gate.mjs` consome logo em seguida no job `check-gate` da CI.
 * @dependencies ./check-contract.mjs (`args`, `decide`), node:fs, node:process.
 *
 * Quando executado: CI (job `check-gate`, logo após `ci-check-results.mjs`) e pelos testes
 *   `__tests__/unit/gates.test.ts`.
 * Lê: JSON de resultados, informado como primeiro argumento.
 * Escreve: nada em disco — a decisão sai em stdout (por isso a CI usa `> arquivo`).
 * Códigos de saída: 0 = aprovado; 1 = reprovado OU entrada inválida. O `catch` garante que
 *   mesmo um erro de parsing emita um JSON REPROVADO em stdout, nunca stdout vazio.
 */
import { readFileSync } from 'node:fs';
import { args, decide } from './check-contract.mjs';
try {
  const options = args(process.argv.slice(2));
  const result = decide(
    JSON.parse(readFileSync(options.file, 'utf8')),
    options.spec,
    options.repo,
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.approved ? 0 : 1;
} catch (error) {
  // Decisão malformada ainda é decisão: o consumidor (check-gate) lê o stdout, então ele
  // nunca pode ficar vazio — o erro vira um veredito REPROVADO com o motivo.
  console.log(
    JSON.stringify({
      approved: false,
      verdict: 'REPROVADO',
      reasons: [error.message],
    }),
  );
  process.exitCode = 1;
}
