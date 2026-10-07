#!/usr/bin/env node
/**
 * @fileoverview Wrapper canônico do Semgrep com as regras locais do projeto.
 * @module scripts/run-semgrep
 * @description Exige `semgrep==SEMGREP_VERSION` e `security/semgrep.yml`, roda o scan em
 *   modo estrito (`--severity ERROR --error --strict`, métricas desligadas) e grava o
 *   relatório bruto em `security-reports/semgrep.json` para consumo pelo baseline.
 * @dependencies node:fs, node:path, node:child_process, node:url.
 *
 * Quando executado: `pnpm security:sast`, como etapa 3/5 de `pnpm security:baseline`
 *   (via security-baseline.mjs) e pelos testes do gate.
 * Lê: binário `semgrep` no PATH e `security/semgrep.yml`.
 * Escreve: `security-reports/semgrep.json` (sobrescrito a cada execução).
 * Códigos de saída: 0 = sem finding ERROR; 1 = ao menos um finding ou falha operacional —
 *   qualquer desvio sai como erro em stderr, nunca como sucesso silencioso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const SEMGREP_VERSION = '1.179.0';
export function resolveSemgrepBinary() {
  return 'semgrep';
}
export function runSemgrepScan() {
  const rules = 'security/semgrep.yml';
  if (!fs.existsSync(rules)) throw new Error('Regras locais ausentes.');
  // O binário é resolvido por nome, não por caminho: ausência só aparece na execução, e por
  // isso a versão é conferida a cada scan — semgrep diferente gera relatório incomparável.
  const binary = resolveSemgrepBinary();
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  if (version.error) throw version.error;
  if (version.status !== 0)
    throw new Error(`Semgrep indisponível: ${version.stderr.trim()}`);
  if (
    version.error ||
    version.status !== 0 ||
    version.stdout.trim() !== SEMGREP_VERSION
  )
    throw new Error(
      `Instale semgrep==${SEMGREP_VERSION}; versão ausente ou divergente.`,
    );
  // Scan estrito: ERROR vira exit 1 (`--error`), e qualquer erro interno do scanner falha o
  // report (`--strict`). `--metrics off` evita telemetria da rede corporativa/isolada.
  const result = spawnSync(
    binary,
    [
      'scan',
      '--config',
      rules,
      '--severity',
      'ERROR',
      '--error',
      '--strict',
      '--json',
      '--quiet',
      '--metrics',
      'off',
      '.',
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  // 0 = sem findings; 1 = findings ERROR. Qualquer outro status é scanner quebrado.
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('Falha operacional do Semgrep.');
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error('Relatório Semgrep inválido.');
  }
  // `results` vazio com `errors` populado é scan abortado que se disfarça de limpo.
  if (!Array.isArray(report.results) || report.errors?.length)
    throw new Error('Scan incompleto ou relatório inválido.');
  fs.mkdirSync('security-reports', { recursive: true });
  fs.writeFileSync(
    'security-reports/semgrep.json',
    JSON.stringify(report, null, 2),
  );
  // Exit diferente de 0 sem findings é contradição interna: falha com ferramenta íntegra
  // mandaria um JSON vazio que passaria batido.
  if (result.status !== 0 && !report.results.length)
    throw new Error('Semgrep retornou erro sem findings.');
  return report.results;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const findings = runSemgrepScan();
    console.log(`Semgrep: ${findings.length} findings ERROR.`);
    process.exitCode = findings.length ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
