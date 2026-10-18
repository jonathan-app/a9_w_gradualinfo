import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    sanity: {
      projectId: 'proj-teste',
      dataset: 'production',
    },
  },
  isSanityConfigured: true,
}));

import { getDashboardHealthData } from '@/lib/services/health-dashboard';

vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/sanity/client', () => ({
  probeSanityAvailability: vi.fn(),
}));

import { createPublicClient, createClient } from '@/lib/supabase/server';
import { probeSanityAvailability } from '@/lib/sanity/client';

describe('health-dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('distingue ausência de sessão (healthy) de erro 5xx de rede no Supabase Auth (unavailable)', async () => {
    // 1. Simula Postgres saudável
    vi.mocked(createPublicClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    // 2. Simula Auth com AuthSessionMissingError (sessão ausente = serviço operacional)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            name: 'AuthSessionMissingError',
            message: 'Auth session missing!',
            status: 400,
          },
        }),
      },
    } as any);

    // 3. Simula Sanity saudável
    vi.mocked(probeSanityAvailability).mockResolvedValue(undefined);

    const health1 = await getDashboardHealthData();
    expect(health1.auth.status).toBe('healthy');
    expect(health1.postgres.status).toBe('healthy');

    // 4. Agora simula falha 500 no Auth -> deve resultar em unavailable
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            message: 'Internal Server Error',
            status: 500,
          },
        }),
      },
    } as any);

    const health2 = await getDashboardHealthData();
    expect(health2.auth.status).toBe('unavailable');
  });

  it('marca Sanity como unavailable quando a sondagem excede timeout ou falha', async () => {
    vi.mocked(createPublicClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    vi.mocked(probeSanityAvailability).mockRejectedValue(
      new Error('Timeout de 800ms excedido'),
    );

    const health = await getDashboardHealthData();
    expect(health.sanity.status).toBe('unavailable');
  });
});
