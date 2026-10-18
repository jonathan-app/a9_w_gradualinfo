// @vitest-environment node
/**
 * @fileoverview Testes unitários do protocolo limitado do contador administrativo.
 * @module __tests__/unit/admin-rate-limit-protocol
 * @description Verifica leitura de JSON com limite em bytes, incluindo respostas sem
 *   Content-Length e cancelamento por AbortSignal.
 * @dependencies vitest, lib/admin/rate-limit-protocol.
 */
import { describe, expect, it } from 'vitest';
import { readBoundedJson } from '@/lib/admin/rate-limit-protocol';

function jsonResponse(body: string, contentType = 'application/json') {
  return new Response(body, {
    headers: { 'Content-Type': contentType },
  });
}

describe('readBoundedJson', () => {
  it('lê JSON válido dentro do limite', async () => {
    const response = jsonResponse('{"allowed":true}');
    const result = await readBoundedJson(response, 1024);
    expect(result).toEqual({ allowed: true });
  });

  it('lê JSON válido sem Content-Length', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"operation":"login"}'));
        controller.close();
      },
    });
    const response = new Response(stream, {
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await readBoundedJson(response, 1024);
    expect(result).toEqual({ operation: 'login' });
  });

  it('rejeita corpo que excede o limite de bytes', async () => {
    const response = jsonResponse('{"padding":"' + 'x'.repeat(256) + '"}');
    await expect(readBoundedJson(response, 128)).rejects.toThrow(
      'Corpo excedente',
    );
  });

  it('rejeita JSON malformado', async () => {
    const response = jsonResponse('{invalid}');
    await expect(readBoundedJson(response, 1024)).rejects.toThrow();
  });

  it('rejeita corpo ausente', async () => {
    const response = new Response(null, {
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(readBoundedJson(response, 1024)).rejects.toThrow(
      'Corpo ausente',
    );
  });

  it('rejeita tipo de conteúdo não JSON', async () => {
    const response = new Response('plain text', {
      headers: { 'Content-Type': 'text/plain' },
    });
    await expect(readBoundedJson(response, 1024)).rejects.toThrow();
  });

  it('respeita cancelamento por AbortSignal', async () => {
    const controller = new AbortController();
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode('{"partial"'));
      },
    });
    const response = new Response(stream, {
      headers: { 'Content-Type': 'application/json' },
    });
    controller.abort();
    await expect(
      readBoundedJson(response, 1024, controller.signal),
    ).rejects.toThrow();
  });

  it('libera lock do reader mesmo em caso de erro', async () => {
    const response = jsonResponse('{invalid}');
    await expect(readBoundedJson(response, 1024)).rejects.toThrow();
    expect(response.bodyUsed).toBe(true);
  });
});
