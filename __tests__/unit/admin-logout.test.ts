// @vitest-environment node
/**
 * @fileoverview Testes unitários do endpoint de logout administrativo (spec 0007).
 * @module __tests__/unit/admin-logout.test
 * @description Comprova o encerramento seguro da sessão administrativa:
 *   - Validação estrita de CSRF (bloqueio 403 para origens desconhecidas);
 *   - Resposta JSON { ok: true } para chamadas de API (Accept: application/json / sec-fetch-mode: cors);
 *   - Resposta HTTP 303 com redirecionamento para /admin-dashboard/login em requisições de formulário;
 *   - Propagação correta da invalidação de sessão e exclusão do cookie __e2e_session_role.
 * @dependencies vitest, app/api/admin/auth/logout/route.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/admin/auth/logout/route';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/audit-service', () => ({
  recordAdminAudit: vi.fn(),
}));

const signOutMock = vi.fn().mockResolvedValue({ error: null });
const getUserMock = vi
  .fn()
  .mockResolvedValue({ data: { user: null }, error: null });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
    },
  })),
}));

const mockCookies = {
  getAll: vi
    .fn()
    .mockReturnValue([{ name: 'sb-auth-token', value: 'token-abc' }]),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: async () => mockCookies,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));

describe('POST /api/admin/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita com 403 requisições com origem não autorizada (proteção CSRF)', async () => {
    const request = new Request(
      'https://gradualinfo.com.br/api/admin/auth/logout',
      {
        method: 'POST',
        headers: {
          origin: 'https://site-atacante.evil.com',
        },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Origem não permitida.');
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('encerra sessão e retorna JSON 200 { ok: true } quando chamado via API', async () => {
    const request = new Request(
      'https://gradualinfo.com.br/api/admin/auth/logout',
      {
        method: 'POST',
        headers: {
          origin: 'https://gradualinfo.com.br',
          accept: 'application/json',
        },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      ok: true,
      accessLogoutUrl: 'https://admin.example.test/cdn-cgi/access/logout',
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    const deletedCookie = response.cookies.get('__e2e_session_role');
    expect(deletedCookie?.value).toBe('');
  });

  it('encerra sessão e retorna 303 com redirecionamento quando submetido por formulário HTML', async () => {
    const request = new Request(
      'https://gradualinfo.com.br/api/admin/auth/logout',
      {
        method: 'POST',
        headers: {
          origin: 'https://gradualinfo.com.br',
          'content-type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(303);
    const location = response.headers.get('location');
    expect(location).toBe(
      'https://gradualinfo.com.br/admin-dashboard/login?signedOut=1',
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
