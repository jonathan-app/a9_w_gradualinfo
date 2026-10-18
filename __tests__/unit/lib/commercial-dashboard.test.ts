import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { getCommercialDashboardData } from '@/lib/services/commercial-dashboard';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('commercial-dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna status unconfigured quando chave de serviço não está configurada e customClient é nulo', async () => {
    const result = await getCommercialDashboardData({ customClient: null });
    expect(result.status).toBe('unconfigured');
    expect(result.offers).toEqual([]);
    expect(result.totalOffers).toBe(0);
  });

  it('retorna status empty quando tabela offers não retorna registros', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
              count: 0,
            }),
          }),
        }),
      }),
    });

    const mockClient = {
      from: mockFrom,
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await getCommercialDashboardData({
      customClient: mockClient,
    });
    expect(result.status).toBe('empty');
    expect(result.offers).toEqual([]);
    expect(result.totalOffers).toBe(0);
  });

  it('retorna status error quando consulta de ofertas falha', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
              count: 0,
            }),
          }),
        }),
      }),
    });

    const mockClient = {
      from: mockFrom,
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await getCommercialDashboardData({
      customClient: mockClient,
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toBeDefined();
  });

  it('deduplica o cálculo de mediana e preserva null como histórico insuficiente', async () => {
    const prodId1 = 'prod-1111-1111';
    const merchId1 = 'merch-1111-1111';

    // Duas ofertas com a mesma combinação de produto, lojista e meio de pagamento
    const rawOffers = [
      {
        id: 'off-1',
        product_id: prodId1,
        merchant_id: merchId1,
        title: 'Teclado Mecânico Gamer A',
        price_cents: 29900,
        original_price_cents: 39900,
        currency: 'BRL',
        payment_method: 'a_vista',
        badge_status: 'verified',
        badge_expires_at: '2026-10-17T00:00:00Z',
        status: 'ativa',
        merchants: { name: 'Tech Store' },
      },
      {
        id: 'off-2',
        product_id: prodId1,
        merchant_id: merchId1,
        title: 'Teclado Mecânico Gamer B',
        price_cents: 28900,
        original_price_cents: null,
        currency: 'BRL',
        payment_method: 'a_vista',
        badge_status: 'unverified',
        badge_expires_at: null,
        status: 'ativa',
        merchants: { name: 'Tech Store' },
      },
    ];

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'offers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: rawOffers,
                  error: null,
                  count: 2,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'price_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ product_id: prodId1 }],
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const mockClient = {
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as SupabaseClient;

    const result = await getCommercialDashboardData({
      customClient: mockClient,
    });

    expect(result.status).toBe('configured');
    expect(result.offers).toHaveLength(2);

    // RPC chamada apenas UMA vez para a combinação idêntica
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('calculate_offer_median', {
      p_product_id: prodId1,
      p_merchant_id: merchId1,
      p_payment_method: 'a_vista',
    });

    // Mediana null deve ser preservada (amostras insuficientes, não zero)
    expect(result.offers[0]?.median30dCents).toBeNull();
    expect(result.offers[1]?.median30dCents).toBeNull();

    // Outlier detectado pelo price_history
    expect(result.offers[0]?.hasOutlier).toBe(true);
    expect(result.offers[0]?.outlierCount).toBe(1);
  });
});
