/**
 * @fileoverview Testes unitários para papel/route.ts (atribuição de papéis)
 * @module __tests__/unit/app/api/admin/usuarios/papeis
 * @description Testa POST /api/admin/usuarios/papeis com validação de UUID, papel, conta raiz e atribuição.
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
  assignAdminRole: vi.fn(async () => {}),
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

import { POST } from '@/app/api/admin/usuarios/papeis/route';

const ROOT_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';

describe('POST /api/admin/usuarios/papeis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando corpo não é JSON válido', async () => {
    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'não é json',
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it.each([null, [], 'texto', 42])(
    'recusa corpo JSON sem objeto sem executar RPC: %j',
    async (body) => {
      const { assignAdminRole } = await import('@/lib/admin/roles');
      const response = await POST(
        new Request('http://localhost/api/admin/usuarios/papeis', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      expect(response.status).toBe(400);
      expect(assignAdminRole).not.toHaveBeenCalled();
    },
  );

  it('retorna 400 quando userId não é UUID válido', async () => {
    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'não-é-uuid', role: 'editor' }),
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando papel não é válido', async () => {
    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: OTHER_USER_ID, role: 'superadmin' }),
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('retorna 409 quando tenta modificar conta raiz', async () => {
    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: ROOT_ADMIN_ID, role: 'editor' }),
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it('retorna 200 quando atribuição é bem-sucedida', async () => {
    const { assignAdminRole } = await import('@/lib/admin/roles');
    vi.mocked(assignAdminRole).mockResolvedValueOnce(undefined);

    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: OTHER_USER_ID, role: 'editor' }),
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(assignAdminRole).toHaveBeenCalledWith({
      userId: OTHER_USER_ID,
      role: 'editor',
      actorId: 'actor-1',
      actorEmail: 'actor@example.com',
      ipAddress: null,
    });
  });

  it('retorna 404 quando usuário não existe', async () => {
    const { assignAdminRole } = await import('@/lib/admin/roles');
    vi.mocked(assignAdminRole).mockRejectedValueOnce(
      new (await import('@/lib/admin/roles')).RoleMutationError(
        'Usuário não encontrado',
        'USER_NOT_FOUND',
      ),
    );

    const request = new Request('http://localhost/api/admin/usuarios/papeis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-4000-8000-000000000003',
        role: 'editor',
      }),
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
