/**
 * @fileoverview Testes das funções utilitárias de autorização administrativa.
 * @module __tests__/unit/admin-auth-utils
 * @description Comprova sanitizeAdminRedirect, validateAdminRequestOrigin,
 *   resolveSafeRedirectBase e resolveAdminMfaLadder.
 * @dependencies vitest, @/lib/admin/auth.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '11111111-1111-4111-8111-111111111111',
    isProduction: true,
    supabase: { url: 'https://x.supabase.co', anonKey: 'fake' },
  },
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: vi.fn(() => null),
}));

import {
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
  resolveSafeRedirectBase,
  resolveAdminMfaLadder,
} from '@/lib/admin/auth';

describe('sanitizeAdminRedirect', () => {
  it('retorna /admin-dashboard para null', () => {
    expect(sanitizeAdminRedirect(null)).toBe('/admin-dashboard');
  });

  it('retorna /admin-dashboard para undefined', () => {
    expect(sanitizeAdminRedirect(undefined)).toBe('/admin-dashboard');
  });

  it('retorna /admin-dashboard para string vazia', () => {
    expect(sanitizeAdminRedirect('')).toBe('/admin-dashboard');
  });

  it('aceita /admin-dashboard exato', () => {
    expect(sanitizeAdminRedirect('/admin-dashboard')).toBe('/admin-dashboard');
  });

  it('aceita /admin-dashboard/qualquer', () => {
    expect(sanitizeAdminRedirect('/admin-dashboard/qualquer')).toBe(
      '/admin-dashboard/qualquer',
    );
  });

  it('rejeita //evil.com', () => {
    expect(sanitizeAdminRedirect('//evil.com')).toBe('/admin-dashboard');
  });

  it('rejeita https://evil.com', () => {
    expect(sanitizeAdminRedirect('https://evil.com')).toBe('/admin-dashboard');
  });

  it('rejeita /admin-dashboard-falso', () => {
    expect(sanitizeAdminRedirect('/admin-dashboard-falso')).toBe(
      '/admin-dashboard',
    );
  });

  it('rejeita caminho externo', () => {
    expect(sanitizeAdminRedirect('/outra')).toBe('/admin-dashboard');
  });

  it('rejeita backslash', () => {
    expect(sanitizeAdminRedirect('/admin-dashboard\\..')).toBe(
      '/admin-dashboard',
    );
  });
});

describe('validateAdminRequestOrigin', () => {
  it('aceita origin igual a SITE_ORIGIN', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { origin: 'https://gradualinfo.com.br' },
    });
    expect(validateAdminRequestOrigin(req)).toBe(true);
  });

  it('rejeita origin divergente', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { origin: 'https://evil.com' },
    });
    expect(validateAdminRequestOrigin(req)).toBe(false);
  });

  it('aceita referer quando origin ausente', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { referer: 'https://gradualinfo.com.br/admin-dashboard' },
    });
    expect(validateAdminRequestOrigin(req)).toBe(true);
  });

  it('retorna false sem origin nem referer', () => {
    const req = new Request('https://gradualinfo.com.br/api/x');
    expect(validateAdminRequestOrigin(req)).toBe(false);
  });

  it('rejeita referer malformado', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { referer: 'não é url' },
    });
    expect(validateAdminRequestOrigin(req)).toBe(false);
  });
});

describe('resolveSafeRedirectBase', () => {
  it('retorna SITE_ORIGIN quando host não bate', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { host: 'evil.com' },
    });
    expect(resolveSafeRedirectBase(req)).toBe('https://gradualinfo.com.br');
  });

  it('retorna origin do host correto', () => {
    const req = new Request('https://gradualinfo.com.br/api/x', {
      headers: { host: 'gradualinfo.com.br', 'x-forwarded-proto': 'https' },
    });
    expect(resolveSafeRedirectBase(req)).toBe('https://gradualinfo.com.br');
  });

  it('retorna SITE_ORIGIN sem host em produção', () => {
    const req = new Request('https://gradualinfo.com.br/api/x');
    expect(resolveSafeRedirectBase(req)).toBe('https://gradualinfo.com.br');
  });
});

describe('resolveAdminMfaLadder', () => {
  function makeClient(opts: {
    aal: string | null;
    aalError?: boolean;
    factors: Array<{ factor_type: string }>;
    factorsError?: boolean;
  }) {
    return {
      auth: {
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(async () =>
            opts.aalError
              ? { data: null, error: new Error('x') }
              : { data: { currentLevel: opts.aal }, error: null },
          ),
          listFactors: vi.fn(async () =>
            opts.factorsError
              ? { data: null, error: new Error('x') }
              : { data: { all: opts.factors }, error: null },
          ),
        },
      },
    } as never;
  }

  it('retorna ok quando aal2', async () => {
    const client = makeClient({ aal: 'aal2', factors: [] });
    expect(await resolveAdminMfaLadder(client)).toEqual({ action: 'ok' });
  });

  it('retorna setup sem fator TOTP', async () => {
    const client = makeClient({ aal: 'aal1', factors: [] });
    expect(await resolveAdminMfaLadder(client)).toEqual({
      action: 'setup',
      currentAal: 'aal1',
    });
  });

  it('retorna verify com fator TOTP pendente', async () => {
    const client = makeClient({
      aal: 'aal1',
      factors: [{ factor_type: 'totp' }],
    });
    expect(await resolveAdminMfaLadder(client)).toEqual({
      action: 'verify',
      currentAal: 'aal1',
    });
  });

  it('lança erro sem aal', async () => {
    const client = makeClient({ aal: null, factors: [] });
    await expect(resolveAdminMfaLadder(client)).rejects.toThrow();
  });

  it('lança erro com erro de aal', async () => {
    const client = makeClient({ aal: null, aalError: true, factors: [] });
    await expect(resolveAdminMfaLadder(client)).rejects.toThrow();
  });

  it('lança erro com erro de factors', async () => {
    const client = makeClient({ aal: 'aal1', factors: [], factorsError: true });
    await expect(resolveAdminMfaLadder(client)).rejects.toThrow();
  });
});
