#!/usr/bin/env node
/**
 * @fileoverview Guarda de vazamento de variáveis de ambiente (`.env*`) no Git.
 * @module scripts/check-env-leak
 * @description Verifica duas superfícies: arquivos `.env*` já rastreados no índice e arquivos
 *   `.env*` em staging (preparados para commit), sempre ignorando `*.example`.
 * @dependencies node:child_process (`git ls-files` e `git diff --cached`), node:path, node:process.
 *
 * Quando executado: como etapa 1/5 do `pnpm run security:baseline`, dentro do diagnóstico
 *   (`pnpm run security:doctor`) e no hook `.husky/pre-commit` (bloqueia o commit).
 * Lê: estado do Git do repositório (índice e staging) — nenhum arquivo do disco é alterado.
 * Escreve: nada; apenas relata em stderr e devolve `{ status, exitCode, leakedFiles }`.
 * Códigos de saída: 0 = nenhum `.env` confidencial; 1 = vazamento detectado.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

/**
 * Detecta arquivos `.env` confidenciais rastreados ou em staging no Git.
 *
 * @param [opções] - Opções de execução.
 * @param [opções.cwd] - Diretório do repositório a inspecionar (padrão: cwd atual).
 * @returns Resultado da
 *   verificação: `leakedFiles` lista os caminhos que precisam de `git rm --cached` e entrada
 *   no `.gitignore`. Não lança exceção — falhas do Git retornam listas vazias.
 */
export function checkEnvLeaks({ cwd = process.cwd() } = {}) {
  // 1. Verificar arquivos .env rastreados no repositório (exceto .env.example)
  const lsResult = spawnSync('git', ['ls-files', '.env*'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const trackedFiles = (lsResult.stdout || '')
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && !f.endsWith('.example'));

  // 2. Verificar arquivos .env em staging (staged para commit, exceto .env.example)
  const diffResult = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stagedFiles = (diffResult.stdout || '')
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.startsWith('.env') && !f.endsWith('.example'));

  const detected = Array.from(new Set([...trackedFiles, ...stagedFiles]));

  if (detected.length > 0) {
    // Regra de negócio: qualquer `.env` rastreado ou staged é bloqueio absoluto (exit 1),
    // sem graduação por severidade — segredos não têm "quase passou".
    console.error(
      `[Security:env] ERRO CRÍTICO: Arquivo(s) confidencial(is) de ambiente rastreado(s) no Git:`,
    );
    for (const file of detected) {
      console.error(`  - ${file}`);
    }
    console.error(
      `[Security:env] Ação recomendada: execute 'git rm --cached <arquivo>' e garanta entrada no .gitignore.`,
    );
    return {
      status: 'FAIL',
      exitCode: 1,
      leakedFiles: detected,
    };
  }

  return {
    status: 'PASS',
    exitCode: 0,
    leakedFiles: [],
  };
}

// Guarda de execução direta: só roda como CLI quando este arquivo é o entrypoint,
// permitindo importar `checkEnvLeaks` nos testes sem disparar `process.exit`.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const result = checkEnvLeaks();
  if (result.status === 'PASS') {
    console.log(
      '[Security:env] PASS: Nenhum arquivo confidencial .env rastreado ou em staging.',
    );
  }
  process.exit(result.exitCode);
}
