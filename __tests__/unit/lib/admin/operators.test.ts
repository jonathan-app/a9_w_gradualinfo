/**
 * @fileoverview Testes unitarios do servico de listagem de operadores.
 * @module __tests__/unit/lib/admin/operators
 * @description Trava a autorizacao dentro do servico, que usa o cliente
 *   `service_role` e por isso nao pode depender da guarda do chamador, e o
 *   mapeamento da RPC (raiz, operadores e metadados de paginacao).
 * @dependencies vitest, @/lib/admin/operators, @/lib/admin/service-client
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  checkAdminUser: vi.fn(async () => ({
    ok: true,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'raiz@exemplo.dev',
    },
    role: 'admin',
    aal: 'aal2',
  })),
  // Mesma hierarquia de `lib/admin/auth`: admin atende tudo, editor atende
  // editor e revisor, revisor atende apenas revisor.
  roleSatisfies: vi.fn((actual: string, required: string) => {
    const order: Record<string, number> = { revisor: 1, editor: 2, admin: 3 };
    return (order[actual] ?? 0) >= (order[required] ?? 99);
  }),
}));

vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '00000000-0000-4000-8000-000000000001',
    adminEmail: 'raiz@exemplo.dev',
  },
}));

import { listAdminOperadores } from '@/lib/admin/operators';
import { getAdminServiceClient } from '@/lib/admin/service-client';

const ROOT_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const OPERADOR_ID = '00000000-0000-4000-8000-000000000002';

function mockClient(rows: unknown[]) {
  const rpc = vi.fn(async () => ({ data: rows, error: null }));
  vi.mocked(getAdminServiceClient).mockReturnValue({ rpc } as never);
  return rpc;
}

describe('listAdminOperadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa editor e revisor antes de tocar no banco', async () => {
    const rpc = mockClient([]);

    await expect(
      listAdminOperadores({ page: 1, limit: 20, actorRole: 'editor' }),
    ).rejects.toThrow(/admin/);
    await expect(
      listAdminOperadores({ page: 1, limit: 20, actorRole: 'revisor' }),
    ).rejects.toThrow(/admin/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('admin lista com paginacao e destaca a conta raiz', async () => {
    const rpc = mockClient([
      {
        user_id: OPERADOR_ID,
        email: 'ana@exemplo.dev',
        role: 'editor',
        assigned_at: '2026-10-20T10:00:00Z',
        total_count: '21',
      },
    ]);

    const result = await listAdminOperadores({
      page: 2,
      limit: 20,
      actorRole: 'admin',
    });

    expect(rpc).toHaveBeenCalledWith('list_admin_operadores', {
      p_root_id: ROOT_ADMIN_ID,
      p_limit: 20,
      p_offset: 20,
    });
    expect(result.root).toEqual({
      userId: ROOT_ADMIN_ID,
      email: 'raiz@exemplo.dev',
      role: 'admin',
      assignedAt: null,
      isRoot: true,
    });
    expect(result.operadores).toEqual([
      {
        userId: OPERADOR_ID,
        email: 'ana@exemplo.dev',
        role: 'editor',
        assignedAt: '2026-10-20T10:00:00Z',
      },
    ]);
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
  });

  it('pagina alem do fim devolve lista vazia e total zero', async () => {
    mockClient([]);

    const result = await listAdminOperadores({
      page: 99,
      limit: 20,
      actorRole: 'admin',
    });

    expect(result.operadores).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('falha da RPC vira erro generico, sem vazar detalhe do banco', async () => {
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: new Error('relation "auth.users" does not exist'),
      })),
    } as never);

    await expect(
      listAdminOperadores({ page: 1, limit: 20, actorRole: 'admin' }),
    ).rejects.toThrow('Falha ao listar operadores administrativos.');
  });
});
