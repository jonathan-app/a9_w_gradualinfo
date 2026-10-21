/**
 * @fileoverview Testes unitários para http-stream.ts
 * @module __tests__/unit/lib/utils/http-stream
 * @description Testa readLimitedTextBody com Content-Length, streaming e limites de bytes.
 */

import { describe, expect, it } from 'vitest';

import { readLimitedTextBody } from '@/lib/utils/http-stream';

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

describe('readLimitedTextBody', () => {
  it('lê corpo pequeno dentro do limite', async () => {
    const request = makeRequest('{"ok": true}');
    const result = await readLimitedTextBody(request, 1024);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('{"ok": true}');
  });

  it('rejeita corpo maior que Content-Length (fast-fail)', async () => {
    const request = makeRequest('{"ok": true}', 1000);
    const result = await readLimitedTextBody(request, 10);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toBe('payload_too_large');
  });

  it('rejeita corpo streaming que excede o limite', async () => {
    const longBody = 'a'.repeat(200);
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: longBody,
    });
    const result = await readLimitedTextBody(request, 50);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toBe('payload_too_large');
  });

  it('retorna texto vazio quando request não tem body', async () => {
    const request = new Request('http://localhost/api/test', { method: 'GET' });
    const result = await readLimitedTextBody(request, 1024);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('');
  });

  it('retorna erro de leitura quando stream falha', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      // @ts-ignore - sobrescreve body para forçar erro
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error('stream falhou'));
        },
      }),
      duplex: 'half',
    });
    const result = await readLimitedTextBody(request, 1024);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('read_error');
  });
});
