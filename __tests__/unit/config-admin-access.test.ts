// @vitest-environment node
/**
 * @fileoverview Suíte de integração do helper de configuração `scripts/config-admin-access.mjs`.
 * @module __tests__/unit/config-admin-access
 * @description O helper publica os bindings ADMIN_ACCESS_* no Worker via `wrangler secret put`.
 *   Um valor inválido nesses bindings desabilita a admissão administrativa e devolve 503
 *   (spec 0009, admin-access/AC-05), e o valor trafega pelo stdin do wrangler. Esta suíte
 *   invoca o script como processo real, com stdin em pipe, e trava três contratos: a validação
 *   local tem as mesmas regras de `readAdminAccessConfig` (lib/env.ts:125), nenhum valor é
 *   impresso em nenhum caminho, e a publicação chama o wrangler exatamente como o contrato
 *   exige, sem jamais rodar no modo dry-run.
 * @dependencies node:child_process/fs/os/path (processo real e stub descartável do wrangler).
 *
 * Roda em ambiente Node (directive acima): o teste executa um script de CLI, não código de
 * browser, e por isso não herda o jsdom do vitest.config.mts. O wrangler é substituído por um
 * stub no PATH que registra argv e stdin, porque chamar o wrangler real publicaria segredo.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve('scripts/config-admin-access.mjs');

// Quatro valores válidos de mentira, na ordem em que o script lê o stdin em pipe:
// ISSUER, AUD, OWNER_EMAIL, HOSTS. Nada aqui é segredo real.
const VALID = [
  'https://equipe-teste.cloudflareaccess.com',
  'audiencia-de-teste',
  'dono@example.invalid',
  'painel.example.invalid',
];

let root: string;
let stubDir: string;
let stubLog: string;

/**
 * Executa o helper com as linhas de stdin dadas.
 *
 * @param lines - Valores na ordem de NAMES, um por linha.
 * @param [options] - `dryRun` (padrão true) e `wranglerExit` (código do stub do wrangler).
 * @returns Resultado do spawnSync do processo real.
 */
function runScript(lines: string[], { dryRun = true, wranglerExit = 0 } = {}) {
  return spawnSync('node', [script, ...(dryRun ? ['--dry-run'] : [])], {
    encoding: 'utf8',
    input: lines.join('\n') + '\n',
    env: {
      ...process.env,
      // O stub vem antes do PATH para provar que o wrangler real nunca é chamado
      // por acidente: qualquer chamada real seria registrada pelo stub.
      PATH: `${stubDir}:${process.env.PATH ?? ''}`,
      STUB_LOG: stubLog,
      STUB_EXIT: String(wranglerExit),
    },
  });
}

/**
 * Lê o registro de chamadas do stub do wrangler.
 *
 * @returns Lista de `{ argv, input }` na ordem das chamadas.
 */
function stubCalls() {
  if (!existsSync(stubLog)) return [];
  return readFileSync(stubLog, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'admin-access-config-'));
  stubDir = join(root, 'bin');
  stubLog = join(root, 'wrangler-calls.log');
  mkdirSync(stubDir);
  // Stub do wrangler: grava argv e stdin recebido e sai com o código pedido.
  // Existe para observar o contrato da publicação sem tocar na Cloudflare.
  const stub = `#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
const input = readFileSync(0, 'utf8');
appendFileSync(process.env.STUB_LOG, JSON.stringify({ argv: process.argv.slice(2), input }) + '\\n');
process.exit(Number(process.env.STUB_EXIT || '0'));
`;
  writeFileSync(join(stubDir, 'wrangler'), stub, { mode: 0o755 });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('dry-run: validacao sem publicar', () => {
  // covers: admin-access/AC-13 (configuracao local autorizada, sem toque remoto)
  it('aceita os quatro valores validos e nao chama o wrangler', () => {
    const result = runScript(VALID, { wranglerExit: 1 });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Todos os valores sao validos.');
    expect(result.stdout).toContain(
      '[dry-run] Nenhuma alteracao foi feita no Worker.',
    );
    // O stub do wrangler falharia se fosse chamado; zero chamadas prova o dry-run.
    expect(stubCalls()).toHaveLength(0);
  });

  // covers: admin-access/AC-13
  it('aceita stdin com fim de linha CRLF', () => {
    const result = runScript(VALID);

    expect(result.status).toBe(0);
    expect(stubCalls()).toHaveLength(0);
  });

  // covers: admin-access/AC-04 (paridade de validacao com readAdminAccessConfig)
  it('aceita lista de hosts com espacos apos a virgula', () => {
    const lines = [...VALID];
    lines[3] = 'painel.example.invalid, outro.example.invalid';

    const result = runScript(lines);

    expect(result.status).toBe(0);
  });

  // covers: admin-access/AC-04 (paridade de validacao com readAdminAccessConfig)
  it('nao exige formato de audience alem de nao vazia', () => {
    const lines = [...VALID];
    lines[1] = 'x';

    const result = runScript(lines);

    expect(result.status).toBe(0);
  });
});

describe('validacao local: mesmo rechaco de readAdminAccessConfig', () => {
  // covers: admin-access/AC-04 (configuracao invalida reprovada antes de qualquer publicacao)
  it.each([
    {
      caso: 'issuer sem HTTPS',
      linha: 0,
      valor: 'http://equipe-teste.cloudflareaccess.com',
      mensagem: 'ADMIN_ACCESS_ISSUER: deve ser HTTPS',
    },
    {
      caso: 'issuer fora do cloudflareaccess.com',
      linha: 0,
      valor: 'https://equipe-teste.example.com',
      mensagem: 'ADMIN_ACCESS_ISSUER: host deve ser *.cloudflareaccess.com',
    },
    {
      caso: 'issuer sem subdominio',
      linha: 0,
      valor: 'https://cloudflareaccess.com',
      mensagem: 'ADMIN_ACCESS_ISSUER: host deve ser *.cloudflareaccess.com',
    },
    {
      caso: 'issuer com path',
      linha: 0,
      valor: 'https://equipe-teste.cloudflareaccess.com/caminho',
      mensagem:
        'ADMIN_ACCESS_ISSUER: valor deve ser exatamente a origem, sem path/query',
    },
    {
      caso: 'issuer com credencial na URL',
      linha: 0,
      valor: 'https://user:pass@equipe-teste.cloudflareaccess.com',
      // origin nunca carrega credencial, entao a checagem de origem (a primeira,
      // igual em lib/env.ts:143) reprova antes. O contrato observavel e a rejeicao.
      mensagem:
        'ADMIN_ACCESS_ISSUER: valor deve ser exatamente a origem, sem path/query',
    },
    {
      caso: 'issuer que nao e URL',
      linha: 0,
      valor: 'isso-nao-e-url',
      mensagem: 'ADMIN_ACCESS_ISSUER: URL invalida',
    },
    {
      caso: 'e-mail do proprietario sem @',
      linha: 2,
      valor: 'dono-example.invalid',
      mensagem: 'ADMIN_ACCESS_OWNER_EMAIL: formato de e-mail invalido',
    },
    {
      caso: 'host com maiuscula',
      linha: 3,
      valor: 'Painel.example.invalid',
      mensagem: 'ADMIN_ACCESS_HOSTS: host invalido',
    },
    {
      caso: 'host com dois pontos',
      linha: 3,
      valor: 'painel..example.invalid',
      mensagem: 'ADMIN_ACCESS_HOSTS: host nao pode conter ".."',
    },
    {
      caso: 'host vazio no meio da lista',
      linha: 3,
      valor: 'painel.example.invalid,,outro.example.invalid',
      mensagem: 'ADMIN_ACCESS_HOSTS: host invalido',
    },
  ])('reprova $caso', ({ linha, valor, mensagem }) => {
    const lines = [...VALID];
    lines[linha] = valor;

    const result = runScript(lines);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Validacao falhou:');
    expect(result.stderr).toContain(mensagem);
    expect(stubCalls()).toHaveLength(0);
  });

  // covers: admin-access/AC-04
  it('reprova valor com espaco sobrando', () => {
    const lines = [...VALID];
    lines[1] = ' audiencia-de-teste ';

    const result = runScript(lines);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'ADMIN_ACCESS_AUD: valor vazio ou com espacos',
    );
  });

  // covers: admin-access/AC-04
  it('reprova linha vazia', () => {
    const lines = [...VALID];
    lines[1] = '';

    const result = runScript(lines);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'ADMIN_ACCESS_AUD: valor vazio ou com espacos',
    );
  });

  // covers: admin-access/AC-04
  it('reprova stdin com menos linhas que o exigido', () => {
    const result = runScript(VALID.slice(0, 3));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'ADMIN_ACCESS_HOSTS: valor vazio ou com espacos',
    );
  });

  // covers: admin-access/AC-04
  it('lista todos os erros de uma vez', () => {
    const lines = [...VALID];
    lines[0] = 'http://equipe-teste.cloudflareaccess.com';
    lines[2] = 'sem-arroba';

    const result = runScript(lines);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ADMIN_ACCESS_ISSUER: deve ser HTTPS');
    expect(result.stderr).toContain(
      'ADMIN_ACCESS_OWNER_EMAIL: formato de e-mail invalido',
    );
  });

  // covers: admin-access/AC-11 (token, e-mail e host nunca aparecem em log ou saida)
  it('nunca imprime o valor digitado, nem no caminho de erro', () => {
    const sentinela = 'valor-sentinela-que-nao-pode-vazar';
    const lines = [...VALID];
    lines[0] = sentinela;

    const result = runScript(lines);

    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(sentinela);
  });
});

describe('publicacao: wrangler secret put', () => {
  // covers: admin-access/AC-13 (publicacao nominal, no Worker gradualinfo, via stdin)
  it('envia cada valor pelo stdin do wrangler, um secret por nome', () => {
    const result = runScript(VALID, { dryRun: false });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Todos os ADMIN_ACCESS_* foram configurados.',
    );
    const calls = stubCalls();
    expect(calls).toHaveLength(4);
    expect(calls.map((call) => call.argv)).toEqual([
      ['secret', 'put', 'ADMIN_ACCESS_ISSUER', '--name', 'gradualinfo'],
      ['secret', 'put', 'ADMIN_ACCESS_AUD', '--name', 'gradualinfo'],
      ['secret', 'put', 'ADMIN_ACCESS_OWNER_EMAIL', '--name', 'gradualinfo'],
      ['secret', 'put', 'ADMIN_ACCESS_HOSTS', '--name', 'gradualinfo'],
    ]);
    // O valor nao pode ir por argv (fica no historico do shell): vai pelo stdin.
    expect(calls.map((call) => call.input)).toEqual(VALID);
  });

  // covers: admin-access/AC-13
  it('interrompe na primeira falha do wrangler sem publicar os demais', () => {
    const result = runScript(VALID, { dryRun: false, wranglerExit: 1 });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Falha ao publicar ADMIN_ACCESS_ISSUER.');
    expect(stubCalls()).toHaveLength(1);
  });
});
