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
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Versão pinada do scanner: mesma verificação em qualquer máquina ou CI,
// revisada em diff, e sem exigir que o dev tenha gitleaks instalado.
const GITLEAKS_VERSION = '8.28.0';
const GITLEAKS_SHA256 = {
  'linux-x64':
    'a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb',
  'linux-arm64':
    'eff65261156100e5d94a6b3dec313d532fddfe19ae1590bf7a2b4f2699128356',
  'darwin-x64':
    'edf5a507008b0d2ef4959575772772770586409c1f6f74dabf19cbe7ec341ced',
  'darwin-arm64':
    'd942f3ad147250c9edbaab3fed9e482f98d3b59ba10ae97b8d75647e3ade492c',
};

function cacheBin(cwd) {
  return path.join(cwd, '.cache', 'bin', 'gitleaks');
}

/** Retorna o caminho do gitleaks (cache do projeto ou PATH) para reuso. */
export function resolveGitleaksBinary(cwd = process.cwd()) {
  const local = cacheBin(cwd);
  if (fs.existsSync(local)) return local;

  const which = spawnSync('which', ['gitleaks'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();

  return null;
}

/** Baixa o gitleaks pinado para `.cache/bin/` quando ausente do PATH/cache. */
export async function ensureGitleaksBinary(cwd = process.cwd()) {
  const found = resolveGitleaksBinary(cwd);
  if (found) return found;

  const key = `${process.platform}-${process.arch}`;
  const sha = GITLEAKS_SHA256[key];
  if (!sha) {
    throw new Error(`gitleaks pinado indisponível para ${key}.`);
  }

  const asset = key.replace('-', '_'); // linux-x64 → linux_x64 etc.
  const url =
    `https://github.com/gitleaks/gitleaks/releases/download/` +
    `v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${asset}.tar.gz`;
  const tmp = path.join(cwd, '.cache', 'gitleaks.tar.gz');

  fs.mkdirSync(path.dirname(cacheBin(cwd)), { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`);
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));

  const hex = createHash('sha256').update(fs.readFileSync(tmp)).digest('hex');
  if (hex !== sha) {
    fs.rmSync(tmp, { force: true });
    throw new Error('SHA-256 do binário não confere com o pinado.');
  }

  const tar = spawnSync(
    'tar',
    ['-xzf', tmp, '-C', path.dirname(cacheBin(cwd)), 'gitleaks'],
    { stdio: 'inherit' },
  );
  if (tar.status !== 0) throw new Error('falha ao extrair o gitleaks.');
  fs.chmodSync(cacheBin(cwd), 0o755);
  fs.rmSync(tmp, { force: true });

  return cacheBin(cwd);
}

const OUTPUT_DIR = 'security-reports';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'gitleaks.json');

/** Executa o scan do Gitleaks e retorna os findings (para reuso em baseline). */
export async function runGitleaksScan() {
  const binary = await ensureGitleaksBinary();

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

async function main() {
  // O wrapper baixa e verifica um binário pinado quando preciso — a CI
  // (e um clone fresco) não precisam de instalação manual.
  const binary = await ensureGitleaksBinary();

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

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
