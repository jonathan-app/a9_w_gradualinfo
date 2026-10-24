/**
 * @fileoverview Regressões dos dados operacionais do painel.
 * @module __tests__/unit/lib/services/dashboard-summary
 * @description Recusa dados fictícios e restringe auditoria conforme o operador.
 * @dependencies vitest, lib/services/dashboard-summary.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  client: vi.fn(),
  editorial: vi.fn(),
  commercial: vi.fn(),
}));
vi.mock('@/lib/admin/auth', () => ({ checkAdminUser: mocks.auth }));
vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: mocks.client,
}));
vi.mock('@/lib/env', () => ({ env: { adminUserId: 'root' } }));
vi.mock('@/lib/services/editorial-dashboard', () => ({
  getEditorialDashboardData: mocks.editorial,
}));
vi.mock('@/lib/services/commercial-dashboard', () => ({
  getCommercialDashboardData: mocks.commercial,
}));
import {
  getDashboardMetricSummary,
  getDashboardPublicationHistory,
  getDashboardRecentActivity,
} from '@/lib/services/dashboard-summary';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    ok: true,
    user: { id: 'root' },
    role: 'admin',
    aal: 'aal2',
  });
  mocks.client.mockReturnValue(null);
  mocks.editorial.mockResolvedValue({
    status: 'empty',
    totalPosts: 0,
    posts: [],
  });
  mocks.commercial.mockResolvedValue({
    status: 'empty',
    totalOffers: 0,
    offers: [],
  });
});
function query(result: object) {
  const q: any = {};
  for (const name of ['from', 'select', 'eq', 'order'])
    q[name] = vi.fn(() => q);
  q.neq = vi.fn(async () => result);
  q.limit = vi.fn(async () => result);
  return q;
}
describe('Dados verdadeiros do painel', () => {
  it('preserva zero confirmado e não inventa analytics ou variações', async () => {
    expect(await getDashboardMetricSummary()).toEqual({
      totalArticles: 0,
      activeOffers: 0,
      registeredUsers: null,
      totalViews: null,
      articlesGrowth: null,
      viewsGrowth: null,
      offersGrowth: null,
      usersGrowth: null,
    });
  });
  it('fonte indisponível não aparece como zero confirmado', async () => {
    mocks.editorial.mockResolvedValue({
      status: 'error',
      totalPosts: 0,
      posts: [],
    });
    mocks.commercial.mockResolvedValue({
      status: 'unconfigured',
      totalOffers: 0,
      offers: [],
    });
    const result = await getDashboardMetricSummary();
    expect(result.totalArticles).toBeNull();
    expect(result.activeOffers).toBeNull();
  });
  it('não arredonda contagens reais para mínimos do mockup', async () => {
    mocks.editorial.mockResolvedValue({ status: 'configured', totalPosts: 2 });
    mocks.commercial.mockResolvedValue({
      status: 'configured',
      totalOffers: 1,
    });
    const q = query({ count: 0, error: null });
    mocks.client.mockReturnValue(q);
    const result = await getDashboardMetricSummary();
    expect(result.totalArticles).toBe(2);
    expect(result.activeOffers).toBe(1);
    expect(result.registeredUsers).toBe(1);
    expect(q.neq).toHaveBeenCalledWith('user_id', 'root');
  });
  it('recusa consulta agregada antes de acessar as fontes se não autorizado', async () => {
    mocks.auth.mockResolvedValue({ ok: false, reason: 'unauthenticated' });
    await expect(getDashboardMetricSummary()).rejects.toThrow();
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.editorial).not.toHaveBeenCalled();
    expect(mocks.commercial).not.toHaveBeenCalled();
  });
  it('não entrega contagem privilegiada de operadores ao editor', async () => {
    mocks.auth.mockResolvedValue({
      ok: true,
      user: { id: 'editor' },
      role: 'editor',
      aal: 'aal2',
    });
    expect((await getDashboardMetricSummary()).registeredUsers).toBeNull();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('não produz uma série temporal sem fonte', () => {
    expect(getDashboardPublicationHistory()).toEqual([]);
  });
});
describe('Trilha de auditoria', () => {
  it('não cria atividades quando não há serviço nem eventos', async () => {
    expect(await getDashboardRecentActivity()).toEqual([]);
    mocks.client.mockReturnValue(query({ data: [], error: null }));
    expect(await getDashboardRecentActivity()).toEqual([]);
  });
  it('recusa sessão sem papel sem consultar o serviço privilegiado', async () => {
    mocks.auth.mockResolvedValue({ ok: false, reason: 'unauthorized' });
    expect(await getDashboardRecentActivity()).toEqual([]);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it.each(['editor', 'revisor'])(
    'restringe %s aos próprios eventos concluídos',
    async (role) => {
      mocks.auth.mockResolvedValue({
        ok: true,
        user: { id: 'operator' },
        role,
        aal: 'aal2',
      });
      const q = query({
        data: [
          {
            id: 'event',
            action: 'auth.login',
            resource_type: 'auth',
            resource_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      mocks.client.mockReturnValue(q);
      const events = await getDashboardRecentActivity();
      expect(q.eq).toHaveBeenCalledWith('status', 'success');
      expect(q.eq).toHaveBeenCalledWith('actor_id', 'operator');
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('security');
      expect(q.limit).toHaveBeenCalledWith(5);
    },
  );
  it('administrador consulta eventos concluídos sem filtro de outro ator', async () => {
    const q = query({ data: [], error: null });
    mocks.client.mockReturnValue(q);
    await getDashboardRecentActivity();
    expect(q.eq).toHaveBeenCalledTimes(1);
    expect(q.eq).toHaveBeenCalledWith('status', 'success');
  });
  it('erro de infraestrutura não vira uma atividade de sucesso', async () => {
    mocks.client.mockImplementation(() => {
      throw new Error('indisponível');
    });
    expect(await getDashboardRecentActivity()).toEqual([]);
  });
});
