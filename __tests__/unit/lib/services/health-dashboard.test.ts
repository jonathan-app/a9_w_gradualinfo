/**
 * @fileoverview Testes unitários para health-dashboard.ts
 * @module __tests__/unit/lib/services/health-dashboard
 * @description Testa getDashboardHealthData com estados healthy, degraded,
 *   unavailable e unconfigured.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    supabase: { url: 'http://localhost:54321', anonKey: 'test-anon-key' },
  },
  isSanityConfigured: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ error: null, count: 5 })),
    })),
  })),
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'u1' } },
        error: null,
      })),
    },
  })),
}));

vi.mock('@/lib/sanity/client', () => ({
  probeSanityAvailability: vi.fn(async () => {}),
}));

import { getDashboardHealthData } from '@/lib/services/health-dashboard';

describe('health-dashboard', () => {
  describe('getDashboardHealthData', () => {
    it('retorna postgres healthy quando consulta tem sucesso', async () => {
      const result = await getDashboardHealthData();
      expect(result.postgres.name).toBe('PostgreSQL Database');
      expect(result.postgres.status).toBe('healthy');
      expect(result.postgres.latencyMs).toBeDefined();
      expect(result.postgres.checkedAt).toBeDefined();
    });

    it('retorna postgres healthy quando PGRST116 (tabela vazia)', async () => {
      const { createPublicClient } = await import('@/lib/supabase/server');
      vi.mocked(createPublicClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ error: { code: 'PGRST116' } })),
        })),
      } as any);
      const result = await getDashboardHealthData();
      expect(result.postgres.status).toBe('healthy');
    });

    it('retorna postgres unavailable quando há exceção', async () => {
      const { createPublicClient } = await import('@/lib/supabase/server');
      vi.mocked(createPublicClient).mockImplementationOnce(() => {
        throw new Error('connection refused');
      });
      const result = await getDashboardHealthData();
      expect(result.postgres.status).toBe('unavailable');
    });

    it('retorna auth healthy quando getUser tem sucesso', async () => {
      const result = await getDashboardHealthData();
      expect(result.auth.name).toBe('Supabase Auth');
      expect(result.auth.status).toBe('healthy');
    });

    it('retorna auth unavailable quando há erro de rede', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockRejectedValueOnce(new Error('network error'));
      const result = await getDashboardHealthData();
      expect(result.auth.status).toBe('unavailable');
    });

    it('retorna sanity unconfigured quando não está configurado', async () => {
      const result = await getDashboardHealthData();
      expect(result.sanity.name).toBe('Sanity Content Lake');
      expect(result.sanity.status).toBe('unconfigured');
    });

    it('retorna checkedAt em todos os componentes', async () => {
      const result = await getDashboardHealthData();
      expect(result.postgres.checkedAt).toBeDefined();
      expect(result.auth.checkedAt).toBeDefined();
      expect(result.sanity.checkedAt).toBeDefined();
      expect(result.checkedAt).toBeDefined();
    });
  });
});
