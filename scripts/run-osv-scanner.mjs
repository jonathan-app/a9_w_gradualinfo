#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * @fileoverview Wrapper oficial reprodutível para execução do OSV-Scanner.
 * @module scripts/run-osv-scanner
 * @description Valida a versão canônica v1.9.2 e a integridade SHA-256 do binário antes de
 *   varrer `pnpm-lock.yaml`, e normaliza o resultado em `{ status, exitCode, reportPath }`.
 * @dependencies node:child_process, node:crypto, node:fs, node:path, node:process.
 *
 * Quando executado: via `pnpm run security:osv`, como etapa 2/5 do
 *   `pnpm run security:baseline` (local e CI) e pelos testes `tests/osv-scanner.test.mjs`.
 * Lê: binário do OSV-Scanner (`.cache/bin` ou PATH) e o lockfile do projeto.
 * Escreve: `security-reports/osv.json` (sobrescrito a cada execução).
 * Códigos de saída: 0 = sem vulnerabilidades; 1 = vulnerabilidades; >1 = erro de execução.
 */

export const OSV_VERSION = 'v1.9.2';
// Checksums oficiais por plataforma; plataforma fora desta lista é rejeitada antes do scan.
export const EXPECTED_CHECKSUMS = {
  linux_x64: 'd6af4b67fa5de658598bd2d445efb99e90d1734b3146962418719c4350ecb74b',
  darwin_arm64:
    '393f2c7089d9431bd26a3804d6e46d417b1c05abd5d49c41c7dfc174c520acf0',
  darwin_x64:
    '487ab433b2c2a8c80b737c0bd428a80e6d2e211b4adf775a52a6964163fa3249',
};

/**
 * Retorna o identificador de plataforma para busca de checksums.
 *
 * @param [platform] - `process.platform` (linux, darwin, ...).
 * @param [arch] - `process.arch` (x64, arm64, ...).
 * @returns Chave canônica, ou `null` se
 *   a combinação plataforma/arquitetura não tiver checksum publicado.
 */
export function getPlatformKey(
  platform = process.platform,
  arch = process.arch,
) {
  if (platform === 'linux' && arch === 'x64') return 'linux_x64';
  if (platform === 'darwin' && arch === 'arm64') return 'darwin_arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin_x64';
  return null;
}

/**
 * Calcula o hash SHA-256 de um arquivo local.
 *
 * @param filePath - Caminho absoluto ou relativo do arquivo.
 * @returns Hash hexadecimal de 64 caracteres.
 * @throws {Error} Se o arquivo não puder ser lido.
 */
export function calculateFileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Localiza o binário do osv-scanner no sistema ou no cache local do projeto.
 *
 * @param [cwd] - Diretório base para procurar `.cache/bin/osv-scanner`.
 * @returns Caminho do binário, ou `null` quando não instalado.
 */
export function resolveOsvBinary(cwd = process.cwd()) {
  const localCacheBin = path.join(cwd, '.cache', 'bin', 'osv-scanner');
  if (fs.existsSync(localCacheBin)) {
    return localCacheBin;
  }

  // Tenta encontrar via PATH
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const whichResult = spawnSync(whichCmd, ['osv-scanner'], {
    encoding: 'utf8',
  });
  if (whichResult.status === 0 && whichResult.stdout.trim()) {
    return whichResult.stdout.trim().split('\n')[0];
  }

  return null;
}

/**
 * Valida a versão e o checksum do binário do osv-scanner.
 *
 * É a trava de integridade do gate: binário adulterado, plataforma desconhecida ou versão
 * divergente da canônica interrompem a execução antes de qualquer scan.
 *
 * @param binaryPath - Caminho do binário a autenticar.
 * @returns Confirmação com hash
 *   e versão lidas do próprio executável.
 * @throws {Error} Binário ausente, plataforma sem checksum, checksum divergente ou
 *   versão diferente de 1.9.2.
 */
export function verifyOsvBinary(binaryPath) {
  if (!binaryPath || !fs.existsSync(binaryPath)) {
    throw new Error(`Binário do OSV-Scanner não encontrado em: ${binaryPath}`);
  }

  const platformKey = getPlatformKey();
  if (!platformKey || !EXPECTED_CHECKSUMS[platformKey]) {
    throw new Error(
      `Plataforma não suportada para verificação de checksum: ${process.platform}_${process.arch}`,
    );
  }

  const actualSha256 = calculateFileSha256(binaryPath);
  const expectedSha256 = EXPECTED_CHECKSUMS[platformKey];

  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Checksum inválido para ${binaryPath}.\nEsperado: ${expectedSha256}\nObtido:   ${actualSha256}`,
    );
  }

  const versionResult = spawnSync(binaryPath, ['--version'], {
    encoding: 'utf8',
  });
  if (versionResult.status !== 0) {
    throw new Error(
      `Falha ao executar ${binaryPath} --version: ${versionResult.stderr}`,
    );
  }

  const versionOutput = versionResult.stdout || versionResult.stderr;
  if (!versionOutput.includes('1.9.2')) {
    throw new Error(
      `Versão do OSV-Scanner divergente da canônica v1.9.2: ${versionOutput.trim()}`,
    );
  }

  return { verified: true, actualSha256, version: versionOutput.trim() };
}

/**
 * Executa o scan contra o pnpm-lock.yaml e grava o relatório.
 *
 * Efeitos colaterais: autentica o binário (pode lançar), cria o diretório de saída, apaga
 *   relatório anterior, escreve `outputFile` com `_meta: { commitSha, generatedAt }` e
 *   imprime progresso em stdout.
 *
 * @param [opções] - Parâmetros do scan.
 * @param [opções.cwd] - Diretório de execução (padrão: cwd atual).
 * @param [opções.binaryPath] - Binário a usar; resolve automaticamente se omitido.
 * @param [opções.lockfile] - Lockfile a varrer (relativo a `cwd` ou absoluto).
 * @param [opções.outputFile] - Caminho do relatório (relativo a `cwd` ou absoluto).
 * @returns
 *  Resultado normalizado; `exitCode` é o valor que o
 *   chamador deve propagar ao processo.
 * @throws {Error} Lockfile inexistente.
 */
export function runOsvScan({
  cwd = process.cwd(),
  binaryPath = resolveOsvBinary(cwd),
  lockfile = 'pnpm-lock.yaml',
  outputFile = 'security-reports/osv.json',
} = {}) {
  if (!binaryPath || !fs.existsSync(binaryPath)) {
    console.error(
      '[OSV-Scanner] ERRO: Binário do OSV-Scanner não instalado ou não encontrado.',
    );
    return { status: 'FAIL', error: 'Binary not found', exitCode: 1 };
  }

  try {
    verifyOsvBinary(binaryPath);
  } catch (err) {
    console.error(
      `[OSV-Scanner] ERRO na verificação do binário: ${err.message}`,
    );
    return { status: 'FAIL', error: err.message, exitCode: 1 };
  }

  const targetLockfile = path.isAbsolute(lockfile)
    ? lockfile
    : path.join(cwd, lockfile);
  if (!fs.existsSync(targetLockfile)) {
    throw new Error(`Arquivo de lockfile não encontrado: ${targetLockfile}`);
  }

  const targetOutputDir = path.isAbsolute(outputFile)
    ? path.dirname(outputFile)
    : path.join(cwd, path.dirname(outputFile));

  if (!fs.existsSync(targetOutputDir)) {
    fs.mkdirSync(targetOutputDir, { recursive: true });
  }

  const targetOutputPath = path.isAbsolute(outputFile)
    ? outputFile
    : path.join(cwd, outputFile);

  if (fs.existsSync(targetOutputPath)) {
    fs.rmSync(targetOutputPath);
  }

  const commitSha =
    spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
    }).stdout.trim() || 'unknown';

  console.log(`[OSV-Scanner] Executando scan canônico contra ${lockfile}...`);
  const result = spawnSync(
    binaryPath,
    [
      `--lockfile=${targetLockfile}`,
      '--format=json',
      `--output=${targetOutputPath}`,
    ],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let reportValid = false;
  if (fs.existsSync(targetOutputPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(targetOutputPath, 'utf8'));
      if (report && typeof report === 'object') {
        // O OSV-Scanner emite resultados e erros em chaves distintas do mesmo objeto;
        // qualquer JSON que seja objeto (inclusive array) passa, e `null`/primitivos
        // caem fora e deixam reportValid = false (relatório reprovado, não silenciado).
        reportValid = true;
        report._meta = { commitSha, generatedAt: new Date().toISOString() };
        fs.writeFileSync(targetOutputPath, JSON.stringify(report, null, 2));
      }
    } catch {
      // Ignora falha de parse
    }
  }

  // Status code do osv-scanner:
  // 0: Nenhuma vulnerabilidade encontrada
  // 1: Vulnerabilidades encontradas (bloqueante)
  // >1: Erro de execução/argumentos/rede
  if (result.status === 0 && reportValid) {
    console.log('[OSV-Scanner] PASS: Nenhuma vulnerabilidade detectada.');
    return {
      status: 'PASS',
      exitCode: 0,
      reportPath: targetOutputPath,
      commitSha,
    };
  } else if (result.status === 1) {
    console.error(
      '[OSV-Scanner] FAIL: Vulnerabilidades detectadas no lockfile! Verifique o relatório.',
    );
    return { status: 'FAIL', exitCode: 1, reportPath: targetOutputPath };
  } else {
    console.error(
      `[OSV-Scanner] ERROR: Falha de execução ou relatório inválido (exit code ${result.status}).`,
    );
    return { status: 'ERROR', exitCode: result.status || 1 };
  }
}

// Execução direta via CLI
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  try {
    const binary = resolveOsvBinary();
    if (!binary) {
      console.error(
        '[OSV-Scanner] Binário não encontrado. Instale com: node scripts/install-osv-scanner.mjs',
      );
      process.exit(1);
    }
    const outcome = runOsvScan({ binaryPath: binary });
    process.exit(outcome.exitCode);
  } catch (err) {
    console.error(`[OSV-Scanner] ERRO FATAL: ${err.message}`);
    process.exit(1);
  }
}
