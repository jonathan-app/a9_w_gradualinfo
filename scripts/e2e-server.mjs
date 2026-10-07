/**
 * @fileoverview Servidor HTTPS dos testes E2E: encerra TLS na 3100 e repassa para o Next.
 * @module scripts/e2e-server
 * @description O Playwright navega para `https://localhost:3100`, mas `next start` só serve
 *   HTTP; este script é o ponto de terminação TLS (chave/cert `E2E_TLS_*`) que faz pipe das
 *   requisições para a 3101. Com `E2E_NETWORK_FAULTS=1` também sobe o proxy de falhas da
 *   3110 — o alvo que o browser usa para simular rede ruim contra o Supabase.
 * @dependencies ./e2e-fault-proxy.mjs (via `startFaultProxy`), node:https, node:http,
 *   node:fs, node:child_process.
 *
 * Quando executado: `playwright.config.ts` escolhe este comando como `webServer` da suíte e2e.
 * Lê: `E2E_TLS_KEY`, `E2E_TLS_CERT`, `E2E_NETWORK_FAULTS` e os arquivos de certificado.
 * Escreve: nada.
 * Códigos de saída: propaga o exit code do processo `next` (evento `exit`); enquanto o Next
 *   ainda sobe, requisições recebem 502 com o corpo "Servidor inicializando.".
 */
import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { startFaultProxy } from './e2e-fault-proxy.mjs';
// Proxy de falhas é opt-in: sem `E2E_NETWORK_FAULTS=1` o fechamento vira no-op, e a cadeia
// de teardown abaixo continua idêntica nos dois modos.
const closeFaultProxy =
  process.env.E2E_NETWORK_FAULTS === '1' ? startFaultProxy() : () => {};
const next = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', '3101'],
  { stdio: 'inherit' },
);
const server = createServer(
  {
    key: readFileSync(process.env.E2E_TLS_KEY),
    cert: readFileSync(process.env.E2E_TLS_CERT),
  },
  (incoming, outgoing) => {
    const upstream = request(
      {
        hostname: '127.0.0.1',
        port: 3101,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode || 502, response.headers);
        response.pipe(outgoing);
      },
    );
    // Sem resposta do upstream no arranque, 502 em vez de conexão abandonada: o primeiro
    // pedido do Playwright não falha por tempo de boot do Next.
    upstream.on('error', () => {
      outgoing.writeHead(502);
      outgoing.end('Servidor inicializando.');
    });
    incoming.pipe(upstream);
  },
);
server.listen(3100, '0.0.0.0');
// Ordem do teardown importa: fecha o proxy e o TLS antes de matar o Next, para que nenhuma
// requisição em voo encontre um upstream derrubado antes do emissor.
const stop = () => {
  server.close();
  closeFaultProxy();
  next.kill('SIGTERM');
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
next.on('exit', (code) => {
  server.close();
  closeFaultProxy();
  process.exitCode = code || 0;
});
