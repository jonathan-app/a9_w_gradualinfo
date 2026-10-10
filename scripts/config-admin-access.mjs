/**
 * @fileoverview Helper de configuracao segura dos bindings ADMIN_ACCESS_*.
 * @module scripts/config-admin-access
 * @description Valida valores antes de publicar no Worker, sem expor segredos.
 * @dependencies node:child_process, node:process, node:fs
 *
 * Por que este script existe
 * - Os ADMIN_ACCESS_* sao lidos diretto dos bindings do Worker (env.ts:125),
 *   nao de variaveis de ambiente do Next. Publicar um valor invalido
 *   desabilita o acesso administrativo e devolve 503.
 * - O `wrangler secret put` exige que o valor seja digitado no terminal; este
 *   script coleta em silencio, valida localmente e so então chama o wrangler.
 *
 * Modo --dry-run
 * - Valida sem chamar o wrangler. Util para CI e para confirmar valores antes
 *   de tocar na producao.
 *
 * Regras de seguranca
 * - Valores nunca sao impressos, nem em caso de erro.
 * - Historico do shell e arquivos locais nao recebem os valores.
 */

import { spawnSync } from 'node:child_process';
import { stdin, stdout } from 'node:process';
import { readFileSync } from 'node:fs';

const NAMES = [
  'ADMIN_ACCESS_ISSUER',
  'ADMIN_ACCESS_AUD',
  'ADMIN_ACCESS_OWNER_EMAIL',
  'ADMIN_ACCESS_HOSTS',
];

const HOST_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

/**
 * Valida um valor contra as mesmas regras de readAdminAccessConfig (env.ts:125).
 * @param value - Valor digitado.
 * @param name - Nome da variavel.
 * @returns Mensagem de erro ou null quando o valor e valido.
 */
function validate(value, name) {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    return `${name}: valor vazio ou com espacos`;
  }
  if (name === 'ADMIN_ACCESS_ISSUER') {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:')
        return 'ADMIN_ACCESS_ISSUER: deve ser HTTPS';
      if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(url.hostname))
        return 'ADMIN_ACCESS_ISSUER: host deve ser *.cloudflareaccess.com';
      if (url.origin !== value)
        return 'ADMIN_ACCESS_ISSUER: valor deve ser exatamente a origem, sem path/query';
      if (url.username || url.password)
        return 'ADMIN_ACCESS_ISSUER: nao pode conter credenciais na URL';
    } catch {
      return 'ADMIN_ACCESS_ISSUER: URL invalida';
    }
  }
  if (name === 'ADMIN_ACCESS_OWNER_EMAIL') {
    if (!/^[^\s@]+@[^\s@]+$/.test(value))
      return 'ADMIN_ACCESS_OWNER_EMAIL: formato de e-mail invalido';
  }
  if (name === 'ADMIN_ACCESS_HOSTS') {
    const hosts = value.split(',').map((h) => h.trim());
    if (!hosts.length)
      return 'ADMIN_ACCESS_HOSTS: ao menos um host e obrigatorio';
    for (const host of hosts) {
      if (!HOST_RE.test(host))
        return `ADMIN_ACCESS_HOSTS: host invalido "${host}"`;
      if (host.includes('..'))
        return `ADMIN_ACCESS_HOSTS: host nao pode conter ".." "${host}"`;
    }
  }
  return null;
}

/**
 * Coleta valores do usuario.
 * Em pipe (sem TTY), lê o stdin inteiro e divide por linhas.
 * Em TTY, ativa raw mode no stdin para ler byte a byte sem eco, exibindo
 * cada prompt conforme o usuario avanca.
 * @returns Mapa nome -> valor.
 */
function readValues() {
  if (!stdin.isTTY) {
    const input = readFileSync(0, 'utf-8').split('\n');
    const values = {};
    for (let i = 0; i < NAMES.length; i++) {
      values[NAMES[i]] = (input[i] ?? '').replace(/\r$/, '');
    }
    return values;
  }

  // TTY: raw mode desliga o eco do terminal.
  const wasRaw = stdin.getRawMode();
  stdin.setRawMode(true);

  const values = {};
  let currentIndex = 0;
  let buffer = '';

  return new Promise((resolve) => {
    // Exibe o primeiro prompt.
    stdout.write(`${NAMES[0]}: `);

    const onByte = (byte) => {
      if (byte === 0x0d || byte === 0x0a) {
        // Enter: finaliza o campo atual.
        values[NAMES[currentIndex]] = buffer;
        buffer = '';
        currentIndex++;
        stdout.write('\n');
        if (currentIndex >= NAMES.length) {
          stdin.removeListener('data', onByte);
          stdin.setRawMode(wasRaw);
          resolve(values);
          return;
        }
        // Exibe o proximo prompt.
        stdout.write(`${NAMES[currentIndex]}: `);
      } else if (byte === 0x7f) {
        // Backspace.
        buffer = buffer.slice(0, -1);
      } else if (byte >= 0x20 && byte < 0x7f) {
        buffer += String.fromCharCode(byte);
      }
    };

    stdin.on('data', onByte);
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const values = await readValues();

  const errors = [];
  for (const name of NAMES) {
    const err = validate(values[name], name);
    if (err) errors.push(err);
  }

  if (errors.length) {
    console.error('Validacao falhou:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log('Todos os valores sao validos.');

  if (dryRun) {
    console.log('[dry-run] Nenhuma alteracao foi feita no Worker.');
    return;
  }

  console.log('Publicando secrets via wrangler...');
  for (const name of NAMES) {
    const result = spawnSync(
      'wrangler',
      ['secret', 'put', name, '--name', 'gradualinfo'],
      { input: values[name], stdio: ['pipe', 'inherit', 'inherit'] },
    );
    if (result.status !== 0) {
      console.error(`Falha ao publicar ${name}.`);
      process.exit(1);
    }
  }

  console.log('Todos os ADMIN_ACCESS_* foram configurados.');
  console.log(
    'Lembre-se: se o HTTP 500 em / persistir, verifique NEXT_PUBLIC_SUPABASE_ANON_KEY em wrangler.jsonc vars.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
