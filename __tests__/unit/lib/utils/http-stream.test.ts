/**
 * @fileoverview Testes unitários para readLimitedTextBody em lib/utils/http-stream.ts
 * @module __tests__/unit/lib/utils/http-stream.test
 */

import { describe, it, expect } from 'vitest';
import { readLimitedTextBody } from '@/lib/utils/http-stream';

describe('readLimitedTextBody', () => {
  it('rejeita imediatamente com 413 quando Content-Length excede o limite', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'content-length': '1000',
      },
      body: 'a'.repeat(100),
    });

    const result = await readLimitedTextBody(request, 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
      expect(result.error).toBe('payload_too_large');
    }
  });

  it('retorna texto vazio quando a requisição não tem corpo', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'GET',
    });

    const result = await readLimitedTextBody(request, 1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe('');
    }
  });

  it('lê corpo pequeno normalmente quando abaixo do limite', async () => {
    const payload = JSON.stringify({ hello: 'world' });
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });

    const result = await readLimitedTextBody(request, 1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(payload);
    }
  });

  it('lê múltiplos pedaços de streaming corretamente', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('parte 1 '));
        controller.enqueue(encoder.encode('parte 2'));
        controller.close();
      },
    });

    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: stream,
      // @ts-expect-error duplex é necessário em alguns runtimes Node para streams
      duplex: 'half',
    });

    const result = await readLimitedTextBody(request, 100);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe('parte 1 parte 2');
    }
  });

  it('aborta stream e devolve 413 assim que o total de bytes ultrapassa maxBytes', async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('12345'));
        controller.enqueue(encoder.encode('6789012345'));
        controller.close();
      },
    });

    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: stream,
      // @ts-expect-error duplex
      duplex: 'half',
    });

    const result = await readLimitedTextBody(request, 10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
      expect(result.error).toBe('payload_too_large');
      expect(result.message).toContain('10 bytes');
    }
  });
});
