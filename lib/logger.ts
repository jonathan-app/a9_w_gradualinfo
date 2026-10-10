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

/** Logger estruturado, com saída informativa no console do runtime. */
export const logger = { info };
