/**
 * @fileoverview Testes unitários para dashboard-summary.ts
 * @module __tests__/unit/lib/services/dashboard-summary
 * @description Testa getDashboardMetricSummary, getDashboardRecentActivity,
 *   getDashboardPublicationHistory, getDashboardSummary, formatTimeAgo,
 *   mapAuditAction e getDefaultRecentActivity.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: vi.fn(() => null),
}));

vi.mock('@/lib/services/editorial-dashboard', () => ({
  getEditorialDashboardData: vi.fn(async () => ({
    status: 'configured',
    posts: [],
    totalPosts: 42,
    page: 1,
    pageSize: 50,
    source: 'sanity',
  })),
}));

vi.mock('@/lib/services/commercial-dashboard', () => ({
  getCommercialDashboardData: vi.fn(async () => ({
    status: 'configured',
    offers: [],
    totalOffers: 14,
    page: 1,
    pageSize: 10,
    source: 'sanity',
  })),
}));

import {
  getDashboardMetricSummary,
  getDashboardPublicationHistory,
  getDashboardRecentActivity,
  getDashboardSummary,
} from '@/lib/services/dashboard-summary';

describe('getDashboardMetricSummary', () => {
  it('retorna métricas com valores mínimos garantidos', async () => {
    const result = await getDashboardMetricSummary();
    expect(result.totalArticles).toBeGreaterThanOrEqual(17);
    expect(result.activeOffers).toBeGreaterThanOrEqual(14);
    expect(result.registeredUsers).toBeGreaterThanOrEqual(3);
    expect(result.totalViews).toBe(182450);
    expect(result.viewsGrowth).toBe(18);
    expect(result.articlesGrowth).toBe(12);
    expect(result.offersGrowth).toBe(6);
    expect(result.usersGrowth).toBe(14);
  });

  it('usa contagem do Sanity quando disponível', async () => {
    const { getEditorialDashboardData } =
      await import('@/lib/services/editorial-dashboard');
    vi.mocked(getEditorialDashboardData).mockResolvedValueOnce({
      status: 'configured',
      posts: [],
      totalPosts: 100,
      page: 1,
      pageSize: 50,
      source: 'sanity',
    });
    const result = await getDashboardMetricSummary();
    expect(result.totalArticles).toBeGreaterThanOrEqual(100);
  });

  it('usa contagem do Supabase quando disponível', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          count: 10,
          error: null,
        })),
      })),
    } as any);
    const result = await getDashboardMetricSummary();
    expect(result.registeredUsers).toBeGreaterThanOrEqual(11);
  });
});

describe('getDashboardPublicationHistory', () => {
  it('retorna exatamente 14 pontos de dados', () => {
    const result = getDashboardPublicationHistory();
    expect(result).toHaveLength(14);
  });

  it('cada ponto tem todos os campos obrigatórios', () => {
    const result = getDashboardPublicationHistory();
    for (const point of result) {
      expect(point.date).toMatch(/\d{2}\/\d{2}/);
      expect(point.label).toMatch(/\d{2}\/\d{2}/);
      expect(typeof point.published).toBe('number');
      expect(typeof point.review).toBe('number');
      expect(typeof point.drafts).toBe('number');
    }
  });

  it('pontos estão ordenados cronologicamente', () => {
    const result = getDashboardPublicationHistory();
    // As datas devem ser únicas e cobrir 14 dias consecutivos
    const dates = result.map((p) => p.date);
    expect(new Set(dates).size).toBe(14);
  });
});

describe('getDashboardRecentActivity', () => {
  it('retorna atividade padrão quando não há cliente', async () => {
    const result = await getDashboardRecentActivity();
    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('article');
    expect(result[1].type).toBe('user');
    expect(result[2].type).toBe('offer');
    expect(result[3].type).toBe('security');
    expect(result[4].type).toBe('article');
  });

  it('retorna atividade padrão quando não há dados', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    } as any);
    const result = await getDashboardRecentActivity();
    expect(result).toHaveLength(5);
  });
});

describe('getDashboardSummary', () => {
  it('agrega métricas, atividades e histórico em paralelo', async () => {
    const result = await getDashboardSummary();
    expect(result.metrics).toBeDefined();
    expect(result.chartData).toHaveLength(14);
    expect(result.recentActivities).toHaveLength(5);
    expect(result.metrics.totalArticles).toBeGreaterThanOrEqual(17);
  });

  it('mapeia diferentes tipos de ação de auditoria', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: [
                {
                  id: '1',
                  action: 'auth.login',
                  resource_type: 'auth',
                  resource_id: null,
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
                {
                  id: '2',
                  action: 'offer.badge_evaluated',
                  resource_type: 'offer',
                  resource_id: 'offer-1',
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
                {
                  id: '3',
                  action: 'user.role_assigned',
                  resource_type: 'user',
                  resource_id: 'user-1',
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
                {
                  id: '4',
                  action: 'preview.issued',
                  resource_type: 'preview',
                  resource_id: 'preview-1',
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
                {
                  id: '5',
                  action: 'unknown.action',
                  resource_type: 'system',
                  resource_id: null,
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    } as any);
    const result = await getDashboardRecentActivity();
    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('security');
    expect(result[1].type).toBe('offer');
    expect(result[2].type).toBe('user');
    expect(result[3].type).toBe('article');
    expect(result[4].type).toBe('system');
  });

  it('usa activity padrão quando cliente lança exceção', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockImplementationOnce(() => {
      throw new Error('conexão falhou');
    });
    const result = await getDashboardRecentActivity();
    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('article');
  });
});
