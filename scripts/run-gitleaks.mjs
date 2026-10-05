#!/usr/bin/env node

/**
 * scripts/run-gitleaks.mjs — procura segredo no histórico e na árvore de trabalho
 *
 * Por que existe
 * O `.gitignore` protege o futuro: ele impede que `.env` seja commitado agora.
 * Não protege o passado. Se um segredo já entrou no histórico, apagar o
 * arquivo não resolve — ele continua em qualquer clone, e apagar exige reescrever
 * o histórico. Por isso a verificação roda sobre `git log`, não só sobre os
 * arquivos de hoje.
 *
 * Quando roda: `pnpm security:secrets` (local e CI).
 * Lê: binário do gitleaks (`.cache/bin/gitleaks` ou PATH).
 * Escreve: security-reports/gitleaks.json (sobrescrito a cada execução).
 * Saída: 0 = nada encontrado; 1 = segredo encontrado ou binário ausente.
 *
 * `--redact` é obrigatório: sem ele o relatório imprime a credencial no
 * terminal e no arquivo — o scanner viraria o novo lugar onde o segredo está.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Retorna o caminho do gitleaks (cache do projeto ou PATH) para reuso. */
export function resolveGitleaksBinary(cwd = process.cwd()) {
  const local = path.join(cwd, '.cache/bin/gitleaks');
  if (fs.existsSync(local)) return local;

  const which = spawnSync('which', ['gitleaks'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();

  return null;
}

const OUTPUT_DIR = 'security-reports';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'gitleaks.json');

/** Executa o scan do Gitleaks e retorna os findings (para reuso em baseline). */
export async function runGitleaksScan() {
  const binary = resolveGitleaksBinary();

  if (!binary) {
    throw new Error('gitleaks não encontrado no sistema.');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const runs = [
    {
      label: 'histórico git',
      args: [
        'git',
        '--redact',
        '--report-format',
        'json',
        '--report-path',
        OUTPUT_FILE,
      ],
    },
    {
      label: 'arquivos atuais',
      args: [
        'dir',
        '.',
        '--redact',
        '--no-git',
        '--report-format',
        'json',
        '--report-path',
        OUTPUT_FILE,
      ],
    },
  ];

  let findings = [];

  for (const run of runs) {
    const result = spawnSync(binary, run.args, { stdio: 'pipe' });

    if (result.error) {
      throw new Error(`erro ao executar gitleaks: ${result.error.message}`);
    }

    if (fs.existsSync(OUTPUT_FILE)) {
      findings = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
  }

  return findings;
}

function main() {
  const binary = resolveGitleaksBinary();

  if (!binary) {
    console.error('\n❌ gitleaks não encontrado no sistema.\n');
    console.error('   macOS:  brew install gitleaks');
    console.error('   Linux:  wget -qO- https://raw.githubusercontent.com');
    console.error('           /gitleaks/gitleaks/master/install.sh | sh');
    console.error('   Ou baixe o binário em .cache/bin/gitleaks.\n');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // `git` varre o histórico inteiro (pega segredo que já saiu do arquivo);
  // `dir` varre só a árvore atual. Os dois rodam: o primeiro é o que pega
  // segredo antigo, o segundo pega o que está em arquivo não rastreado.
  const runs = [
    {
      label: 'histórico git',
      args: [
        'git',
        '--redact',
        '--report-format',
        'json',
        '--report-path',
        OUTPUT_FILE,
      ],
    },
    {
      label: 'arquivos atuais',
      args: [
        'dir',
        '.',
        '--redact',
        '--no-git',
        '--report-format',
        'json',
        '--report-path',
        OUTPUT_FILE,
      ],
    },
  ];

  let findings = [];

  for (const run of runs) {
    console.log(`\n→ gitleaks: verificando ${run.label}…`);

    const result = spawnSync(binary, run.args, { stdio: 'pipe' });

    if (result.error) {
      console.error(`   erro ao executar gitleaks: ${result.error.message}`);
      process.exit(1);
    }

    // O gitleaks escreve [] quando não acha nada e sobrescreve a cada execução,
    // então o relatório do último run é sempre o mais recente.
    if (fs.existsSync(OUTPUT_FILE)) {
      findings = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }

    // 0 = limpo; 1 = segredo encontrado (o gitleaks usa 1 para achado).
    if (result.status === 1) {
      console.error('   segredo potencial encontrado.');
    }
  }

  console.log('');
  if (findings.length > 0) {
    console.error(
      `❌ ${findings.length} possível(is) segredo(s) encontrado(s).`,
    );
    console.error(`   Relatório: ${OUTPUT_FILE}`);
    process.exit(1);
  }

  console.log('✅ Nenhum segredo encontrado.');
}

main();
