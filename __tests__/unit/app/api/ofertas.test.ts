/**
 * @fileoverview Testes unitários para ofertas/route.ts
 * @module __tests__/unit/app/api/ofertas
 * @description Testa GET /api/ofertas com validação de parâmetros de consulta.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/server', () => {
  const mockQuery = {
    data: [],
    error: null,
    eq: vi.fn(() => mockQuery),
    limit: vi.fn(() => mockQuery),
  };
  return {
    createPublicClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => mockQuery),
      })),
    })),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn() },
}));

vi.mock('@/lib/utils/api-response', () => ({
  apiErrorResponse: vi.fn((status: number, error: string, message: string) => {
    return new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

import { handleGetOfertas } from '@/app/api/ofertas/route';

describe('handleGetOfertas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 200 com lista vazia quando não há filtros', async () => {
    const request = new Request('http://localhost/api/ofertas', {
      method: 'GET',
      duplex: 'half',
    });
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.offers).toEqual([]);
  });

  it('retorna 400 quando product_id não é UUID válido', async () => {
    const request = new Request(
      'http://localhost/api/ofertas?product_id=não-é-uuid',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando merchant_id não é UUID válido', async () => {
    const request = new Request(
      'http://localhost/api/ofertas?merchant_id=não-é-uuid',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando limit não é número inteiro', async () => {
    const request = new Request('http://localhost/api/ofertas?limit=abc', {
      method: 'GET',
      duplex: 'half',
    });
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando limit está fora do intervalo 1-100', async () => {
    const request = new Request('http://localhost/api/ofertas?limit=200', {
      method: 'GET',
      duplex: 'half',
    });
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(400);
  });

  it('retorna 200 quando parâmetros são válidos', async () => {
    const request = new Request(
      'http://localhost/api/ofertas?product_id=00000000-0000-4000-8000-000000000001&limit=10',
      {
        method: 'GET',
        duplex: 'half',
      },
    );
    const response = await handleGetOfertas(request);
    expect(response.status).toBe(200);
  });
});
