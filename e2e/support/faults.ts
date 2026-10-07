/**
 * @fileoverview Cliente do controle do proxy de falhas de rede (porta 3111).
 * @module e2e/support/faults
 * @description Liga e desliga o modo de falha do proxy da 3110 do lado do teste. Exigir
 *   `E2E_NETWORK_FAULTS=1` e o segredo ANTES do POST faz a suíte falhar alto quando roda sem
 *   o proxy — sem essa trava o teste prosseguiria acreditando que a falha foi injetada, quando
 *   na verdade nada quebrou e o cenário estaria medindo o caminho feliz.
 * @dependencies @playwright/test (`APIRequestContext`, `expect`), variáveis
 *   `E2E_FAULT_SECRET`/`E2E_NETWORK_FAULTS`, servidor de `scripts/e2e-fault-proxy.mjs`.
 *
 * Quando executado: importado pelos specs com falha de transporte (tarefa4 e tarefa8).
 * Lê: `E2E_FAULT_SECRET`, `E2E_NETWORK_FAULTS`.
 * Escreve: nada; apenas POST autenticado em `http://127.0.0.1:3111/<modo>`.
 */
import { expect, type APIRequestContext } from '@playwright/test';
/**
 * Seta o modo do proxy de falhas e confirma que ele aceitou.
 *
 * @param request - Contexto de requisição do Playwright (qualquer origin serve; o controle
 *   é sempre 127.0.0.1).
 * @param mode - Modo desejado: `none` desliga a falha, `read`/`logout`/`refresh` induzem 503
 *   nos respectivos caminhos do Supabase.
 * @returns Promise que resolve após a troca confirmada.
 * @throws Error Sem segredo ou sem `E2E_NETWORK_FAULTS=1` (suíte sem proxy); `expect` falha se
 *   o controle responder diferente de 204 — ou seja, se a falha NÃO chegou a ser armada.
 */
export async function setFault(
  request: APIRequestContext,
  mode: 'none' | 'read' | 'logout' | 'refresh',
) {
  const secret = process.env.E2E_FAULT_SECRET;
  if (!secret || process.env.E2E_NETWORK_FAULTS !== '1')
    throw new Error('Execute com o proxy de falhas descartável.');
  expect(
    (
      await request.post(`http://127.0.0.1:3111/${mode}`, {
        headers: { Authorization: `Bearer ${secret}` },
      })
    ).status(),
  ).toBe(204);
}
