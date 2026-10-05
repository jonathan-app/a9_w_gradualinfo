#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * @fileoverview Preflight de handoff de cliente: bloqueia entrega com identidade de template.
 * @module scripts/client-preflight
 * @description Cruza presença de arquivos obrigatórios, identidade do `package.json`,
 *   URL canônica produtiva, resíduos de boilerplate em arquivos visíveis ao cliente,
 *   dimensões reais dos ícones PNG e higiene do índice Git.
 * @dependencies node:child_process (`git ls-files`), node:fs, node:url, node:path.
 *
 * Quando executado: via `pnpm client:preflight` e como última etapa de `pnpm validate:client`.
 *   Não roda em CI nem em hook do Git.
 * Lê: arquivos de identidade/deliverability listados abaixo, `.env.example`, ícones PNG e o
 *   índice do Git.
 * Escreve: nada — apenas relatório em stdout e `{ passed, checks, errors }`.
 * Códigos de saída: 0 = todas as checagens passaram; 1 = ao menos uma falhou.
 */

// Arquivos que precisam existir para o handoff ser considerado completo (identidade,
// metadata social, ícones e a documentação de entrega).
export const REQUIRED_CLIENT_FILES = [
  '.env.example',
  'src/config/site.ts',
  'src/app/opengraph-image.tsx',
  'src/app/twitter-image.tsx',
  'src/app/icon.svg',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/apple-touch-icon.png',
  'docs/delivery/client-handoff.md',
  'docs/delivery/go-live-checklist.md',
];

// Arquivos lidos em busca de identidade/placeholder do template — são os que o cliente
// efetivamente vê no primeiro contato com o repositório.
const CUSTOMER_FACING_FILES = [
  'package.json',
  'README.md',
  '.env.example',
  'src/config/site.ts',
];

// Padrões que NÃO podem estar rastreados no Git: `.env` (exceto `.example`), dependências,
// builds, cobertura, relatórios e caches. Derivam de `path`, por isso o ancoramento `^`.
const FORBIDDEN_TRACKED_PATTERNS = [
  /^\.env(?!\.example$)(?:\.|$)/,
  /^node_modules\//,
  /^\.next\//,
  /^coverage\//,
  /^test-results\//,
  /^playwright-report\//,
  /^security-reports\//,
  /^dist\//,
  /\.tsbuildinfo$/,
];

/**
 * Lê um arquivo UTF-8 relativo à raiz do projeto.
 *
 * @param cwd - Raiz do projeto.
 * @param relativePath - Caminho relativo.
 * @returns Conteúdo do arquivo.
 */
function readText(cwd, relativePath) {
  return fs.readFileSync(path.join(cwd, relativePath), 'utf8');
}

/**
 * Lê largura e altura direto do cabeçalho IHDR de um PNG.
 *
 * @param filePath - Caminho do arquivo PNG.
 * @returns Dimensões em pixels.
 * @throws {Error} Arquivo menor que 24 bytes ou assinatura PNG inválida.
 */
export function readPngDimensions(filePath) {
  const content = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // Mínimo de 24 bytes: 8 de assinatura + 4 de tamanho + 4 de tipo + 4 de largura + 4 de altura.
  if (content.length < 24 || !content.subarray(0, 8).equals(signature)) {
    throw new Error('assinatura PNG inválida');
  }
  // IHDR é sempre o primeiro chunk: largura em BE nos offsets 16–19, altura em 20–23.
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

/**
 * Lista os arquivos rastreados no Git (índice), ignorando untracked.
 *
 * @param cwd - Diretório do repositório.
 * @returns Caminhos rastreados; lista vazia se o Git falhar (ex.: sem `.git`).
 */
function listTrackedFiles(cwd) {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) return [];
  return result.stdout.split('\0').filter(Boolean);
}

/**
 * Executa todas as checagens de preflight e acumula falhas.
 *
 * Regras de negócio embutidas:
 *   - `NEXT_PUBLIC_APP_URL` precisa ser `https://`, host não-local e sem `example.`;
 *   - identidade de template (`gradualinfo`, "Gradualinfo", `TODO`/`CHANGEME`,
 *     `app.example.com`) reprova qualquer arquivo visível ao cliente;
 *   - ícones precisam ter exatamente as dimensões declaradas (192/512/180);
 *   - nenhum padrão de `FORBIDDEN_TRACKED_PATTERNS` pode estar no índice do Git.
 *
 * Efeitos colaterais: nenhum — apenas leitura de disco e do Git.
 *
 * @param [opções] - Opções de execução.
 * @param [opções.cwd] - Raiz do projeto (padrão: cwd atual).
 * @returns
 *  `passed` é `true` somente quando `errors` está vazio.
 */
export function runClientPreflight({ cwd = process.cwd() } = {}) {
  const errors = [];
  const checks = [];
  // Registrador único: toda checagem entra no relatório e, quando inválida, alimenta
  // `errors` — é `errors` que define o exit code, não `checks`.
  const addCheck = (name, valid, detail) => {
    checks.push({ name, valid, detail });
    if (!valid) errors.push(`${name}: ${detail}`);
  };

  for (const relativePath of REQUIRED_CLIENT_FILES) {
    addCheck(
      `arquivo:${relativePath}`,
      fs.existsSync(path.join(cwd, relativePath)),
      fs.existsSync(path.join(cwd, relativePath)) ? 'presente' : 'ausente',
    );
  }

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      // Identidade do template: nome ainda `gradualinfo` ou descrição falando de
      // boilerplate indica que o projeto não foi parametrizado.
      addCheck(
        'identidade:package',
        pkg.name !== 'gradualinfo' &&
          !/boilerplate/i.test(pkg.description ?? ''),
        pkg.name !== 'gradualinfo' &&
          !/boilerplate/i.test(pkg.description ?? '')
          ? 'package.json personalizado'
          : 'package.json ainda contém identidade do template',
      );
    } catch (error) {
      addCheck(
        'identidade:package',
        false,
        `package.json inválido: ${error.message}`,
      );
    }
  }

  const envPath = path.join(cwd, '.env.example');
  if (fs.existsSync(envPath)) {
    const match = readText(cwd, '.env.example').match(
      /^NEXT_PUBLIC_APP_URL=(.+)$/m,
    );
    let validUrl = false;
    let detail = 'NEXT_PUBLIC_APP_URL ausente';
    if (match) {
      try {
        const url = new URL(match[1].trim());
        // URL só é produtiva se for https, não for localhost/loopback e não usar o
        // domínio reservado `*.example.*` (edge case: `example.com.br` também cai aqui).
        validUrl =
          url.protocol === 'https:' &&
          !['localhost', '127.0.0.1'].includes(url.hostname) &&
          !url.hostname.includes('example.');
        detail = validUrl ? url.origin : `URL não produtiva: ${url.toString()}`;
      } catch {
        detail = 'NEXT_PUBLIC_APP_URL não é uma URL válida';
      }
    }
    addCheck('ambiente:url-canonica', validUrl, detail);
  }

  for (const relativePath of CUSTOMER_FACING_FILES) {
    const filePath = path.join(cwd, relativePath);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const containsTemplateIdentity = /Gradualinfo|gradualinfo/i.test(content);
    // Placeholders: TODO/CHANGEME isolados como palavra (antes/depois de espaço ou tag)
    // ou o domínio sintético app.example.com.
    const containsPlaceholder =
      /(?:\s|^|>)(?:TODO|CHANGEME)(?:\s|<|$)|app\.example\.com/i.test(content);
    addCheck(
      `conteudo:${relativePath}`,
      !containsTemplateIdentity && !containsPlaceholder,
      containsTemplateIdentity || containsPlaceholder
        ? 'identidade genérica ou placeholder encontrado'
        : 'personalizado',
    );
  }

  // Dimensões declaradas por contrato: checadas no cabeçalho do PNG, não no nome do
  // arquivo — um arquivo renomeado para 512px sem ser é pego aqui.
  const iconExpectations = [
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['public/apple-touch-icon.png', 180],
  ];
  for (const [relativePath, expectedSize] of iconExpectations) {
    const filePath = path.join(cwd, relativePath);
    if (!fs.existsSync(filePath)) continue;
    try {
      const dimensions = readPngDimensions(filePath);
      addCheck(
        `asset:${relativePath}`,
        dimensions.width === expectedSize && dimensions.height === expectedSize,
        `${dimensions.width}x${dimensions.height}; esperado ${expectedSize}x${expectedSize}`,
      );
    } catch (error) {
      addCheck(`asset:${relativePath}`, false, error.message);
    }
  }

  const trackedFiles = listTrackedFiles(cwd);
  const forbiddenTracked = trackedFiles.filter((file) =>
    FORBIDDEN_TRACKED_PATTERNS.some((pattern) => pattern.test(file)),
  );
  // Higiene Git: um único artefato rastreado (segredo, build ou relatório) reprova o
  // preflight inteiro, porque o ZIP/clone entregue ao cliente o levaria junto.
  addCheck(
    'higiene:git',
    forbiddenTracked.length === 0,
    forbiddenTracked.length === 0
      ? 'nenhum segredo ou artefato rastreado'
      : `arquivos proibidos rastreados: ${forbiddenTracked.join(', ')}`,
  );

  return { passed: errors.length === 0, checks, errors };
}

/**
 * Emite o relatório legível do preflight (uma linha por checagem).
 *
 * @param result - Resultado de `runClientPreflight`.
 * @param [stream] - Fluxo de saída (injetável nos testes).
 * @returns Apenas escreve no stream.
 */
export function printClientPreflight(result, stream = process.stdout) {
  stream.write('=== Gradualinfo Client Preflight ===\n');
  for (const check of result.checks) {
    stream.write(
      `${check.valid ? 'PASS' : 'FAIL'} ${check.name} — ${check.detail}\n`,
    );
  }
  stream.write(`\nResultado: ${result.passed ? 'PASS' : 'FAIL'}\n`);
}

// Guarda de execução direta: roda como CLI somente quando este arquivo é o entrypoint;
// nos demais casos o módulo é importado pelos testes.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runClientPreflight();
  printClientPreflight(result);
  process.exit(result.passed ? 0 : 1);
}
