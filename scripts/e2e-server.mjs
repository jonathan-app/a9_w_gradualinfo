import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
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
    upstream.on('error', () => {
      outgoing.writeHead(502);
      outgoing.end('Servidor inicializando.');
    });
    incoming.pipe(upstream);
  },
);
server.listen(3100, '0.0.0.0');
const stop = () => {
  server.close();
  next.kill('SIGTERM');
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
next.on('exit', (code) => {
  server.close();
  process.exitCode = code || 0;
});
