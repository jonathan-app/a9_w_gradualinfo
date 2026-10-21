/**
 * @fileoverview Testes unitários para commercial-dashboard.ts
 * @module __tests__/unit/lib/services/commercial-dashboard
 * @description Testa createServiceRoleClient e getCommercialDashboardData
 *   com estados empty, error e configured.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    supabase: {
      url: 'http://localhost:54321',
      serviceRoleKey: 'test-service-key',
    },
  },
  isSupabaseServiceRoleConfigured: true,
}));

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => ({
        range: vi.fn(() =>
          Promise.resolve({ data: [], error: null, count: 0 }),
        ),
      })),
    })),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import {
  createServiceRoleClient,
  getCommercialDashboardData,
} from '@/lib/services/commercial-dashboard';

describe('commercial-dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() =>
              Promise.resolve({ data: [], error: null, count: 0 }),
            ),
          })),
        })),
      })),
    });
  });

  describe('createServiceRoleClient', () => {
    it('retorna cliente válido quando serviceRoleKey está configurada', () => {
      const client = createServiceRoleClient();
      expect(client).toBeDefined();
    });
  });

  describe('getCommercialDashboardData', () => {
    it('retorna empty quando não há ofertas', async () => {
      const result = await getCommercialDashboardData();
      expect(result.status).toBe('empty');
      expect(result.offers).toEqual([]);
      expect(result.totalOffers).toBe(0);
    });

    it('aplica paginação corretamente', async () => {
      const result = await getCommercialDashboardData({
        page: 2,
        pageSize: 20,
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
    });

    it('retorna error para exceção inesperada', async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error('unexpected');
      });
      const result = await getCommercialDashboardData();
      expect(result.status).toBe('error');
    });
  });
});
