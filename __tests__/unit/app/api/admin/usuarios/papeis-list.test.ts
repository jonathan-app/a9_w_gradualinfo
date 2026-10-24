/**
 * @fileoverview Testes unitários para listagem de papeis (GET)
 * @module __tests__/unit/app/api/admin/usuarios/papeis-list
 * @description Testa GET /api/admin/usuarios/papeis: validacao de paginacao, conta raiz destacada, e-mail via service_role e erros de parametro.
 */

import { describe, expect, it, vi } from 'vitest';
import { getAdminServiceClient } from '@/lib/admin/service-client';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  checkAdminUser: vi.fn(async () => ({
    ok: true,
    user: { id: 'actor-1', email: 'actor@example.com' },
    role: 'admin',
    aal: 'aal2',
  })),
  assertAdminApiAuth: vi.fn(async () => ({
    ok: true,
    user: { id: 'actor-1', email: 'actor@example.com' },
    role: 'admin',
  })),
  // O serviço de operadores confere o papel por conta própria (cliente
  // service_role ignora RLS); o mock precisa refletir a hierarquia real.
  roleSatisfies: vi.fn(
    (actual: string, required: string) =>
      actual === 'admin' || actual === required,
  ),
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

vi.mock('@/lib/utils/api-response', () => ({
  apiErrorResponse: vi.fn((status: number, error: string, message: string) => {
    return new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

const ROOT_ADMIN_ID = '00000000-0000-4000-8000-000000000001';

function rpcMock(rows: unknown[]) {
  vi.mocked(getAdminServiceClient).mockReturnValue({
    rpc: vi.fn(async () => ({ data: rows, error: null })),
  } as never);
}

describe('GET /api/admin/usuarios/papeis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa com 403 quando a guarda de admin nega e nao chama a RPC', async () => {
    const { assertAdminApiAuth } = await import('@/lib/admin/auth');
    vi.mocked(assertAdminApiAuth).mockResolvedValueOnce({
      ok: false,
      response: new Response('Acesso negado.', { status: 403 }),
    });
    rpcMock([]);

    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis'),
    );
    const client = getAdminServiceClient();
    const rpc = vi.mocked(client.rpc);

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o parametro page se repete', async () => {
    rpcMock([]);
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis?page=1&page=2'),
    );
    expect(response.status).toBe(400);
  });

  it('retorna 200 com raiz destacada e operadores paginados', async () => {
    rpcMock([
      {
        user_id: '00000000-0000-4000-8000-000000000002',
        email: 'ana@exemplo.dev',
        role: 'editor',
        assigned_at: '2026-10-20T10:00:00Z',
        total_count: 1,
      },
    ]);

    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const request = new Request(
      'http://localhost/api/admin/usuarios/papeis?page=1&limit=20',
    );
    const response = await GET(request);
    const body = (await response.json()) as {
      root: unknown;
      operadores: unknown[];
      meta: { total: number; totalPages: number };
    };

    expect(response.status).toBe(200);
    expect(body.root).toEqual({
      userId: ROOT_ADMIN_ID,
      email: 'raiz@exemplo.dev',
      role: 'admin',
      assignedAt: null,
      isRoot: true,
    });
    expect(body.operadores).toHaveLength(1);
    expect(body.operadores[0]).toEqual({
      userId: '00000000-0000-4000-8000-000000000002',
      email: 'ana@exemplo.dev',
      role: 'editor',
      assignedAt: '2026-10-20T10:00:00Z',
    });
    expect(body.meta.total).toBe(1);
    expect(body.meta.totalPages).toBe(1);
  });

  it('usa valores defaults page=1 e limit=20 quando ausentes', async () => {
    rpcMock([]);
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    await GET(new Request('http://localhost/api/admin/usuarios/papeis'));
    const client = getAdminServiceClient();
    const rpc = vi.mocked(client.rpc);
    expect(rpc).toHaveBeenCalledWith('list_admin_operadores', {
      p_root_id: ROOT_ADMIN_ID,
      p_limit: 20,
      p_offset: 0,
    });
  });

  it('retorna 400 quando limit acima de 50', async () => {
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis?limit=100'),
    );
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando page e zero ou negativo', async () => {
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis?page=0'),
    );
    expect(response.status).toBe(400);
  });

  it('retorna 400 quando page ou limit fracionarios', async () => {
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const respPage = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis?page=1.5'),
    );
    const respLimit = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis?limit=2.5'),
    );
    expect(respPage.status).toBe(400);
    expect(respLimit.status).toBe(400);
  });

  it('retorna 400 quando page excede o limite maximo suportado (offset > 2147483647)', async () => {
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request(
        'http://localhost/api/admin/usuarios/papeis?page=200000000&limit=20',
      ),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_page');
    expect(body.message).toBe('Pagina excede o limite maximo suportado.');
  });

  it('retorna 400 quando page nao e um inteiro seguro em JavaScript', async () => {
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request(
        'http://localhost/api/admin/usuarios/papeis?page=999999999999999999999',
      ),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_page');
  });

  it('retorna 200 com operadores vazio e total correto quando pagina alem do fim', async () => {
    rpcMock([]);
    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request(
        'http://localhost/api/admin/usuarios/papeis?page=99&limit=20',
      ),
    );
    const body = (await response.json()) as {
      operadores: unknown[];
      meta: { total: number };
    };
    expect(response.status).toBe(200);
    expect(body.operadores).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('retorna 503 sanitizado quando a RPC de listagem falha sem vazar detalhes internos', async () => {
    rpcMock([]);
    const client = getAdminServiceClient();
    vi.mocked(client.rpc).mockResolvedValueOnce({
      data: null,
      error: new Error('relation "auth.users" does not exist'),
    });

    const { GET } = await import('@/app/api/admin/usuarios/papeis/route');
    const response = await GET(
      new Request('http://localhost/api/admin/usuarios/papeis'),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('role_list_failed');
    expect(body.message).toBe('Falha ao listar operadores administrativos.');
    const texto = JSON.stringify(body);
    expect(texto).not.toContain('auth.users');
    expect(texto).not.toContain('relation');
  });
});
