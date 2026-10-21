/**
 * @fileoverview Testes unitários para ingest/ofertas/route.ts
 * @module __tests__/unit/app/api/ingest/ofertas
 * @description Testa handleIngestOfertas com validação de cabeçalhos do coletor.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('handleIngestOfertas', () => {
  it('retorna 400 quando cabeçalhos do coletor estão faltando', async () => {
    const { handleIngestOfertas } =
      await import('@/app/api/ingest/ofertas/route');

    const request = new Request('http://localhost/api/ingest/ofertas', {
      method: 'POST',
      duplex: 'half',
    });
    const response = await handleIngestOfertas(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('missing_collector_headers');
  });

  it('retorna 400 quando faltam cabeçalhos individuais', async () => {
    const { handleIngestOfertas } =
      await import('@/app/api/ingest/ofertas/route');

    const request = new Request('http://localhost/api/ingest/ofertas', {
      method: 'POST',
      headers: {
        'x-collector-id': 'collector-1',
        'x-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-nonce': 'nonce-123',
        // faltando x-signature-sha256
      },
      duplex: 'half',
    });
    const response = await handleIngestOfertas(request);
    expect(response.status).toBe(400);
  });
});
