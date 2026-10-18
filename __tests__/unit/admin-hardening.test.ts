// @vitest-environment node
/**
 * @fileoverview Regressões de identidade, CSRF e cookies do painel.
 * @module __tests__/unit/admin-hardening
 * @description Exercita handlers e o adaptador SSR real com dados sintéticos e sem rede.
 * @dependencies vitest, @supabase/ssr, lib/admin, app/api/admin/auth.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CookieOptions } from '@supabase/ssr';
import type * as AdminRateModule from '@/lib/admin/rate-limit';
const state = vi.hoisted(() => ({
  adminId: '11111111-1111-4111-8111-111111111111',
  userId: '11111111-1111-4111-8111-111111111111',
  signOut: vi.fn(),
  ladder: vi.fn(),
  cookieSet: vi.fn(),
  rate: vi.fn(),
  challenge: vi.fn(),
  refresh: false,
  expiry: new Date('2030-01-01T00:00:00Z'),
  expiresOnly: false,
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/rate-limit', async (original) => ({
  ...(await original<typeof AdminRateModule>()),
  consumeAdminRateLimit: state.rate,
}));
vi.mock('@/lib/env', () => ({
  env: {
    get adminUserId() {
      return state.adminId;
    },
    isProduction: true,
    supabase: { url: 'http://localhost:54321', anonKey: 'synthetic' },
  },
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: state.cookieSet,
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    config: {
      cookies: {
        setAll: (
          updates: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) => void;
      };
    },
  ) => {
    const emit = (clear = false) =>
      config.cookies.setAll([
        {
          name: 'synthetic-session',
          value: clear ? '' : 'synthetic-value',
          options: {
            path: '/admin-dashboard',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: clear ? 0 : state.expiresOnly ? undefined : 600,
            expires: clear ? new Date(0) : state.expiry,
          },
        },
      ]);
    return {
      auth: {
        signInWithPassword: async () => {
          emit();
          return { data: { user: { id: state.userId } }, error: null };
        },
        signOut: async () => {
          emit(true);
          return state.signOut();
        },
        getUser: async () => {
          if (state.refresh) emit();
          return { data: { user: { id: state.userId } }, error: null };
        },
        mfa: {
          getAuthenticatorAssuranceLevel: state.ladder,
          listFactors: async () => ({
            data: {
              all: [
                {
                  id: 'synthetic-factor',
                  factor_type: 'totp',
                  status: 'unverified',
                },
              ],
            },
          }),
          challengeAndVerify: async () => {
            state.challenge();
            state.ladder.mockResolvedValue({ data: { currentLevel: 'aal2' } });
            emit();
            return { error: null };
          },
        },
      },
    };
  },
}));
import { POST as login } from '@/app/api/admin/auth/login/route';
import { POST as verify } from '@/app/api/admin/auth/mfa/verify/route';
import { POST as logout } from '@/app/api/admin/auth/logout/route';
import { validateAdminRequestOrigin } from '@/lib/admin/auth';
let counter = 0;
function request(path: string, body: Record<string, string> = {}) {
  return new Request(`https://gradualinfo.com.br${path}`, {
    method: 'POST',
    headers: {
      origin: 'https://gradualinfo.com.br',
      'content-type': 'application/json',
      accept: 'application/json',
      'cf-connecting-ip': `test-${++counter}`,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.rate.mockResolvedValue({ status: 200 });
  state.refresh = false;
  state.adminId = '11111111-1111-4111-8111-111111111111';
  state.userId = state.adminId;
  state.expiresOnly = false;
  state.signOut.mockResolvedValue({ error: null });
  state.ladder.mockResolvedValue({ data: { currentLevel: 'aal1' } });
});
describe('Endurecimento administrativo', () => {
  it('rejeita UUID divergente e remove a sessão antes de MFA', async () => {
    state.userId = '22222222-2222-4222-8222-222222222222';
    const response = await login(
      request('/api/admin/auth/login', {
        email: 'fixture@example.invalid',
        password: 'synthetic-password',
      }),
    );
    expect(response.headers.get('location')).toContain(
      'error=invalid_credentials',
    );
    expect(response.headers.get('location')).not.toContain('/mfa/');
    expect(state.signOut).toHaveBeenCalledTimes(1);
    expect(state.ladder).not.toHaveBeenCalled();
    const cookie = response.headers.get('set-cookie') || '';
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).not.toContain('synthetic-value');
  });
  it('não emite sessão divergente se logout falhar', async () => {
    state.userId = '22222222-2222-4222-8222-222222222222';
    state.signOut.mockRejectedValue(new Error('synthetic failure'));
    const response = await login(
      request('/api/admin/auth/login', {
        email: 'fixture@example.invalid',
        password: 'synthetic-password',
      }),
    );
    expect(response.headers.get('set-cookie')).not.toContain('synthetic-value');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
  it.each(['', 'invalid'])(
    'configuração %s bloqueia login antes da autenticação',
    async (value) => {
      state.adminId = value;
      const response = await login(
        request('/api/admin/auth/login', {
          email: 'fixture@example.invalid',
          password: 'synthetic-password',
        }),
      );
      expect(response.status).toBe(500);
      expect(state.cookieSet).not.toHaveBeenCalled();
    },
  );
  it('rejeita ausência de origem, Host forjado, null e URL malformada', () => {
    expect(
      validateAdminRequestOrigin(
        new Request('https://gradualinfo.com.br/api/admin/auth/login'),
      ),
    ).toBe(false);
    for (const origin of ['null', 'bad-url', 'https://attacker.invalid']) {
      expect(
        validateAdminRequestOrigin(
          new Request('https://attacker.invalid/api/admin/auth/login', {
            headers: { origin, referer: 'https://gradualinfo.com.br/' },
          }),
        ),
      ).toBe(false);
    }
    expect(
      validateAdminRequestOrigin(
        new Request('http://localhost:3100/api/admin/auth/login', {
          headers: { origin: 'http://localhost:3100' },
        }),
      ),
    ).toBe(false);
  });
  it('rejeita mutação sem origem antes da autenticação', async () => {
    const response = await login(
      new Request('https://gradualinfo.com.br/api/admin/auth/login', {
        method: 'POST',
      }),
    );
    expect(response.status).toBe(403);
    expect(state.cookieSet).not.toHaveBeenCalled();
  });
  it.each(['login', 'mfa'])(
    'preserva opções completas no Set-Cookie de %s',
    async (kind) => {
      const response =
        kind === 'login'
          ? await login(
              request('/api/admin/auth/login', {
                email: 'fixture@example.invalid',
                password: 'synthetic-password',
              }),
            )
          : await verify(
              request('/api/admin/auth/mfa/verify', {
                code: '123456',
                factorId: 'synthetic-factor',
              }),
            );
      const cookie = response.headers.get('set-cookie') || '';
      for (const option of [
        'Path=/admin-dashboard',
        'HttpOnly',
        'Secure',
        'SameSite=strict',
        'Max-Age=600',
        'Expires=',
      ])
        expect(cookie).toContain(option);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    },
  );
  it('preserva expiração explícita quando Max-Age não é fornecido', async () => {
    state.expiresOnly = true;
    const response = await login(
      request('/api/admin/auth/login', {
        email: 'fixture@example.invalid',
        password: 'synthetic-password',
      }),
    );
    expect(response.headers.get('set-cookie')).toContain(
      'Expires=Tue, 01 Jan 2030',
    );
    expect(response.headers.get('set-cookie')).not.toContain('Max-Age=');
  });
  it('logout mantém caminho e atributos da remoção de cookie', async () => {
    const response = await logout(request('/api/admin/auth/logout'));
    const cookie = response.headers.get('set-cookie') || '';
    for (const option of [
      'Path=/admin-dashboard',
      'HttpOnly',
      'Secure',
      'SameSite=strict',
      'Max-Age=0',
    ])
      expect(cookie).toContain(option);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('Quota nos handlers', () => {
  it('bloqueio MFA preserva cookies renovados pela validação de identidade', async () => {
    state.refresh = true;
    state.rate.mockResolvedValue({ status: 429, retryAfter: 60 });
    const response = await verify(
      request('/api/admin/auth/mfa/verify', {
        code: '123456',
        factorId: 'synthetic-factor',
      }),
    );
    expect(response.status).toBe(429);
    const cookie = response.headers.get('set-cookie') || '';
    for (const attribute of [
      'HttpOnly',
      'Secure',
      'SameSite=strict',
      'Path=/admin-dashboard',
    ])
      expect(cookie).toContain(attribute);
    expect(state.challenge).not.toHaveBeenCalled();
  });
  it.each([429, 503] as const)(
    'login bloqueado %s não autentica nem inicia MFA',
    async (status) => {
      state.rate.mockResolvedValue({
        status,
        retryAfter: status === 429 ? 60 : 5,
      });
      const response = await login(
        request('/api/admin/auth/login', {
          email: 'fixture@example.invalid',
          password: 'synthetic-password',
        }),
      );
      expect(response.status).toBe(status);
      expect(state.cookieSet).not.toHaveBeenCalled();
      expect(state.ladder).not.toHaveBeenCalled();
    },
  );
  it.each([429, 503] as const)(
    'MFA bloqueado %s não submete desafio',
    async (status) => {
      state.rate.mockResolvedValue({
        status,
        retryAfter: status === 429 ? 60 : 5,
      });
      const response = await verify(
        request('/api/admin/auth/mfa/verify', {
          code: '123456',
          factorId: 'synthetic-factor',
        }),
      );
      expect(response.status).toBe(status);
      expect(state.challenge).not.toHaveBeenCalled();
    },
  );
  it('CSRF e identidade divergente não consomem quota correspondente', async () => {
    await login(
      new Request('https://gradualinfo.com.br/api/admin/auth/login', {
        method: 'POST',
      }),
    );
    expect(state.rate).not.toHaveBeenCalled();
    state.userId = '22222222-2222-4222-8222-222222222222';
    expect((await verify(request('/api/admin/auth/mfa/verify'))).status).toBe(
      403,
    );
    expect(state.rate).not.toHaveBeenCalled();
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
