/**
 * @fileoverview Testes unitários para rate-limit-protocol.ts
 * @module __tests__/unit/lib/admin/rate-limit-protocol
 * @description Testa readBoundedJson com limite de bytes, Content-Length e streaming.
 */

import { describe, expect, it } from 'vitest';

import { readBoundedJson } from '@/lib/admin/rate-limit-protocol';

function makeRequest(bodyText: string, contentLength?: number): Request {
  const headers: Record<string, string> = {};
  if (contentLength !== undefined) {
    headers['content-length'] = String(contentLength);
  }
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
    body: bodyText,
    duplex: 'half',
  });
}

describe('readBoundedJson', () => {
  it('lê JSON válido dentro do limite', async () => {
    const request = makeRequest('{"ok": true}');
    const result = await readBoundedJson(request, 1024);
    expect(result).toEqual({ ok: true });
  });

  it('rejeita corpo maior que Content-Length', async () => {
    const request = makeRequest('{"ok": true}', 1000);
    await expect(readBoundedJson(request, 10)).rejects.toThrow(
      'Corpo excedente.',
    );
  });

  it('rejeita request sem body', async () => {
    const request = new Request('http://localhost/api/test', { method: 'GET' });
    await expect(readBoundedJson(request, 1024)).rejects.toThrow(
      'Corpo ausente.',
    );
  });

  it('lança erro quando stream falha', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      // @ts-expect-error - sobrescreve body para forçar erro
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error('stream falhou'));
        },
      }),
      duplex: 'half',
    });
    await expect(readBoundedJson(request, 1024)).rejects.toThrow(
      'stream falhou',
    );
  });

  it('lança erro quando JSON é inválido', async () => {
    const request = makeRequest('não é json');
    await expect(readBoundedJson(request, 1024)).rejects.toThrow();
  });
});
