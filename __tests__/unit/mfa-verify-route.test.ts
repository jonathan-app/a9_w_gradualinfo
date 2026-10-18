/**
 * @fileoverview Testes da rota de verificação MFA.
 * @module __tests__/unit/mfa-verify-route
 * @description Comprova 403 de origem, 500 sem adminId, 403 de identidade,
 *   415 de content-type, 400 de código inválido, resolução de factorId,
 *   challengeAndVerify e elevação AAL2.
 * @dependencies vitest, @/app/api/admin/auth/mfa/verify/route.
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
}));
vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '11111111-1111-4111-8111-111111111111',
    supabase: { url: 'https://x.supabase.co', anonKey: 'fake' },
  },
}));
vi.mock('@/lib/admin/session-response', () => ({
  createAdminSessionResponse: vi.fn(),
}));
vi.mock('@/lib/admin/rate-limit', () => ({
  consumeAdminRateLimit: vi.fn(async () => ({ allowed: true })),
  adminRateLimitResponse: vi.fn(() => null),
}));

import { POST } from '@/app/api/admin/auth/mfa/verify/route';
import { guardAdminAccess } from '@/lib/admin/access-guard';
import { validateAdminRequestOrigin } from '@/lib/admin/auth';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import {
  consumeAdminRateLimit,
  adminRateLimitResponse,
} from '@/lib/admin/rate-limit';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

function makeSupabase(opts: {
  user?: { id: string } | null;
  authError?: boolean;
  factors?: Array<{ id: string; factor_type: string; status?: string }>;
  factorsError?: boolean;
  verifyError?: boolean;
  aal?: string;
  aalError?: boolean;
}) {
  const finish = vi.fn((res: Response) => res);
  const supabase = {
    auth: {
      getUser: vi.fn(async () =>
        opts.authError
          ? { data: { user: null }, error: new Error('x') }
          : { data: { user: opts.user ?? { id: ADMIN_ID } }, error: null },
      ),
      mfa: {
        listFactors: vi.fn(async () =>
          opts.factorsError
            ? { data: null, error: new Error('x') }
            : {
                data: {
                  all: opts.factors ?? [
                    { id: 'f1', factor_type: 'totp', status: 'verified' },
                  ],
                },
                error: null,
              },
        ),
        challengeAndVerify: vi.fn(async () =>
          opts.verifyError ? { error: new Error('bad code') } : { error: null },
        ),
        getAuthenticatorAssuranceLevel: vi.fn(async () =>
          opts.aalError
            ? { data: null, error: new Error('x') }
            : { data: { currentLevel: opts.aal ?? 'aal2' }, error: null },
        ),
      },
    },
  };
  return { supabase, finish };
}

function makeRequest(opts: {
  contentType?: string;
  body?: unknown;
  isForm?: boolean;
}) {
  const headers = new Headers();
  const ct = opts.contentType ?? 'application/json';
  headers.set('content-type', ct);
  if (opts.isForm || ct.includes('form')) {
    headers.set('content-type', 'application/x-www-form-urlencoded');
    const params = new URLSearchParams();
    const body = (opts.body ?? {}) as Record<string, string>;
    for (const [k, v] of Object.entries(body)) params.set(k, v);
    return new Request('https://gradualinfo.com.br/api/admin/auth/mfa/verify', {
      method: 'POST',
      headers,
      body: params.toString(),
    });
  }
  return new Request('https://gradualinfo.com.br/api/admin/auth/mfa/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

describe('POST /api/admin/auth/mfa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guardAdminAccess).mockReturnValue(null as never);
    vi.mocked(validateAdminRequestOrigin).mockReturnValue(true);
    vi.mocked(consumeAdminRateLimit).mockResolvedValue({
      allowed: true,
    } as never);
    vi.mocked(adminRateLimitResponse).mockReturnValue(null);
  });

  it('retorna 403 com origem rejeitada', async () => {
    vi.mocked(validateAdminRequestOrigin).mockReturnValue(false);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(403);
  });

  it('retorna 500 com adminUserId vazio', async () => {
    const { env } = await import('@/lib/env');
    const orig = env.adminUserId;
    (env as Record<string, unknown>).adminUserId = '  ';
    try {
      const res = await POST(makeRequest({ body: { code: '123456' } }));
      expect(res.status).toBe(500);
    } finally {
      (env as Record<string, unknown>).adminUserId = orig;
    }
  });

  it('retorna 403 com identidade divergente', async () => {
    const { supabase } = makeSupabase({ user: { id: 'outra' } });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish: vi.fn((r: Response) => r),
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(403);
  });

  it('retorna 401 com erro de getUser', async () => {
    const { supabase } = makeSupabase({ authError: true });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish: vi.fn((r: Response) => r),
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(401);
  });

  it('retorna 415 com content-type não suportado', async () => {
    const { supabase } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish: vi.fn((r: Response) => r),
    } as never);
    const res = await POST(
      makeRequest({ contentType: 'text/plain', body: 'x' }),
    );
    expect(res.status).toBe(415);
  });

  it('retorna 400 JSON com código inválido', async () => {
    const { supabase } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish: vi.fn((r: Response) => r),
    } as never);
    const res = await POST(makeRequest({ body: { code: 'abc' } }));
    expect(res.status).toBe(400);
  });

  it('retorna redirect com erro em formulário com código inválido', async () => {
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({ body: { code: 'abc' }, isForm: true }),
    );
    expect(res.status).toBe(303);
    expect(finish).toHaveBeenCalled();
  });

  it('resolve factorId via listFactors quando ausente', async () => {
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(200);
    expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      code: '123456',
    });
  });

  it('retorna 400 no_factors JSON sem fator', async () => {
    const { supabase, finish } = makeSupabase({ factors: [] });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 no_factors JSON com erro de listFactors', async () => {
    const { supabase, finish } = makeSupabase({ factorsError: true });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 invalid_factor JSON com factorId não pertencente', async () => {
    const { supabase, finish } = makeSupabase({
      factors: [{ id: 'outro', factor_type: 'totp' }],
    });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({ body: { code: '123456', factorId: 'inexistente' } }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 400 invalid_code JSON com challengeAndVerify falho', async () => {
    const { supabase, finish } = makeSupabase({ verifyError: true });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(400);
  });

  it('retorna 503 mfa_unavailable JSON sem elevação aal2', async () => {
    const { supabase, finish } = makeSupabase({ aal: 'aal1' });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(503);
  });

  it('retorna 200 JSON com sucesso', async () => {
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({ body: { code: '123456', factorId: 'f1' } }),
    );
    expect(res.status).toBe(200);
  });

  it('retorna redirect 303 com formulário válido', async () => {
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({ body: { code: '123456', factorId: 'f1' }, isForm: true }),
    );
    expect(res.status).toBe(303);
  });

  it('usa fallback setup quando source=setup', async () => {
    const { supabase, finish } = makeSupabase({ verifyError: true });
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({
        body: { code: '123456', factorId: 'f1', source: 'setup' },
        isForm: true,
      }),
    );
    expect(res.status).toBe(303);
  });

  it('remove espaços do código', async () => {
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(
      makeRequest({ body: { code: '1 2 3 4 5 6', factorId: 'f1' } }),
    );
    expect(res.status).toBe(200);
    expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      code: '123456',
    });
  });

  it('aplica rate limit quando consumido', async () => {
    vi.mocked(adminRateLimitResponse).mockReturnValue(
      new Response('429', { status: 429 }) as never,
    );
    const { supabase, finish } = makeSupabase({});
    vi.mocked(createAdminSessionResponse).mockResolvedValue({
      supabase,
      finish,
    } as never);
    const res = await POST(makeRequest({ body: { code: '123456' } }));
    expect(res.status).toBe(429);
  });
});
