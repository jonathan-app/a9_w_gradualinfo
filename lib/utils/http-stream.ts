/**
 * @fileoverview Leitura controlada de corpo HTTP com limite progressivo de bytes.
 * @module lib/utils/http-stream
 * @description Lê o corpo de requisições Request com suporte a streaming progressivo,
 *   abortando imediatamente quando o limite de bytes for excedido para evitar
 *   consumo excessivo de memória no runtime de Workers da Cloudflare.
 * @dependencies nenhuma.
 */

export interface ReadBodySuccess {
  ok: true;
  text: string;
}

export interface ReadBodyFailure {
  ok: false;
  status: 400 | 413;
  error: 'payload_too_large' | 'read_error';
  message: string;
}

export type ReadBodyResult = ReadBodySuccess | ReadBodyFailure;

/**
 * Lê o corpo textual de uma requisição garantindo que não exceda maxBytes.
 * Se Content-Length estiver presente e exceder maxBytes, rejeita de imediato (fast-fail).
 * Se for streaming (ex: chunked transfer), lê pedaço a pedaço via ReadableStream,
 * abortando o leitor assim que a soma acumulada de bytes ultrapassar maxBytes.
 *
 * @param request - Requisição HTTP a ser lida.
 * @param maxBytes - Limite máximo permitido em bytes (ex: 524288 = 512 KB).
 * @returns ReadBodyResult com o texto decodificado em UTF-8 ou erro 413/400.
 */
export async function readLimitedTextBody(
  request: Request,
  maxBytes: number,
): Promise<ReadBodyResult> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isNaN(parsedLength) && parsedLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'payload_too_large',
        message: `O corpo da requisição excede o limite máximo permitido de ${maxBytes} bytes.`,
      };
    }
  }

  if (!request.body) {
    return { ok: true, text: '' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // Ignora erro no cancelamento de stream abortada
          }
          return {
            ok: false,
            status: 413,
            error: 'payload_too_large',
            message: `O corpo da requisição excede o limite máximo permitido de ${maxBytes} bytes.`,
          };
        }
        chunks.push(value);
      }
    }
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'read_error',
      message: 'Falha na leitura do corpo da requisição.',
    };
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const decoder = new TextDecoder('utf-8');
  return { ok: true, text: decoder.decode(merged) };
}
