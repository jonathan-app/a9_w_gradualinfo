// @vitest-environment node
/**
 * @fileoverview Regressões do contrato de matrícula explícita.
 * @module __tests__/unit/admin-mfa-enrollment
 * @description Cobre GET sem escrita, parsing, sessão, conflitos e operações tardias.
 * @dependencies Vitest, handlers administrativos e página setup com SDK simulado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextResponse } from 'next/server';
const state = vi.hoisted(() => ({
  id: '11111111-1111-4111-8111-111111111111',
  user: vi.fn(),
  aal: vi.fn(),
  factors: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  env: { adminUserId: state.id, isProduction: true },
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://example.invalid',
}));
vi.mock('@/lib/admin/rate-limit', () => ({
  consumeAdminRateLimit: async () => ({ status: 200 }),
  adminRateLimitResponse: () => null,
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: state.user,
      mfa: {
        getAuthenticatorAssuranceLevel: state.aal,
        listFactors: state.factors,
        enroll: state.enroll,
        challengeAndVerify: state.challenge,
      },
    },
  }),
}));
vi.mock('@/lib/admin/session-response', async () => {
  const { createClient } = await import('@/lib/supabase/server');
  return {
    createAdminSessionResponse: async () => ({
      supabase: await createClient(),
      finish: (response: NextResponse) => {
        response.cookies.set('fixture-session', 'synthetic', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        });
        return response;
      },
    }),
  };
});
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
import { POST } from '@/app/api/admin/auth/mfa/enroll/route';
import { POST as verify } from '@/app/api/admin/auth/mfa/verify/route';
import Setup from '@/app/admin-dashboard/mfa/setup/page';

function request(
  body = '{}',
  origin = 'https://example.invalid',
  contentType = 'application/json',
) {
  return new Request('https://example.invalid/api/admin/auth/mfa/enroll', {
    method: 'POST',
    headers: { origin, 'content-type': contentType },
    body,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  state.user.mockResolvedValue({
    data: { user: { id: state.id } },
    error: null,
  });
  state.aal.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    error: null,
  });
  state.factors.mockResolvedValue({ data: { all: [] }, error: null });
  state.enroll.mockResolvedValue({
    data: {
      id: 'fixture-factor',
      totp: {
        secret: 'synthetic',
        uri: 'synthetic-uri',
        qr_code: '<svg></svg>',
      },
    },
    error: null,
  });
  state.challenge.mockResolvedValue({ error: null });
});
afterEach(() => vi.useRealTimers());

describe('matrícula MFA explícita', () => {
  it('duas renderizações GET não matriculam nem desafiam', async () => {
    await Setup({ searchParams: Promise.resolve({}) });
    await Setup({ searchParams: Promise.resolve({}) });
    expect(state.enroll).not.toHaveBeenCalled();
    expect(state.challenge).not.toHaveBeenCalled();
  });
  it('recusa origem antes de consultar identidade', async () => {
    expect((await POST(request('{}', 'https://hostile.invalid'))).status).toBe(
      403,
    );
    expect(state.user).not.toHaveBeenCalled();
  });
  it('recusa UUID divergente antes da matrícula', async () => {
    state.user.mockResolvedValue({ data: { user: { id: 'other' } } });
    expect((await POST(request())).status).toBe(403);
    expect(state.enroll).not.toHaveBeenCalled();
  });
  it.each(['null', '[]', '{"x":1}', 'invalid'])(
    'recusa corpo %s',
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(state.enroll).not.toHaveBeenCalled();
    },
  );
  it('limita os bytes reais sem Content-Length', async () => {
    expect((await POST(request(' '.repeat(1025)))).status).toBe(413);
    expect(state.enroll).not.toHaveBeenCalled();
  });
  it('recusa formato não JSON', async () => {
    expect(
      (await POST(request('{}', 'https://example.invalid', 'text/plain')))
        .status,
    ).toBe(415);
  });
  it('emite dados somente na primeira matrícula e preserva cookies/cache', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect((await response.json()).factorId).toBe('fixture-factor');
    expect(state.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      issuer: 'GradualInfo',
      friendlyName: 'Admin Authenticator',
    });
  });
  it.each(['verified', 'unverified'])(
    'fator %s impede repetição e reapresentação',
    async (status) => {
      state.factors.mockResolvedValue({
        data: { all: [{ factor_type: 'totp', status }] },
      });
      const response = await POST(request());
      expect(response.status).toBe(409);
      expect(await response.json()).not.toHaveProperty('secret');
      expect(state.enroll).not.toHaveBeenCalled();
    },
  );
  it('conflito do provedor relê o fator vencedor sem excluir ou repetir', async () => {
    state.factors
      .mockResolvedValueOnce({ data: { all: [] } })
      .mockResolvedValueOnce({
        data: {
          all: [{ factor_type: 'totp', friendly_name: 'Admin Authenticator' }],
        },
      });
    state.enroll.mockResolvedValue({ data: null, error: {} });
    expect((await POST(request())).status).toBe(409);
    expect(state.enroll).toHaveBeenCalledTimes(1);
  });
  it('consulta tardia após deadline não inicia matrícula', async () => {
    vi.useFakeTimers();
    let resolve: (value: unknown) => void = () => {};
    state.factors.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const result = POST(request());
    await vi.advanceTimersByTimeAsync(10001);
    expect((await result).status).toBe(503);
    resolve({ data: { all: [] } });
    await Promise.resolve();
    expect(state.enroll).not.toHaveBeenCalled();
  });
  it('challenge bem sucedido sem currentLevel AAL2 não declara acesso', async () => {
    state.factors.mockResolvedValue({
      data: { all: [{ id: 'fixture-factor', factor_type: 'totp' }] },
    });
    const response = await verify(
      request('{"code":"123456","factorId":"fixture-factor"}'),
    );
    expect(response.status).toBe(503);
    expect(state.challenge).toHaveBeenCalledTimes(1);
  });
  it('factorId externo não dispara challenge', async () => {
    const response = await verify(
      request('{"code":"123456","factorId":"foreign"}'),
    );
    expect(response.status).toBe(400);
    expect(state.challenge).not.toHaveBeenCalled();
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
