#!/usr/bin/env node
/**
 * @fileoverview Agregador do baseline de segurança open-source (zero falso sucesso).
 * @module scripts/security-baseline
 * @description Executa as cinco camadas canônicas — higiene `.env`, OSV-Scanner, Semgrep,
 *   Gitleaks e `pnpm audit` — e consolida o resultado em um manifesto com status por camada
 *   e status geral (PASS / DEGRADED / FAIL).
 * @dependencies `./run-osv-scanner.mjs`, `./run-semgrep.mjs`, `./run-gitleaks.mjs`,
 *   `./check-env-leak.mjs`, node:child_process, node:fs, node:path.
 *
 * Quando executado: via `pnpm run security:baseline` localmente e no workflow
 *   `.github/workflows/security.yml` (com `CI=true`, onde ferramenta ausente = FAIL).
 * Lê: binários das ferramentas, lockfile, regras Semgrep e estado Git do repositório.
 * Escreve: `security-reports/` — `manifest.json`, `osv.json`, `semgrep.json`,
 *   `gitleaks.json` e `pnpm-audit.json`.
 * Códigos de saída: 0 = PASS; 1 = FAIL ou DEGRADED (ferramenta ausente no ambiente local
 *   degrada o status, mas ainda reprova o processo).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runOsvScan, resolveOsvBinary } from './run-osv-scanner.mjs';
import { runSemgrepScan, resolveSemgrepBinary } from './run-semgrep.mjs';
import { runGitleaksScan, resolveGitleaksBinary } from './run-gitleaks.mjs';
import { checkEnvLeaks } from './check-env-leak.mjs';

/**
 * Obtém o SHA do commit atual, tolerando repositórios sem histórico.
 *
 * @param [cwd] - Diretório do repositório.
 * @returns SHA completo ou `'UNKNOWN'` quando o Git falha.
 */
export function getCommitSha(cwd = process.cwd()) {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return res.status === 0 ? res.stdout.trim() : 'UNKNOWN';
}

/**
 * Obtém o nome da branch atual (ou `HEAD` destacado em CI com checkout raso).
 *
 * @param [cwd] - Diretório do repositório.
 * @returns Nome da branch ou `'UNKNOWN'`.
 */
export function getCurrentBranch(cwd = process.cwd()) {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return res.status === 0 ? res.stdout.trim() : 'UNKNOWN';
}

/**
 * Executa o baseline completo e grava o manifesto consolidado.
 *
 * Regra de negócio central: em CI (`isCI`) ferramenta ausente vira FAIL; localmente vira
 *   DEGRADED (aviso), para que o gate rode sem instalar tudo. Qualquer FAIL em qualquer
 *   camada reprova o baseline inteiro — não existe parcial.
 *
 * Efeitos colaterais: cria `outputDir`, escreve cinco relatórios + `manifest.json` e
 *   imprime um passo numerado por camada em stdout/stderr.
 *
 * @param [opções] - Parâmetros do baseline.
 * @param [opções.cwd] - Diretório do repositório (padrão: cwd atual).
 * @param [opções.isCI] - Modo estrito de CI (padrão: variável `CI` definida).
 * @param [opções.outputDir] - Diretório dos relatórios (relativo a `cwd` ou absoluto).
 * @returns Status
 *   geral, código de saída e o manifesto gravado em disco.
 */
export function runSecurityBaseline({
  cwd = process.cwd(),
  isCI = Boolean(process.env.CI),
  outputDir = 'security-reports',
} = {}) {
  const reportsDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(cwd, outputDir);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const manifestPath = path.join(reportsDir, 'manifest.json');
  const commitSha = getCommitSha(cwd);
  const branch = getCurrentBranch(cwd);

  console.log(
    `[Security Baseline] Iniciando verificação canônica em ${branch} (${commitSha.slice(0, 8)})...`,
  );

  const summary = {
    envHygiene: 'NOT_RUN',
    osv: 'NOT_RUN',
    semgrep: 'NOT_RUN',
    gitleaks: 'NOT_RUN',
    pnpmAudit: 'NOT_RUN',
  };

  // Marca se alguma camada reprovou; ferramenta ausente localmente vira DEGRADED e não conta aqui.
  let hasFailure = false;

  // 1. Verificação estática de .env
  console.log('\n--- 1/5: Higiene de Ambiente (.env) ---');
  const envRes = checkEnvLeaks({ cwd });
  if (envRes.status === 'PASS') {
    summary.envHygiene = 'PASS';
    console.log('[Security Baseline] Env hygiene: PASS');
  } else {
    summary.envHygiene = 'FAIL';
    hasFailure = true;
    console.error('[Security Baseline] Env hygiene: FAIL');
  }

  // 2. OSV-Scanner
  // Padrão repetido nas camadas 2–4: sem binário => FAIL no CI (gate estrito) e
  // DEGRADED localmente (aviso), para não exigir instalação global no dev machine.
  console.log('\n--- 2/5: Dependências OSV-Scanner ---');
  const osvBin = resolveOsvBinary(cwd);
  if (!osvBin) {
    summary.osv = isCI ? 'FAIL' : 'DEGRADED';
    if (isCI) {
      hasFailure = true;
      console.error('[Security Baseline] OSV-Scanner ausente no CI: FAIL');
    } else {
      console.warn(
        '[Security Baseline] OSV-Scanner não instalado localmente (degradado).',
      );
    }
  } else {
    const osvRes = runOsvScan({ cwd });
    if (osvRes.status === 'PASS') {
      summary.osv = 'PASS';
    } else {
      summary.osv = 'FAIL';
      hasFailure = true;
    }
  }

  // 3. Semgrep SAST
  console.log('\n--- 3/5: SAST Semgrep ---');
  const semgrepBin = resolveSemgrepBinary();
  if (!semgrepBin) {
    summary.semgrep = isCI ? 'FAIL' : 'DEGRADED';
    if (isCI) {
      hasFailure = true;
      console.error('[Security Baseline] Semgrep ausente no CI: FAIL');
    } else {
      console.warn(
        '[Security Baseline] Semgrep não encontrado localmente (degradado).',
      );
    }
  } else {
    const semgrepRes = runSemgrepScan({ cwd });
    if (semgrepRes.status === 'PASS') {
      summary.semgrep = 'PASS';
    } else {
      summary.semgrep = 'FAIL';
      hasFailure = true;
    }
  }

  // 4. Gitleaks Secrets
  console.log('\n--- 4/5: Detecção de Segredos Gitleaks ---');
  const gitleaksBin = resolveGitleaksBinary();
  if (!gitleaksBin) {
    summary.gitleaks = isCI ? 'FAIL' : 'DEGRADED';
    if (isCI) {
      hasFailure = true;
      console.error('[Security Baseline] Gitleaks ausente no CI: FAIL');
    } else {
      console.warn(
        '[Security Baseline] Gitleaks não encontrado localmente (degradado).',
      );
    }
  } else {
    const gitleaksRes = runGitleaksScan({ cwd });
    if (gitleaksRes.status === 'PASS') {
      summary.gitleaks = 'PASS';
    } else {
      summary.gitleaks = 'FAIL';
      hasFailure = true;
    }
  }

  // 5. pnpm audit
  console.log('\n--- 5/5: pnpm audit ---');
  const pnpmAuditOutput = path.join(reportsDir, 'pnpm-audit.json');
  const pnpmAuditRes = spawnSync('pnpm', ['audit', '--json'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let pnpmAuditValid = false;
  if (pnpmAuditRes.stdout) {
    try {
      // `pnpm audit --json` sai com código ≠ 0 quando há CVEs; mesmo assim o JSON é útil e
      // é gravado com _meta para rastreio — a reprovação vem do exit code logo abaixo.
      const auditReport = JSON.parse(pnpmAuditRes.stdout);
      auditReport._meta = { commitSha, generatedAt: new Date().toISOString() };
      fs.writeFileSync(
        pnpmAuditOutput,
        JSON.stringify(auditReport, null, 2),
        'utf8',
      );
      pnpmAuditValid = true;
    } catch {
      console.error(
        '[Security Baseline] pnpm audit retornou relatório JSON inválido.',
      );
    }
  }
  if (pnpmAuditRes.status === 0 && pnpmAuditValid) {
    summary.pnpmAudit = 'PASS';
    console.log('[Security Baseline] pnpm audit: PASS');
  } else {
    summary.pnpmAudit = 'FAIL';
    hasFailure = true;
    console.error('[Security Baseline] pnpm audit: FAIL');
  }

  // Qualquer FAIL prevalece sobre DEGRADED; DEGRADED/NOT_RUN prevalece sobre PASS.
  const hasDegraded = Object.values(summary).some(
    (status) => status === 'DEGRADED' || status === 'NOT_RUN',
  );
  const overallStatus = hasFailure ? 'FAIL' : hasDegraded ? 'DEGRADED' : 'PASS';

  // Manifesto é o artefato consumível por CI/humano: status por camada, caminho de cada
  // relatório (ou null quando a camada não gerou arquivo) e a origem exata (branch/commit).
  const manifest = {
    timestamp: new Date().toISOString(),
    commitSha,
    branch,
    status: overallStatus,
    isCI,
    summary,
    reports: {
      osv: fs.existsSync(path.join(reportsDir, 'osv.json'))
        ? 'security-reports/osv.json'
        : null,
      semgrep: fs.existsSync(path.join(reportsDir, 'semgrep.json'))
        ? 'security-reports/semgrep.json'
        : null,
      gitleaks: fs.existsSync(path.join(reportsDir, 'gitleaks.json'))
        ? 'security-reports/gitleaks.json'
        : null,
      pnpmAudit: fs.existsSync(path.join(reportsDir, 'pnpm-audit.json'))
        ? 'security-reports/pnpm-audit.json'
        : null,
    },
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `\n[Security Baseline] Manifesto gerado em: ${path.relative(cwd, manifestPath)}`,
  );
  console.log(`[Security Baseline] Status Geral: ${overallStatus}`);

  return {
    status: overallStatus,
    exitCode: overallStatus === 'PASS' ? 0 : 1,
    manifest,
  };
}

// Guarda de execução direta: roda como CLI somente quando este arquivo é o entrypoint;
// nos demais casos o módulo é importado (testes chamam runSecurityBaseline diretamente).
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const result = runSecurityBaseline();
  process.exit(result.exitCode);
}
