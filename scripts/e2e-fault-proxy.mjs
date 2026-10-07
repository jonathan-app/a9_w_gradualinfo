/**
 * @fileoverview Proxy de falhas de rede para E2E: 503 seletivo entre browser e Supabase
 *   local.
 * @module scripts/e2e-fault-proxy
 * @description Dois servidores em loopback: a 3110 faz proxy das chamadas ao Supabase
 *   (`E2E_SUPABASE_UPSTREAM`) e devolve 503 nos caminhos do modo ativo; a 3111 é o controle
 *   que troca o modo, exigindo POST autenticado com `Bearer E2E_FAULT_SECRET`. A falha
 *   acontece fora da aplicação, na rede — por isso o produto de produção não precisa de rota
 *   nem flag de teste para o E2E simular indisponibilidade.
 * @dependencies node:http (`createServer`, `request`), `E2E_SUPABASE_UPSTREAM` e
 *   `E2E_FAULT_SECRET` do ambiente (gerados por `scripts/ci-fixtures.mjs`).
 *
 * Quando executado: importado por `scripts/e2e-server.mjs` apenas com `E2E_NETWORK_FAULTS=1`.
 * Lê: `E2E_SUPABASE_UPSTREAM`, `E2E_FAULT_SECRET`.
 * Escreve: nada em disco; altera o próprio estado (modo de falha) via POST na 3111.
 * Códigos de saída: definidos pelo `e2e-server.mjs` que o importa.
 */
import { createServer, request } from 'node:http';
// Controle separado do aplicativo, só na stack descartável de testes.
/**
 * Sobe o proxy de falhas (3110) e seu controle (3111).
 *
 * @returns {() => void} Fecha os dois servidores — `e2e-server.mjs` guarda a função e a
 *   chama no teardown, junto com o TLS e o processo do Next.
 * @throws {Error} Se `E2E_FAULT_SECRET` estiver ausente ou o upstream não for loopback:
 *   a trava impede que um proxy apontando para um projeto remoto induza 503 em produção.
 */
export function startFaultProxy() {
  const upstream = new URL(process.env.E2E_SUPABASE_UPSTREAM);
  const secret = process.env.E2E_FAULT_SECRET;
  if (!secret || !['localhost', '127.0.0.1'].includes(upstream.hostname))
    throw new Error('Proxy E2E exige upstream local e segredo.');
  // Estado em memória do processo: começa em 'none' para que a suíte que nunca chama o
  // controle (ou que já desligou a falha) veja tráfego normal sem nenhum setup extra.
  let fault = 'none';
  const proxy = createServer((incoming, outgoing) => {
    const path = incoming.url ?? '/';
    // O modo escolhe o CAMINHO que quebra, não o servidor inteiro: assim a falha de leitura
    // não derruba o login e a falha de logout não derruba a leitura. É o que permite ao spec
    // provar que "só isto falhou, o resto continuou funcionando".
    if (
      (fault === 'read' && path.startsWith('/rest/v1/posts')) ||
      (fault === 'logout' && path.startsWith('/auth/v1/logout')) ||
      (fault === 'refresh' && path.includes('grant_type=refresh_token'))
    ) {
      // 503 (e não 500): é um erro de serviço indisponível vindo de "fora", que é exatamente
      // o caminho de tratamento que os specs de falha de transporte precisam acionar.
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
    // Upstream fora do ar vira 502 para o cliente em vez de conexão abandonada: o teste
    // precisa enxergar uma resposta (ou status) e não um timeout de socket.
    call.on('error', () => {
      outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(call);
  });
  const control = createServer((incoming, outgoing) => {
    // O controle só aceita POST com o segredo que `ci-fixtures.mjs` gerou para ESTA execução:
    // sem segredo não há como outro processo — nem o browser — trocar o modo por acidente.
    if (
      incoming.method !== 'POST' ||
      incoming.headers.authorization !== `Bearer ${secret}`
    ) {
      outgoing.writeHead(403);
      outgoing.end();
      return;
    }
    const mode = (incoming.url ?? '').slice(1);
    // Lista fechada de modos: a URL vira estado do proxy, então qualquer string arbitraria
    // seria aceita como "modo" e simplesmente nunca casaria com um caminho — aqui ela vira
    // 400, para o teste falhar alto quando a enumeração do proxy e a do spec divergirem.
    if (!['none', 'read', 'logout', 'refresh'].includes(mode)) {
      outgoing.writeHead(400);
      outgoing.end();
      return;
    }
    fault = mode;
    outgoing.writeHead(204);
    outgoing.end();
  });
  // Portas fixas em loopback: 3110 é o upstream que o browser usa e 3111 o controle chamado
  // por `e2e/support/faults.ts` — os números são contrato entre os três arquivos, por isso
  // não são configuráveis.
  proxy.listen(3110, '127.0.0.1');
  control.listen(3111, '127.0.0.1');
  return () => {
    proxy.close();
    control.close();
  };
}
