import { createServer, request } from 'node:http';
// Controle separado do aplicativo, só na stack descartável de testes.
export function startFaultProxy() {
  const upstream = new URL(process.env.E2E_SUPABASE_UPSTREAM);
  const secret = process.env.E2E_FAULT_SECRET;
  if (!secret || !['localhost', '127.0.0.1'].includes(upstream.hostname))
    throw new Error('Proxy E2E exige upstream local e segredo.');
  let fault = 'none';
  const proxy = createServer((incoming, outgoing) => {
    const path = incoming.url ?? '/';
    if (
      (fault === 'read' && path.startsWith('/rest/v1/posts')) ||
      (fault === 'logout' && path.startsWith('/auth/v1/logout')) ||
      (fault === 'refresh' && path.includes('grant_type=refresh_token'))
    ) {
      outgoing.writeHead(503, { 'Content-Type': 'application/json' });
      outgoing.end(
        JSON.stringify({ message: 'Falha de transporte induzida no teste' }),
      );
      return;
    }
    const call = request(
      new URL(path, upstream),
      {
        method: incoming.method,
        headers: { ...incoming.headers, host: upstream.host },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    call.on('error', () => {
      outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(call);
  });
  const control = createServer((incoming, outgoing) => {
    if (
      incoming.method !== 'POST' ||
      incoming.headers.authorization !== `Bearer ${secret}`
    ) {
      outgoing.writeHead(403);
      outgoing.end();
      return;
    }
    const mode = (incoming.url ?? '').slice(1);
    if (!['none', 'read', 'logout', 'refresh'].includes(mode)) {
      outgoing.writeHead(400);
      outgoing.end();
      return;
    }
    fault = mode;
    outgoing.writeHead(204);
    outgoing.end();
  });
  proxy.listen(3110, '127.0.0.1');
  control.listen(3111, '127.0.0.1');
  return () => {
    proxy.close();
    control.close();
  };
}
