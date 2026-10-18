import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getHealth } from '@/app/api/admin/dashboard/health/route';
import { POST as refreshHealth } from '@/app/api/admin/dashboard/rotinas/refresh-health/route';

vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(),
}));

vi.mock('@/lib/services/health-dashboard', () => ({
  getDashboardHealthData: vi.fn().mockResolvedValue({
    postgres: {
      name: 'PostgreSQL Database',
      status: 'healthy',
      checkedAt: '2026-10-16T12:00:00Z',
    },
    auth: {
      name: 'Supabase Auth',
      status: 'healthy',
      checkedAt: '2026-10-16T12:00:00Z',
    },
    sanity: {
      name: 'Sanity Content Lake',
      status: 'healthy',
      checkedAt: '2026-10-16T12:00:00Z',
    },
    checkedAt: '2026-10-16T12:00:00Z',
  }),
}));

import { assertAdminApiAuth } from '@/lib/admin/auth';

describe('admin dashboard API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia GET /api/admin/dashboard/health quando assertAdminApiAuth rejeita (ex: AAL1 ou unauthenticated)', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValue({
      ok: false,
      response: new Response('Acesso negado.', { status: 403 }),
    } as any);

    const req = new Request('http://localhost:3000/api/admin/dashboard/health');
    const res = await getHealth(req);

    expect(res.status).toBe(403);
  });

  it('retorna 200 com payload de saúde quando assertAdminApiAuth autoriza AAL2 em GET /health', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValue({
      ok: true,
      user: { id: 'admin-id' },
    } as any);

    const req = new Request('http://localhost:3000/api/admin/dashboard/health');
    const res = await getHealth(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.health.postgres.status).toBe('healthy');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('executa POST /api/admin/dashboard/rotinas/refresh-health com autorização AAL2', async () => {
    vi.mocked(assertAdminApiAuth).mockResolvedValue({
      ok: true,
      user: { id: 'admin-id' },
    } as any);

    const req = new Request(
      'http://localhost:3000/api/admin/dashboard/rotinas/refresh-health',
      {
        method: 'POST',
      },
    );
    const res = await refreshHealth(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.health.auth.status).toBe('healthy');
  });
});
