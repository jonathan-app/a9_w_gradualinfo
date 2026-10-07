/**
 * @fileoverview Aguarda um endpoint HTTP responder OK antes de o próximo passo da CI seguir.
 * @module scripts/wait-http
 * @description Sondagem passiva: a cada 500ms tenta `fetch` com timeout de 2s até o alvo
 *   responder 2xx/3xx ou estourar o prazo absoluto de 60s. Usado entre "subir o servidor" e
 *   "rodar o teste" para que a primeira requisição do teste não bata em processo ainda frio.
 * @dependencies nenhuma — apenas o `fetch` global do Node 22 e `AbortSignal.timeout`.
 *
 * Quando executado: CI, imediatamente após o passo que inicia o servidor.
 * Lê: a URL de saúde (1º argumento) e a rede local.
 * Escreve: nada.
 * Códigos de saída: 0 = respondeu OK no prazo; 1 = timeout de 60s ou URL ausente (exceção).
 */
const target = process.argv[2];
if (!target) throw new Error('Informe a URL de saúde.');
// Prazo absoluto de 60s, não contagem de tentativas: o servidor pode demorar tempos
// diferentes a cada boot, mas a janela total é o limite real de tempo de CI gasto.
const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(2000) });
    // 4xx/5xx não é "pronto": servidor no ar respondendo erro ainda falharia o teste —
    // só resposta OK derruba o loop.
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* servidor ainda inicia */
  }
  // Um request falho (conexão recusada, timeout) não aborta: recua 500ms e tenta de novo.
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.error('Servidor não respondeu no prazo.');
  process.exitCode = 1;
}
