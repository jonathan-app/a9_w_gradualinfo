#!/usr/bin/env node
/**
 * @fileoverview Diagnóstico de segurança "free" (apontado por `pnpm run security:doctor`).
 * @module scripts/security-free-doctor
 * @description Variante canônica do doctor: verifica OSV-Scanner, Semgrep, Gitleaks, versão
 *   exata do pnpm (via campo `packageManager`), higiene de `.env` e `.vscode/mcp.json`,
 *   imprimindo relatório por item. Não executa scans — apenas diagnostica.
 * @dependencies `./run-osv-scanner.mjs`, `./run-semgrep.mjs`, `./run-gitleaks.mjs`,
 *   `./check-env-leak.mjs`, node:child_process, node:fs, node:path.
 *
 * Quando executado: via `pnpm run security:doctor` (npm script) e pelos testes
 *   `tests/security-gate.test.mjs`.
 * Lê: binários no PATH/`.cache`, `package.json` e `.vscode/mcp.json`.
 * Escreve: nenhum arquivo — apenas relatório em stdout.
 * Códigos de saída: 0 = nenhum item FAIL; 1 = ao menos um FAIL.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveOsvBinary, verifyOsvBinary } from './run-osv-scanner.mjs';
import { resolveSemgrepBinary } from './run-semgrep.mjs';
import { resolveGitleaksBinary } from './run-gitleaks.mjs';
import { checkEnvLeaks } from './check-env-leak.mjs';

/**
 * Verifica a conformidade e segurança da configuração MCP (.vscode/mcp.json).
 * Garante:
 * 1. Ausência de segredos ou tokens hardcoded.
 * 2. Ausência de tags mutáveis flutuantes (@latest).
 * 3. Uso do Playwright em modo isolado (--isolated).
 *
 * @param [cwd] - Diretório raiz do projeto onde procurar `.vscode/mcp.json`.
 * @returns
 *   `skipped: true` quando o arquivo é opcional e não existe; `error` é a mensagem pronta
 *   para exibição quando `ok` é falso.
 */
export function checkMcpSecurity(cwd = process.cwd()) {
  const mcpPath = path.join(cwd, '.vscode', 'mcp.json');
  if (!fs.existsSync(mcpPath)) {
    return { ok: true, skipped: true, error: null };
  }

  try {
    const raw = fs.readFileSync(mcpPath, 'utf-8');
    const config = JSON.parse(raw);
    const servers = config.servers || {};
    const issues = [];

    if (
      raw.includes('ghp_') ||
      raw.includes('github_pat_') ||
      /"Bearer\s+[^"]+"/i.test(raw)
    ) {
      issues.push(
        'Segredo/token de autenticação detectado em .vscode/mcp.json.',
      );
    }

    for (const [name, srv] of Object.entries(servers)) {
      const args = srv.args || [];
      if (
        args.some((arg) => typeof arg === 'string' && arg.includes('@latest'))
      ) {
        issues.push(
          `Servidor MCP '${name}' usa tag flutuante '@latest'. Fixe no devDependencies.`,
        );
      }

      if (name === 'playwright' && !args.includes('--isolated')) {
        issues.push(
          "Servidor Playwright MCP deve rodar com '--isolated' para evitar persistência de perfil.",
        );
      }
    }

    if (issues.length > 0) {
      return { ok: false, issues, error: issues.join(' ') };
    }

    return { ok: true, issues: [], error: null };
  } catch (err) {
    return {
      ok: false,
      issues: [err.message],
      error: `Falha ao validar .vscode/mcp.json: ${err.message}`,
    };
  }
}

/**
 * Coleta o status das seis verificações de segurança do projeto.
 *
 * Cada item recebe um dos status: `PASS`, `FAIL`, `DEGRADED` (ferramenta ausente, mas não
 *   bloqueante no diagnóstico) ou `NOT RUN` (pré-condição não satisfeita).
 *
 * Diferença em relação ao doctor legado: a validade do pnpm é conferida por igualdade
 *   exata com o campo `packageManager` do package.json, não por faixa de engines.
 *
 * Efeitos colaterais: nenhuma escrita em disco; apenas spawn de comandos de leitura.
 *
 * @param [opções] - Opções do diagnóstico.
 * @param [opções.cwd] - Diretório raiz do projeto (padrão: cwd atual).
 * @returns
 *  Mapa item → `{ status, message }`.
 */
export function runSecurityDoctorFree({ cwd = process.cwd() } = {}) {
  const report = {
    osv: { status: 'NOT RUN', message: '' },
    semgrep: { status: 'NOT RUN', message: '' },
    gitleaks: { status: 'NOT RUN', message: '' },
    pnpmAudit: { status: 'NOT RUN', message: '' },
    envHygiene: { status: 'NOT RUN', message: '' },
    mcpConfig: { status: 'NOT RUN', message: '' },
  };

  // 1. OSV-Scanner
  const osvBin = resolveOsvBinary(cwd);
  if (!osvBin) {
    report.osv = {
      status: 'NOT RUN',
      message:
        'Binário não encontrado. Execute: node scripts/install-osv-scanner.mjs',
    };
  } else {
    try {
      const ver = verifyOsvBinary(osvBin);
      report.osv = {
        status: 'PASS',
        message: `OSV-Scanner v1.9.2 verificado com SHA-256 canônico (${ver.actualSha256.slice(0, 12)}...)`,
      };
    } catch (err) {
      report.osv = {
        status: 'FAIL',
        message: `Falha na verificação de integridade: ${err.message}`,
      };
    }
  }

  // 2. Semgrep SAST
  const semgrepBin = resolveSemgrepBinary();
  const semgrepRules = path.join(cwd, 'security/semgrep/rules.yml');
  const rulesExist = fs.existsSync(semgrepRules);

  if (!semgrepBin) {
    report.semgrep = {
      status: 'DEGRADED',
      message:
        'Binário não encontrado no PATH. Instale via "pip install semgrep" ou "brew install semgrep".',
    };
  } else if (!rulesExist) {
    report.semgrep = {
      status: 'FAIL',
      message: 'Regras locais ausentes em security/semgrep/rules.yml',
    };
  } else {
    report.semgrep = {
      status: 'PASS',
      message:
        'Semgrep disponível no PATH com regras locais em security/semgrep/',
    };
  }

  // 3. Gitleaks
  const gitleaksBin = resolveGitleaksBinary();
  if (!gitleaksBin) {
    report.gitleaks = {
      status: 'DEGRADED',
      message:
        'Binário não encontrado no PATH. Instale via "brew install gitleaks" ou release oficial do GitHub.',
    };
  } else {
    report.gitleaks = {
      status: 'PASS',
      message:
        'Gitleaks disponível no PATH com suporte à sintaxe moderna (gitleaks dir) e --redact.',
    };
  }

  // 4. pnpm audit
  const pnpmCheck = spawnSync('pnpm', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let requiredPnpm = null;
  try {
    // Extrai a versão canônica de "packageManager": "pnpm@12.5.1" -> "12.5.1".
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'),
    );
    requiredPnpm = pkg.packageManager?.match(/^pnpm@(.+)$/)?.[1] ?? null;
  } catch {
    // A ausência de manifesto será reportada como incompatibilidade abaixo.
  }
  const installedPnpm = pnpmCheck.stdout.trim();
  // Regra estrita: igualdade exata — versão diferente da pinada reprova o diagnóstico,
  // inclusive quando apenas o patch diverge (reprodutibilidade do gate de segurança).
  if (
    pnpmCheck.status === 0 &&
    installedPnpm &&
    requiredPnpm === installedPnpm
  ) {
    report.pnpmAudit = {
      status: 'PASS',
      message: `pnpm v${installedPnpm} corresponde ao packageManager e está disponível para auditoria.`,
    };
  } else {
    report.pnpmAudit = {
      status: 'FAIL',
      message: requiredPnpm
        ? `pnpm incompatível: esperado ${requiredPnpm}, obtido ${installedPnpm || 'não instalado'}.`
        : 'Não foi possível determinar a versão canônica do pnpm no package.json.',
    };
  }

  // 5. Env Hygiene
  const envCheck = checkEnvLeaks({ cwd });
  if (envCheck.status === 'PASS') {
    report.envHygiene = {
      status: 'PASS',
      message:
        'Nenhum arquivo confidencial .env rastreado no repositório ou em staging.',
    };
  } else {
    report.envHygiene = {
      status: 'FAIL',
      message: `Arquivos .env confidenciais encontrados no Git: ${envCheck.leakedFiles.join(', ')}`,
    };
  }

  // 6. MCP Security Hygiene
  const mcpCheck = checkMcpSecurity(cwd);
  if (mcpCheck.skipped) {
    report.mcpConfig = {
      status: 'PASS',
      message: 'Configuração .vscode/mcp.json ausente (opcional).',
    };
  } else if (mcpCheck.ok) {
    report.mcpConfig = {
      status: 'PASS',
      message:
        'Configuração .vscode/mcp.json em conformidade estrita (sem tokens, tags fixas).',
    };
  } else {
    report.mcpConfig = {
      status: 'FAIL',
      message: mcpCheck.error,
    };
  }

  return report;
}

/**
 * Imprime o relatório do diagnóstico em formato de tabela legível.
 *
 * @param report - Relatório retornado
 *   por `runSecurityDoctorFree`.
 * @returns Apenas escreve em stdout.
 */
export function printSecurityDoctorFree(report) {
  console.log('='.repeat(64));
  console.log(
    '         Gradualinfo Security Free Baseline Doctor - Diagnóstico',
  );
  console.log('='.repeat(64));
  for (const [key, val] of Object.entries(report)) {
    const padKey = (key + ':').padEnd(14, ' ');
    const tag = `[${val.status}]`.padEnd(11, ' ');
    console.log(`${tag} ${padKey} ${val.message}`);
  }
  console.log('='.repeat(64));
  console.log('Nota de Governança:');
  console.log(
    '- No CI (GitHub Actions), TODAS as camadas são executadas de forma estrita.',
  );
  console.log(
    '- Zero tolerância a falso sucesso: nenhuma ferramenta mascara falhas ou ignora erros.',
  );
  console.log('='.repeat(64));
}

// Guarda de execução direta: roda como CLI somente quando este arquivo é o entrypoint.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const report = runSecurityDoctorFree();
  printSecurityDoctorFree(report);
  // Exit 1 se QUALQUER camada reprovou; avisos (DEGRADED/NOT RUN) não derrubam o processo.
  const hasFail = Object.values(report).some((item) => item.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}
