/**
 * @fileoverview Barreira de autorização anterior às leituras do dashboard.
 * @module __tests__/unit/admin-dashboard-page-auth
 * @description Invoca a página diretamente sem depender da execução do layout pai.
 * @dependencies vitest, app/admin-dashboard/(protegido)/page.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  health: vi.fn(),
  editorial: vi.fn(),
  commercial: vi.fn(),
  metrics: vi.fn(),
  activity: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/auth', () => ({ checkAdminUser: mocks.auth }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  forbidden: () => {
    throw new Error('forbidden');
  },
}));
vi.mock('@/lib/env', () => ({ env: { sanityStudioUrl: '' } }));
vi.mock('@/lib/services/health-dashboard', () => ({
  getDashboardHealthData: mocks.health,
}));
vi.mock('@/lib/services/editorial-dashboard', () => ({
  getEditorialDashboardData: mocks.editorial,
}));
vi.mock('@/lib/services/commercial-dashboard', () => ({
  getCommercialDashboardData: mocks.commercial,
}));
vi.mock('@/lib/services/dashboard-summary', () => ({
  getDashboardMetricSummary: mocks.metrics,
  getDashboardRecentActivity: mocks.activity,
  getDashboardPublicationHistory: () => [],
}));
import Page from '@/app/admin-dashboard/(protegido)/page';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.editorial.mockResolvedValue({ posts: [] });
});
describe('Página autoriza antes de consultar fontes', () => {
  it.each([
    ['unauthenticated', 'redirect:/admin-dashboard/login'],
    ['unauthorized', 'forbidden'],
    ['mfa_enrollment_required', 'redirect:/admin-dashboard/mfa/setup'],
    ['mfa_challenge_required', 'redirect:/admin-dashboard/mfa/verify'],
    ['role_unavailable', 'Autorização administrativa indisponível.'],
    ['config_missing', 'Autorização administrativa indisponível.'],
  ])('recusa %s sem ler dados', async (reason, message) => {
    mocks.auth.mockResolvedValue({ ok: false, reason });
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      message,
    );
    for (const fn of [
      mocks.health,
      mocks.editorial,
      mocks.commercial,
      mocks.metrics,
      mocks.activity,
    ])
      expect(fn).not.toHaveBeenCalled();
  });
  it('recusa falha de admissão antes de consultas', async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'Admissão',
    );
    expect(mocks.commercial).not.toHaveBeenCalled();
  });
  it('carrega as fontes após AAL2 comprovado', async () => {
    mocks.auth.mockResolvedValue({
      ok: true,
      user: { id: 'root' },
      role: 'admin',
      aal: 'aal2',
    });
    await Page({ searchParams: Promise.resolve({}) });
    for (const fn of [
      mocks.health,
      mocks.editorial,
      mocks.commercial,
      mocks.metrics,
      mocks.activity,
    ])
      expect(fn).toHaveBeenCalledTimes(1);
  });
});
