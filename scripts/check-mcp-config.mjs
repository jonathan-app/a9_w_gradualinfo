#!/usr/bin/env node
/**
 * @fileoverview Confere as configurações MCP rastreadas do projeto.
 * @module scripts/check-mcp-config
 * @description Exige versões exatas dos servidores executáveis e Supabase
 *   apenas no endpoint local. Disponibilidade real depende de /check verify.
 * @dependencies node:fs, node:path, node:url.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Confere se comando e versão correspondem ao contrato versionado.
 *
 * @param {object} server - Entrada MCP.
 * @param {string} command - Executável esperado.
 * @param {string} packageArg - Pacote e versão exatos.
 * @returns {boolean} Verdadeiro se o servidor usa a versão fixada.
 */
function pinned(server, command, packageArg) {
  return (
    server?.command === command &&
    Array.isArray(server.args) &&
    server.args.includes(packageArg) &&
    !server.args.some((arg) => arg.includes('@latest'))
  );
}

/**
 * Valida o catálogo genérico e o adaptador do VS Code.
 *
 * @param {string} repo - Raiz do projeto.
 * @returns {string[]} Motivos de reprovação, vazio quando íntegro.
 */
export function checkMcpConfig(repo) {
  const generic = JSON.parse(
    readFileSync(join(repo, '.agents/mcp.json'), 'utf8'),
  ).mcpServers;
  const vscode = JSON.parse(
    readFileSync(join(repo, '.vscode/mcp.json'), 'utf8'),
  ).servers;
  const reasons = [];
  const commands = [
    [generic?.playwright, 'npx', '@playwright/mcp@0.0.83'],
    [generic?.['next-devtools'], 'npx', 'next-devtools-mcp@0.4.0'],
    [generic?.fetch, 'uvx', 'mcp-server-fetch==0.6.3'],
    [vscode?.playwright, 'npx', '@playwright/mcp@0.0.83'],
    [vscode?.['next-devtools'], 'npx', 'next-devtools-mcp@0.4.0'],
  ];
  for (const [server, command, packageArg] of commands)
    if (!pinned(server, command, packageArg))
      reasons.push(`MCP sem versão esperada: ${packageArg}.`);
  try {
    const url = new URL(generic?.supabase?.url);
    if (
      generic?.supabase?.type !== 'http' ||
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.port !== '54321' ||
      url.pathname !== '/mcp' ||
      url.search ||
      url.username ||
      url.password
    )
      reasons.push('Supabase MCP deve usar apenas o endpoint local.');
  } catch {
    reasons.push('URL do Supabase MCP ausente ou inválida.');
  }
  return reasons;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const reasons = checkMcpConfig(process.cwd());
    for (const reason of reasons) console.error(reason);
    process.exitCode = reasons.length ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
