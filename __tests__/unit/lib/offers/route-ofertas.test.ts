/**
 * @fileoverview Testes unitários para a rota pública /api/ofertas (Spec 0021, AC-05 e AC-06).
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { handleGetOfertas } from '@/app/api/ofertas/route';

describe('handleGetOfertas (GET /api/ofertas - Spec 0021)', () => {
  const VALID_PRODUCT_ID = 'a0000000-0000-4000-8000-000000000001';
  const VALID_MERCHANT_ID = 'b0000000-0000-4000-8000-000000000002';

  it('retorna 200 com array de ofertas e cabeçalhos de cache público', async () => {
    const mockData = [
      {
        id: 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329',
        price_cents: 549900,
        badge_status: 'verified',
      },
    ];

    const mockSupabase = {
      from: () => ({
        select: () => ({
          limit: async () => ({ data: mockData, error: null }),
        }),
      }),
    };

    const req = new Request('https://gradualinfo.com.br/api/ofertas');
    const res = await handleGetOfertas(req, { supabaseClient: mockSupabase });

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300',
    );
    const json = await res.json();
    expect(json.offers).toHaveLength(1);
    expect(json.offers[0].id).toBe('c1f7b0e1-4829-4d6e-931b-26f58f4a1329');
  });

  it('valida formato UUIDv4 de product_id e merchant_id (AC-06)', async () => {
    const reqInvalidProduct = new Request(
      'https://gradualinfo.com.br/api/ofertas?product_id=invalid-uuid',
    );
    const resProduct = await handleGetOfertas(reqInvalidProduct);
    expect(resProduct.status).toBe(400);
    const jsonProduct = await resProduct.json();
    expect(jsonProduct.error).toBe('invalid_parameter');

    const reqInvalidMerchant = new Request(
      'https://gradualinfo.com.br/api/ofertas?merchant_id=invalid-uuid',
    );
    const resMerchant = await handleGetOfertas(reqInvalidMerchant);
    expect(resMerchant.status).toBe(400);

    const reqInvalidLimit = new Request(
      'https://gradualinfo.com.br/api/ofertas?limit=abc',
    );
    const resLimit = await handleGetOfertas(reqInvalidLimit);
    expect(resLimit.status).toBe(400);

    const reqLimitOutOfRange = new Request(
      'https://gradualinfo.com.br/api/ofertas?limit=101',
    );
    const resOutOfRange = await handleGetOfertas(reqLimitOutOfRange);
    expect(resOutOfRange.status).toBe(400);
  });

  it('passa filtros validados de product_id e merchant_id para a query', async () => {
    let capturedProductId = '';
    let capturedMerchantId = '';

    const mockSupabase = {
      from: () => ({
        select: () => {
          const builder: any = {
            limit: () => builder,
            eq: (col: string, val: string) => {
              if (col === 'product_id') capturedProductId = val;
              if (col === 'merchant_id') capturedMerchantId = val;
              return builder;
            },
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
          return builder;
        },
      }),
    };

    const req = new Request(
      `https://gradualinfo.com.br/api/ofertas?product_id=${VALID_PRODUCT_ID}&merchant_id=${VALID_MERCHANT_ID}`,
    );
    const res = await handleGetOfertas(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(200);
    expect(capturedProductId).toBe(VALID_PRODUCT_ID);
    expect(capturedMerchantId).toBe(VALID_MERCHANT_ID);
  });

  it('sanitiza erros do banco e retorna HTTP 503 opaco fail-closed (AC-05)', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          limit: async () => ({
            data: null,
            error: {
              code: '42P01',
              message: 'relation "active_offers_view" does not exist',
            },
          }),
        }),
      }),
    };

    const req = new Request('https://gradualinfo.com.br/api/ofertas');
    const res = await handleGetOfertas(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('unavailable');
    expect(json.message).toBe(
      'Serviço de ofertas temporariamente indisponível.',
    );
    // Garante que nenhuma mensagem crua do PostgreSQL vazou para o cliente
    expect(JSON.stringify(json)).not.toContain('42P01');
    expect(JSON.stringify(json)).not.toContain('active_offers_view');
  });

  it('captura exceção lançada pelo cliente de banco e retorna 503 sanitizado sem vazar stack ou SQL', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          limit: async () => {
            throw new Error(
              'connect ECONNREFUSED 127.0.0.1:54321 for table "active_offers_view"',
            );
          },
        }),
      }),
    };

    const req = new Request('https://gradualinfo.com.br/api/ofertas');
    const res = await handleGetOfertas(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const json = await res.json();
    expect(json).toEqual({
      error: 'unavailable',
      message: 'Serviço de ofertas temporariamente indisponível.',
    });
    expect(JSON.stringify(json)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(json)).not.toContain('active_offers_view');
  });
});
