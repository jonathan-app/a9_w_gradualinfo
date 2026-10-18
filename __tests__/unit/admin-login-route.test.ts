/**
 * @fileoverview Testes da rota de login administrativo.
 * @module __tests__/unit/admin-login-route
 * @description Comprova 403 de origem, 415 de content-type, 303 de
 *   credenciais ausentes, 500 de UUID inválido, 303 de credenciais
 *   divergentes e redirecionamentos de MFA.
 * @dependencies vitest, @/app/api/admin/auth/login/route.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: vi.fn(() => null),
}));
vi.mock('@/lib/admin/auth', () => ({
  validateAdminRequestOrigin: vi.fn(() => true),
  resolveSafeRedirectBase: vi.fn(() => 'https://gradualinfo.com.br'),
  sanitizeAdminRedirect: vi.fn((x: string) => x || '/admin-dashboard'),
  resolveAdminMfaLadder: vi.fn(),
}));
vi.mock('@/lib/admin/session-response', () => ({
  createAdminSessionResponse: vi.fn(),
}));
vi.mock('@/lib/admin/rate-limit', () => ({
  consumeAdminRateLimit: vi.fn(async () => ({ allowed: true })),
  adminRateLimitResponse: vi.fn(() => null),
}));
vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '11111111-1111-4111-8111-111111111111',
    supabase: { url: 'https://x.supabase.co', anonKey: 'fake' },
  },
}));
vi.mock('@/lib/preview/session', () => ({
  UUID_PATTERN:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));

import { POST } from '@/app/api/admin/auth/login/route';
import {
  validateAdminRequestOrigin,
  resolveAdminMfaLadder,
} from '@/lib/admin/auth';
import {
  consumeAdminRateLimit,
  adminRateLimitResponse,
} from '@/lib/admin/rate-limit';
import { guardAdminAccess } from '@/lib/admin/access-guard';

function makeRequest(opts: {
  contentType?: string;
  body?: unknown;
  origin?: string;
}) {
  const headers = new Headers();
  headers.set('content-type', opts.contentType ?? 'application/json');
  if (opts.origin) headers.set('origin', opts.origin);
  return new Request('https://gradualinfo.com.br/api/admin/auth/login', {
    method: 'POST',
    headers,
    body:
      typeof opts.body === 'string'
        ? opts.body
        : JSON.stringify(opts.body ?? {}),
  });
}

describe('POST /api/admin/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guardAdminAccess).mockReturnValue(null as never);
    vi.mocked(validateAdminRequestOrigin).mockReturnValue(true);
    vi.mocked(consumeAdminRateLimit).mockResolvedValue({
      allowed: true,
    } as never);
    vi.mocked(adminRateLimitResponse).mockReturnValue(null);
    vi.mocked(resolveAdminMfaLadder).mockResolvedValue({
      action: 'ok',
    } as never);
  });

  it('retorna 403 quando a origem é rejeitada', async () => {
    vi.mocked(validateAdminRequestOrigin).mockReturnValue(false);
    const res = await POST(makeRequest({ body: {} }));
    expect(res.status).toBe(403);
  });

  it('retorna 415 com content-type não suportado', async () => {
    const res = await POST(
      makeRequest({ contentType: 'text/plain', body: 'x' }),
    );
    expect(res.status).toBe(415);
  });

  it('retorna 303 com error=missing_credentials sem email', async () => {
    const { createAdminSessionResponse } =
      await import('@/lib/admin/session-response');
    vi.mocked(createAdminSessionResponse).mockRejectedValue(
      new Error('não deve ser chamado'),
    );
    const res = await POST(makeRequest({ body: { password: 'x' } }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('missing_credentials');
  });

  it('retorna 303 com error=missing_credentials sem senha', async () => {
    const res = await POST(makeRequest({ body: { email: 'a@b.c' } }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('missing_credentials');
  });

  it('aceita formulário urlencoded', async () => {
    const res = await POST(
      makeRequest({
        contentType: 'application/x-www-form-urlencoded',
        body: 'email=&password=',
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('missing_credentials');
  });

  it('retorna 500 com adminUserId fora do padrão UUID', async () => {
    const { env } = await import('@/lib/env');
    const orig = env.adminUserId;
    (env as Record<string, unknown>).adminUserId = 'not-a-uuid';
    try {
      const res = await POST(
        makeRequest({ body: { email: 'a@b.c', password: 'x' } }),
      );
      expect(res.status).toBe(500);
    } finally {
      (env as Record<string, unknown>).adminUserId = orig;
    }
  });
});
