#!/usr/bin/env node

/**
 * scripts/lighthouse-ci.js — roda o Lighthouse com um servidor próprio
 *
 * Por que não chamar `lhci autorun` direto
 * `pnpm lighthouse` (lhci) exige que o site já esteja no ar em
 * http://localhost:3000. Em CI isso significa subir o servidor em outro
 * terminal e torcer. Este script sobe o `next start` ele mesmo, espera a porta
 * responder, roda o Lighthouse contra o build de produção e derruba tudo.
 *
 * Por que build de produção e não `next dev`
 * O modo dev serve código não minificado, com marcação de desenvolvimento e
 * sem as otimizações de imagem e bundle. Medir nele dá número que não
 * corresponde a produção — e a falha mais comum de auditoria de performance é
 * exatamente medir a coisa errada.
 *
 * Quando roda: `pnpm lighthouse:ci`.
 * Saída: 0 = todos os pisos atingidos; 1 = algum piso estourado.
 */

import { spawn } from 'node:child_process';
import process from 'node:process';

const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;

/** Espera a porta responder. Sem isto o Lighthouse mede a página de erro. */
async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      // Qualquer resposta HTTP serve: o que importa é que o processo vive.
      if (response.status > 0) return true;
    } catch {
      // Ainda subindo.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

async function main() {
  console.log(`→ lighthouse: build de produção…`);
  const build = spawn('pnpm', ['build:next'], {
    stdio: 'inherit',
    shell: true,
  });

  const buildExit = await new Promise((resolve) => {
    build.on('close', resolve);
  });

  if (buildExit !== 0) {
    console.error('❌ build falhou; auditoria cancelada.');
    process.exit(buildExit ?? 1);
  }

  console.log(`→ lighthouse: subindo next start na porta ${PORT}…`);
  const server = spawn('pnpm', ['start', '--port', String(PORT)], {
    stdio: 'inherit',
    shell: true,
  });

  // Sem este handler, um Ctrl+C deixa o next start órfão segurando a porta e o
  // próximo `pnpm lighthouse:ci` falha com EADDRINUSE sem explicar por quê.
  const shutdown = () => server.kill('SIGTERM');
  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });
  process.on('exit', shutdown);

  const isUp = await waitForServer(BASE_URL, STARTUP_TIMEOUT_MS);

  if (!isUp) {
    shutdown();
    console.error(
      `❌ o servidor não respondeu em ${STARTUP_TIMEOUT_MS / 1000}s.`,
    );
    process.exit(1);
  }

  console.log('→ lighthouse: auditando…');
  const lhci = spawn('pnpm', ['exec', 'lhci', 'autorun'], {
    stdio: 'inherit',
    shell: true,
  });

  const lhciExit = await new Promise((resolve) => {
    lhci.on('close', resolve);
  });

  shutdown();

  if (lhciExit !== 0) {
    console.error(
      '❌ algum piso de performance/acessibilidade não foi atingido.',
    );
  }

  process.exit(lhciExit ?? 1);
}

main();
