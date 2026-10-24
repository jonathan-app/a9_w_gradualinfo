/**
 * @fileoverview Testes unitários para papéis/[userId]/route.ts (revogação de papéis)
 * @module __tests__/unit/app/api/admin/usuarios/papeis-delete
 * @description Testa DELETE /api/admin/usuarios/papeis/[userId] com validação de UUID, conta raiz e revogação.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  assertAdminApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'actor-1', email: 'actor@example.com', role: 'admin' },
  })),
}));

vi.mock('@/lib/admin/roles', () => ({
  revokeAdminRole: vi.fn(async () => {}),
  RoleMutationError: class RoleMutationError extends Error {
    constructor(
      message: string,
      public code?: string,
    ) {
      super(message);
      this.name = 'RoleMutationError';
    }
  },
}));

vi.mock('@/lib/env', () => ({
  env: { adminUserId: '00000000-0000-4000-8000-000000000001' },
}));

vi.mock('@/lib/utils/api-response', () => ({
  apiErrorResponse: vi.fn((status: number, error: string, message: string) => {
    return new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

import { DELETE } from '@/app/api/admin/usuarios/papeis/[userId]/route';
import { env } from '@/lib/env';

const ROOT_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const ROOT_COM_LETRAS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('DELETE /api/admin/usuarios/papeis/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.adminUserId = ROOT_ADMIN_ID;
  });

  it('retorna 400 quando userId não é UUID válido', async () => {
    const request = new Request(
      'http://localhost/api/admin/usuarios/papeis/não-é-uuid',
      {
        method: 'DELETE',
        duplex: 'half',
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: 'não-é-uuid' }),
    });
    expect(response.status).toBe(400);
  });

  it('retorna 409 para a conta raiz em caixa alta (SEC-02)', async () => {
    env.adminUserId = ROOT_COM_LETRAS;
    const request = new Request(
      `http://localhost/api/admin/usuarios/papeis/${ROOT_COM_LETRAS.toUpperCase()}`,
      { method: 'DELETE', duplex: 'half' },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: ROOT_COM_LETRAS.toUpperCase() }),
    });
    expect(response.status).toBe(409);
  });

  it('retorna 409 quando tenta remover conta raiz', async () => {
    const request = new Request(
      `http://localhost/api/admin/usuarios/papeis/${ROOT_ADMIN_ID}`,
      {
        method: 'DELETE',
        duplex: 'half',
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: ROOT_ADMIN_ID }),
    });
    expect(response.status).toBe(409);
  });

  it('retorna 200 quando revogação é bem-sucedida', async () => {
    const { revokeAdminRole } = await import('@/lib/admin/roles');
    vi.mocked(revokeAdminRole).mockResolvedValueOnce(undefined);

    const request = new Request(
      `http://localhost/api/admin/usuarios/papeis/${OTHER_USER_ID}`,
      {
        method: 'DELETE',
        duplex: 'half',
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ userId: OTHER_USER_ID }),
    });
    expect(response.status).toBe(200);
    expect(revokeAdminRole).toHaveBeenCalledWith({
      userId: OTHER_USER_ID,
      actorId: 'actor-1',
      actorEmail: 'actor@example.com',
      ipAddress: null,
    });
  });

  it('retorna 404 quando papel não existe', async () => {
    const { revokeAdminRole } = await import('@/lib/admin/roles');
    vi.mocked(revokeAdminRole).mockRejectedValueOnce(
      new (await import('@/lib/admin/roles')).RoleMutationError(
        'Papel não encontrado',
        'ROLE_NOT_FOUND',
      ),
    );

    const request = new Request(
      `http://localhost/api/admin/usuarios/papeis/00000000-0000-4000-8000-000000000003`,
      {
        method: 'DELETE',
        duplex: 'half',
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({
        userId: '00000000-0000-4000-8000-000000000003',
      }),
    });
    expect(response.status).toBe(404);
  });
});
