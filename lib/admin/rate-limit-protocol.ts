/**
 * @fileoverview Protocolo limitado do contador administrativo.
 * @module lib/admin/rate-limit-protocol
 * @description Centraliza operações e leitura limitada para não aceitar payload arbitrário.
 * @dependencies APIs Web Request e Response.
 */
/** Operações fixas, sem identidade fornecida pelo cliente. */
export type AdminRateOperation = 'login' | 'mfa';
/** Decisão persistida ou falha fechada do adaptador. */
export type AdminRateDecision =
  { status: 200 } | { status: 429 | 503; retryAfter: number };

/**
 * Lê JSON com limite em bytes reais, incluindo respostas sem Content-Length.
 * @param message - Mensagem HTTP recebida.
 * @param limit - Quantidade máxima de bytes UTF-8.
 * @param signal - Cancelamento opcional do prazo total da consulta.
 * @returns Valor bruto a validar na fronteira do protocolo.
 */
export async function readBoundedJson(
  message: Request | Response,
  limit: number,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();
  if (!message.body) throw new Error('Corpo ausente.');
  const reader = message.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('Corpo excedente.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    // Não esperar cancelamento de um emissor defeituoso para concluir a falha fechada.
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
