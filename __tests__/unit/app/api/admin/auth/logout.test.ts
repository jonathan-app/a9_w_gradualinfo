/**
 * @fileoverview Testes unitários para logout/route.ts
 * @module __tests__/unit/app/api/admin/auth/logout
 * @description Testa a rota POST /api/admin/auth/logout com guarda de acesso, validação de origem, redirecionamento e auditoria.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: vi.fn(() => null),
  getAdminAccessLogoutUrl: vi.fn(() => 'https://example.com/logout'),
}));

vi.mock('@/lib/admin/auth', () => ({
  validateAdminRequestOrigin: vi.fn(() => true),
  resolveSafeRedirectBase: vi.fn(() => 'https://example.com'),
}));

vi.mock('@/lib/admin/audit-service', () => ({
  recordAdminAudit: vi.fn(async () => {}),
}));

vi.mock('@/lib/admin/session-response', () => ({
  createAdminSessionResponse: vi.fn(async () => ({
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        })),
        signOut: vi.fn(async () => ({ error: null })),
      },
    },
    finish: vi.fn((response: Response) => response),
  })),
}));

import { POST } from '@/app/api/admin/auth/logout/route';

describe('POST /api/admin/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 403 quando guarda de acesso falha', async () => {
    const { guardAdminAccess } = await import('@/lib/admin/access-guard');
    vi.mocked(guardAdminAccess).mockReturnValueOnce(
      new Response('Acesso negado', { status: 403 }),
    );

    const request = new Request('http://localhost/api/admin/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://example.com' },
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('retorna 403 quando origem não é válida', async () => {
    const { validateAdminRequestOrigin } = await import('@/lib/admin/auth');
    vi.mocked(validateAdminRequestOrigin).mockReturnValueOnce(false);

    const request = new Request('http://localhost/api/admin/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('redireciona para login com 303 quando não é requisição de API', async () => {
    const request = new Request('http://localhost/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
        accept: 'text/html',
      },
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain(
      '/admin-dashboard/login',
    );
  });

  it('retorna JSON com ok:true quando é requisição de API', async () => {
    const request = new Request('http://localhost/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
        accept: 'application/json',
      },
      duplex: 'half',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('chama recordAdminAudit com dados do usuário quando usuário está autenticado', async () => {
    const { recordAdminAudit } = await import('@/lib/admin/audit-service');
    const request = new Request('http://localhost/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
        accept: 'application/json',
        'cf-connecting-ip': '1.2.3.4',
      },
      duplex: 'half',
    });
    await POST(request);
    expect(recordAdminAudit).toHaveBeenCalledWith({
      actorType: 'admin',
      actorId: 'user-1',
      actorEmail: 'user@example.com',
      actorRole: 'revisor',
      action: 'auth.logout',
      resourceType: 'auth',
      ipAddress: '1.2.3.4',
    });
  });
});
