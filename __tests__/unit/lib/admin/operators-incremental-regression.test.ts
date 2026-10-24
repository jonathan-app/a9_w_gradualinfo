/**
 * @fileoverview Regressões da listagem administrativa compartilhada.
 * @module tests/operators-incremental-regression
 * @description Testa sentinela SQL, autorização real e paginação sem depender de banco remoto.
 * @dependencies vitest, lib/admin/operators.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/admin/auth', () => ({
  checkAdminUser: m.auth,
  roleSatisfies: (actual: string, required: string) => actual === required,
}));
vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: m.client,
}));
vi.mock('@/lib/env', () => ({
  env: { adminUserId: 'ROOT', adminEmail: 'root@example.test' },
}));
import { listAdminOperadores } from '@/lib/admin/operators';
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({
    ok: true,
    role: 'admin',
    aal: 'aal2',
    user: { id: 'root' },
  });
  m.client.mockReturnValue({ rpc: m.rpc });
});
describe('Listagem de operadores', () => {
  it('descarta a sentinela nula mas preserva total em página fora do fim', async () => {
    m.rpc.mockResolvedValue({
      data: [
        {
          user_id: null,
          email: null,
          role: null,
          assigned_at: null,
          total_count: '23',
        },
      ],
      error: null,
    });
    const r = await listAdminOperadores({
      page: 5,
      limit: 20,
      actorRole: 'admin',
    });
    expect(r.operadores).toEqual([]);
    expect(r.meta.total).toBe(23);
    expect(r.meta.totalPages).toBe(2);
  });
  it('lista realmente vazia preserva total zero e raiz separada', async () => {
    m.rpc.mockResolvedValue({
      data: [
        {
          user_id: null,
          email: null,
          role: null,
          assigned_at: null,
          total_count: '0',
        },
      ],
      error: null,
    });
    const r = await listAdminOperadores({
      page: 1,
      limit: 20,
      actorRole: 'admin',
    });
    expect(r.operadores).toEqual([]);
    expect(r.meta.total).toBe(0);
    expect(r.root?.userId).toBe('root');
  });
  it('projeta somente campos permitidos dos operadores', async () => {
    m.rpc.mockResolvedValue({
      data: [
        {
          user_id: 'other',
          email: 'other@example.test',
          role: 'editor',
          assigned_at: null,
          total_count: '1',
          internal: 'not returned',
        },
      ],
      error: null,
    });
    expect(
      (await listAdminOperadores({ page: 1, limit: 20, actorRole: 'admin' }))
        .operadores,
    ).toEqual([
      {
        userId: 'other',
        email: 'other@example.test',
        role: 'editor',
        assignedAt: null,
      },
    ]);
  });
  it.each([
    { ok: false, reason: 'unauthenticated' },
    { ok: false, reason: 'mfa_challenge_required' },
    { ok: true, role: 'editor' },
    { ok: true, role: 'revisor' },
  ])('não confia no papel admin passado pelo chamador: %j', async (auth) => {
    m.auth.mockResolvedValue(auth);
    await expect(
      listAdminOperadores({ page: 1, limit: 20, actorRole: 'admin' }),
    ).rejects.toThrow();
    expect(m.client).not.toHaveBeenCalled();
  });
  it('recusa falha de Access antes de criar cliente privilegiado', async () => {
    m.auth.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      listAdminOperadores({ page: 1, limit: 20, actorRole: 'admin' }),
    ).rejects.toThrow();
    expect(m.client).not.toHaveBeenCalled();
  });
  it.each([
    { page: 0, limit: 20 },
    { page: 1.5, limit: 20 },
    { page: 1, limit: 51 },
    { page: 1, limit: 0 },
    { page: 2147483648, limit: 20 },
  ])('recusa paginação fora do contrato: %j', async (params) => {
    await expect(
      listAdminOperadores({ ...params, actorRole: 'admin' }),
    ).rejects.toThrow();
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
