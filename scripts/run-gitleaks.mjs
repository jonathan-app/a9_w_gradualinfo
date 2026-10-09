#!/usr/bin/env node

/**
 * scripts/run-gitleaks.mjs — procura segredo no histórico e na árvore de trabalho
 * @fileoverview Procura segredos no histórico e na árvore de trabalho.
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
import { fileURLToPath } from 'node:url';

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

/**
 * Localiza o binário do gitleaks sem executá-lo.
 *
 * @param [cwd] - Base para procurar `.cache/bin/gitleaks`.
 * @returns {string} Caminho do binário — o cache do projeto tem prioridade sobre o PATH — ou
 *   `null` quando não há nenhum. Quem decide o que fazer com `null` é o chamador.
 */
export function resolveGitleaksBinary(cwd = process.cwd()) {
  const local = cacheBin(cwd);
  if (fs.existsSync(local)) return local;

  const which = spawnSync('which', ['gitleaks'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();

  return null;
}

/**
 * Garante um gitleaks disponível com a versão pinada.
 *
 * @param [cwd] - Base para o cache `.cache/bin/`.
 * @returns {Promise<string>} Caminho do binário autenticado, pronto para `spawnSync`.
 * @throws {Error} Versão divergente da pinada, plataforma sem checksum publicado, download
 *   com HTTP ≠ 200 ou SHA-256 que não confere com o pinado.
 */
export async function ensureGitleaksBinary(cwd = process.cwd()) {
  const found = resolveGitleaksBinary(cwd);
  if (found) {
    // Binário existente ainda precisa ser a versão pinada: gitleaks antigo na máquina do dev
    // reprova aqui em vez de gerar relatório incomparável com o da CI.
    const version = spawnSync(found, ['version'], { encoding: 'utf8' });
    if (version.error) throw version.error;
    if (version.status !== 0 || version.stdout.trim() !== GITLEAKS_VERSION)
      throw new Error(
        `Exige gitleaks ${GITLEAKS_VERSION}, binário instalado diverge.`,
      );
    return found;
  }

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

/**
 * Lista os arquivos que o git aceitaria no próximo commit.
 *
 * Por que existe
 * O `gitleaks dir` varre o diretório cru e não lê `.gitignore`: ele acendia
 * para `.env.local` e afins — arquivos que o git descarta e que nunca vão
 * para o repositório. A inversão aqui é proposital: quem decide o escopo do
 * scan de árvore é o `.gitignore`, não uma allowlist no `.gitleaks.toml`,
 * porque allowlistar `.env*` lá também silenciaria o scan de histórico — e o
 * histórico é exatamente onde o vazamento já aconteceu.
 *
 * `ls-files -co --exclude-standard` cobre o par que importa: `-c` (rastreado
 * ou staged — inclusive forçado com `add -f`, que continua no índice) e `-o`
 * não-ignorado (candidato a próximo commit). O que está em ambos os lados
 * some da conta; o que só existe ignorado no disco fica de fora.
 *
 * O delimitador é NUL (`-z`), não newline: com `core.quotepath` ligado, o
 * git embrulha nomes não-ASCII entre aspas com escapes C (`"\303\251…"`) e
 * um nome com newline literal partiria a linha no meio — nos dois casos o
 * caminho resultante não existe no disco, o gitleaks ignora o arquivo em
 * silêncio e um segredo vivo sairia do escopo do scan de árvore.
 *
 * @returns {Set<string>} Caminhos relativos (sem `./`) dos arquivos elegíveis.
 * @throws {Error} Quando o git falha — escopo incerto não pode virar scan verde.
 */
function gitVisibleFiles() {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '-co', '--exclude-standard'],
    {
      encoding: 'utf8',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error('git ls-files falhou; escopo do scan indeterminado.');
  return new Set(result.stdout.split('\0').filter(Boolean));
}

/**
 * Executa os dois scans do gitleaks e devolve os findings consolidados.
 *
 * @returns {Promise<Array>} Lista de findings (pode estar vazia). Lança em qualquer anomalia
 *   operacional — exit code inesperado, relatório ausente/inválido, falha sem findings —
 *   porque "scanner quebrado" não pode se disfarçar de "nada encontrado".
 */
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
      // Só este scan recebe o filtro de escopo: o de histórico precisa ver
      // tudo que já entrou no git, inclusive o que foi apagado depois.
      scopeToGit: true,
      args: [
        'dir',
        '.',
        '--redact',
        '--report-format',
        'json',
        '--report-path',
        OUTPUT_FILE,
      ],
    },
  ];

  const findings = [];

  for (const run of runs) {
    const result = spawnSync(binary, run.args, { stdio: 'pipe' });

    if (result.error) {
      throw new Error(`erro ao executar gitleaks: ${result.error.message}`);
    }

    if (![0, 1].includes(result.status))
      throw new Error('Falha operacional do gitleaks.');
    if (!fs.existsSync(OUTPUT_FILE))
      throw new Error('Relatório gitleaks ausente.');
    const current = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    if (!Array.isArray(current))
      throw new Error('Relatório gitleaks inválido.');
    if (result.status === 1 && current.length === 0)
      throw new Error('Gitleaks retornou falha sem findings.');
    if (run.scopeToGit) {
      const visible = gitVisibleFiles();
      findings.push(...current.filter((finding) => visible.has(finding.File)));
    } else {
      findings.push(...current);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(findings, null, 2));
  return findings;
}

async function main() {
  const findings = await runGitleaksScan();
  console.log(
    `Gitleaks: ${findings.length} findings redigidos, histórico e árvore.`,
  );
  process.exitCode = findings.length ? 1 : 0;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
