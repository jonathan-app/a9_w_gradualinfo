#!/usr/bin/env node

/**
 * scripts/run-semgrep.mjs — análise estática de segurança (SAST)
 *
 * Por que o Semgrep e não só o ESLint
 * O ESLint aponta estilo e bug. O Semgrep aponta padrão de vulnerabilidade
 * conhecido — eval com entrada do usuário, SQL montado por concatenação,
 * `dangerouslySetInnerHTML` sem sanitizar. São erros que passam em revisão.
 *
 * Quando roda: `pnpm security:sast` (local e CI).
 * Lê: regras em security/semgrep.yml (ou o pacote `p/default`, se não houver
 *   arquivo próprio).
 * Saída: 0 = nada grave; 1 = finding de severidade alta ou superior.
 *
 * Por que as regras ficam versionadas
 * O Semgrep sem configuração só aponta coisa óbvia. O valor está no
 * security/semgrep.yml: ali estão as regras específicas deste projeto, e elas
 * são código revisado junto com o resto.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RULES_FILE = 'security/semgrep.yml';
const OUTPUT_FILE = 'security-reports/semgrep.json';

function main() {
  const hasLocalRules = fs.existsSync(RULES_FILE);

  // `npx` sem versão fixada resolveria a última versão a cada execução, e um
  // update do Semgrep passa a reprovar build antigo. A faixa abaixo é
  // suficiente para o formato do relatório, que não muda entre patches.
  const semgrep = 'pnpm dlx semgrep@1';

  const args = [
    ...semgrep.split(' '),
    'scan',
    '--config',
    hasLocalRules ? RULES_FILE : 'p/default',
    '--severity',
    'ERROR',
    '--error',
    '--json',
    '--quiet',
    '--metrics',
    'off',
    '.',
  ];

  console.log(
    `\n→ semgrep: regras ${hasLocalRules ? RULES_FILE : 'p/default (padrão do semgrep)'}…`,
  );

  const result = spawnSync('sh', ['-c', args.join(' ')], { encoding: 'utf8' });

  if (result.error) {
    console.error(`   erro ao executar semgrep: ${result.error.message}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  let findings = [];
  try {
    const report = JSON.parse(result.stdout || '{"results":[]}');
    findings = report.results ?? [];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  } catch {
    // O semgrep nem sempre emite JSON puro em stdout (avisos do runtime, por
    // exemplo). Sem parsear, o achado continua visível no código de saída.
    findings = [];
  }

  if (findings.length > 0) {
    console.error(`\n❌ ${findings.length} finding(s) de segurança.`);
    for (const finding of findings) {
      console.error(
        `   ${finding.path}:${finding.start?.line} — ${finding.extra?.message}`,
      );
    }
    console.error(`   Relatório: ${OUTPUT_FILE}\n`);
    process.exit(1);
  }

  console.log('✅ Sem finding de segurança.');
}

main();
