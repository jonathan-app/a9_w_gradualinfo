/**
 * @fileoverview Saída estruturada para logs da aplicação.
 * @module lib/logger
 * @description Centraliza a serialização JSON sem depender de um coletor remoto.
 * @dependencies Console disponível no servidor Next e no Cloudflare Worker.
 */

/**
 * Emite um registro informativo sem interromper a operação em caso de falha.
 * @param scope - Origem do registro, sem credenciais.
 * @param event - Campos do evento, sem tokens ou segredos.
 * @returns Nenhum valor, a saída é uma linha JSON no console.
 */
function info(scope: string, event: object): void {
  try {
    // O console é o destino do logger no Worker; a exceção fica só neste adaptador.
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({ level: 'info', scope, event }));
  } catch {
    // A indisponibilidade da trilha não deve interromper login ou logout.
  }
}

/**
 * Emite um registro de erro sem lançar exceção, para não mascarar a falha original.
 * @param scope - Origem do registro, sem credenciais.
 * @param event - Campos do evento, sem tokens ou segredos.
 * @returns Nenhum valor, a saída é uma linha JSON no console.
 */
function error(scope: string, event: object): void {
  try {
    console.error(JSON.stringify({ level: 'error', scope, event }));
  } catch {
    // A indisponibilidade da trilha não deve interromper a resposta de erro.
  }
}

/** Logger estruturado, com saída informativa e de erro no console do runtime. */
export const logger = { info, error };
