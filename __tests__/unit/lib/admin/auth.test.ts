/**
 * @fileoverview __tests__/unit/lib/admin/auth.test.ts — autorização administrativa
 * @module __tests__/unit/lib/admin/auth
 * @description Testa `checkAdminUser`, `assertAdminApiAuth`, `roleSatisfies`,
 *   `sanitizeAdminRedirect` e `validateAdminRequestOrigin` de `lib/admin/auth.ts`,
 *   cobrando a guarda `admin` + AAL2 (usuarios/AC-1) e a negação a
 *   `editor`/`revisor`/AAL1 (usuarios/AC-10).
 * @dependencies vitest, @/lib/admin/auth (mocks de access-guard, env, supabase/server, site-config)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';

const ROOT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_ID = '00000000-0000-4000-8000-000000000002';

const makeSupabase = () => {
  const authGetUser = vi.fn();
  const mfaGetAAL = vi.fn();
  const mfaListFactors = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    auth: {
      getUser: authGetUser,
      mfa: {
        getAuthenticatorAssuranceLevel: mfaGetAAL,
        listFactors: mfaListFactors,
      },
    },
    from,
    authGetUser,
    mfaGetAAL,
    mfaListFactors,
    maybeSingle,
  };
};

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: vi.fn(() => null),
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '00000000-0000-4000-8000-000000000001',
    isProduction: false,
    isDevelopment: true,
  },
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'http://localhost:3000',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import {
  checkAdminUser,
  assertAdminApiAuth,
  roleSatisfies,
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { guardAdminAccess } from '@/lib/admin/access-guard';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

const originalAdminUserId = env.adminUserId;

beforeEach(() => {
  vi.resetAllMocks();
  env.adminUserId = ROOT_ID;
  vi.mocked(guardAdminAccess).mockReturnValue(null);
});

afterEach(() => {
  env.adminUserId = originalAdminUserId;
});

const user = (id: string): User =>
  ({
    id,
    email: `${id}@exemplo.dev`,
  }) as User;

const configureSupabase = (supabase: ReturnType<typeof makeSupabase>) => {
  vi.mocked(createClient).mockReturnValue(supabase as never);
};

describe('roleSatisfies (hierarquia cumulativa)', () => {
  it('admin satisface admin, editor e revisor', () => {
    expect(roleSatisfies('admin', 'admin')).toBe(true);
    expect(roleSatisfies('admin', 'editor')).toBe(true);
    expect(roleSatisfies('admin', 'revisor')).toBe(true);
  });

  it('editor satisface editor e revisor, mas nao admin', () => {
    expect(roleSatisfies('editor', 'editor')).toBe(true);
    expect(roleSatisfies('editor', 'revisor')).toBe(true);
    expect(roleSatisfies('editor', 'admin')).toBe(false);
  });

  it('revisor satisface apenas revisor', () => {
    expect(roleSatisfies('revisor', 'revisor')).toBe(true);
    expect(roleSatisfies('revisor', 'admin')).toBe(false);
    expect(roleSatisfies('revisor', 'editor')).toBe(false);
  });
});

describe('sanitizeAdminRedirect (anti open-redirect)', () => {
  it.each([
    [undefined, '/admin-dashboard'],
    [null, '/admin-dashboard'],
    ['', '/admin-dashboard'],
    ['/admin-dashboard', '/admin-dashboard'],
    ['/admin-dashboard/usuarios', '/admin-dashboard/usuarios'],
    ['/admin-dashboard-falso', '/admin-dashboard'],
    ['/artigos/x', '/admin-dashboard'],
    ['//evil.com', '/admin-dashboard'],
    ['https://evil.com', '/admin-dashboard'],
    ['\\\\evil', '/admin-dashboard'],
  ])('sanitiza %s para %s', (input, expected) => {
    expect(sanitizeAdminRedirect(input as string | null | undefined)).toBe(
      expected,
    );
  });
});

describe('validateAdminRequestOrigin (CSRF/origem)', () => {
  const req = (origin?: string) =>
    new Request('http://localhost:3000/admin-dashboard/usuarios', {
      headers: origin ? { origin } : {},
    });

  it('aceita origem igual a SITE_ORIGIN em localhost', () => {
    expect(validateAdminRequestOrigin(req('http://localhost:3000'))).toBe(true);
  });

  it('rejeita origem diferente', () => {
    expect(validateAdminRequestOrigin(req('https://outro-dominio.com'))).toBe(
      false,
    );
  });

  it('rejeita quando nao cabe origem nem referer', () => {
    expect(validateAdminRequestOrigin(req())).toBe(false);
  });

  it('aceita referer igual a SITE_ORIGIN', () => {
    const request = new Request('http://localhost:3000/x', {
      headers: { referer: 'http://localhost:3000/admin-dashboard' },
    });
    expect(validateAdminRequestOrigin(request)).toBe(true);
  });
});

describe('checkAdminUser (servidor)', () => {
  it('devolve a resposta de falha do guard de acesso quando houver', async () => {
    const falha = new Response('Indisponível', { status: 503 });
    vi.mocked(guardAdminAccess).mockReturnValue(falha);

    const supabase = makeSupabase();
    configureSupabase(supabase);

    const result = await checkAdminUser(supabase);

    expect(result).toBe(falha);
  });

  it('retorna unauthenticated quando getUser nao devolve usuario', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error('token invalido'),
    });

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('autoriza root com AAL2 (usuarios/AC-1)', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(ROOT_ID) },
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal2' },
      error: null,
    });

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({
      ok: true,
      user: user(ROOT_ID),
      role: 'admin',
      aal: 'aal2',
    });
  });

  it('nao autoriza usuario sem papel no painel (usuarios/AC-10)', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(OTHER_ID) },
      error: null,
    });
    vi.mocked(supabase.maybeSingle).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: { all: [] },
      error: null,
    });

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({
      ok: false,
      reason: 'unauthorized',
      user: user(OTHER_ID),
    });
  });

  it('exige matricula MFA quando nao ha fator totp', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(ROOT_ID) },
      error: null,
    });
    vi.mocked(supabase.maybeSingle).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: { all: [] },
      error: null,
    });

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({
      ok: false,
      reason: 'mfa_enrollment_required',
      user: user(ROOT_ID),
      currentAal: 'aal1',
    });
  });

  it('exige desafio MFA quando ha fator pendente em aal1', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(ROOT_ID) },
      error: null,
    });
    vi.mocked(supabase.maybeSingle).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: { all: [{ factor_type: 'totp' }] },
      error: null,
    });

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({
      ok: false,
      reason: 'mfa_challenge_required',
      user: user(ROOT_ID),
      currentAal: 'aal1',
    });
  });

  it('falha fechado (config_missing) quando ADMIN_USER_ID esta vazio fora do desenvolvimento', async () => {
    env.adminUserId = '';
    const supabase = makeSupabase();
    configureSupabase(supabase);

    const result = await checkAdminUser(supabase);

    expect(result).toEqual({ ok: false, reason: 'config_missing' });
  });
});

describe('assertAdminApiAuth (handlers /api/admin)', () => {
  const requestComOrigem = () =>
    new Request('http://localhost:3000/api/admin/usuarios/papeis', {
      headers: { origin: 'http://localhost:3000' },
    });

  it('retorna ok quando admin com AAL2 e origem valida', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(ROOT_ID) },
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal2' },
      error: null,
    });

    const result = await assertAdminApiAuth(requestComOrigem(), 'admin');

    expect(result).toEqual({
      ok: true,
      user: user(ROOT_ID),
      role: 'admin',
    });
  });

  it('retorna 403 para papel insuficiente (editor acessando admin)', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(OTHER_ID) },
      error: null,
    });
    vi.mocked(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel,
    ).mockResolvedValue({
      data: { currentLevel: 'aal2' },
      error: null,
    });
    vi.mocked(supabase.maybeSingle).mockResolvedValue({
      data: { role: 'editor' },
      error: null,
    });

    const result = await assertAdminApiAuth(requestComOrigem(), 'admin');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('retorna 401 quando nao autenticado', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error('token invalido'),
    });

    const result = await assertAdminApiAuth(requestComOrigem(), 'admin');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('retorna 500 quando configuracao administrativa esta ausente', async () => {
    env.adminUserId = '';
    const supabase = makeSupabase();
    configureSupabase(supabase);

    const result = await assertAdminApiAuth(requestComOrigem(), 'admin');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(500);
    }
  });

  it('retorna 503 quando servico de papel indisponivel', async () => {
    const supabase = makeSupabase();
    configureSupabase(supabase);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: user(OTHER_ID) },
      error: null,
    });
    vi.mocked(supabase.maybeSingle).mockRejectedValue(new Error('db down'));

    const result = await assertAdminApiAuth(requestComOrigem(), 'admin');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });
});
