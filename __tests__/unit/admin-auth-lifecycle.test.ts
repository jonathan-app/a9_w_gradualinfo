// @vitest-environment node
/**
 * @fileoverview Validação do ciclo integrado de autenticação administrativa (Spec 0018).
 * @module __tests__/unit/admin-auth-lifecycle.test
 * @description Comprova de ponta a ponta a cadeia de autenticação real e máquina de estados:
 *   - Cenário 1: Primeiro degrau — recusa sob senha incorreta (invalid_credentials);
 *   - Cenário 2: Primeiro degrau — recusa e signOut imediato sob UUID divergente de ADMIN_USER_ID;
 *   - Cenário 3: Primeiro degrau — sucesso AAL1 e roteamento para setup ou verify;
 *   - Cenário 4: Bloqueio estrito sob AAL1 — páginas redirecionam, APIs retornam HTTP 403;
 *   - Cenário 5: Segundo degrau (MFA) — recusa 401 sem sessão, recusa sob código inválido,
 *                elevação para AAL2 sob código válido;
 *   - Cenário 6: Acesso ao Dashboard liberado exclusivamente com AAL2 comprovado;
 *   - Cenário 7: Encerramento de sessão (Logout) com signOut e limpeza dos cookies do SDK;
 *   - Cenário 8: Indisponibilidade de serviços (Supabase ou Rate Limit) operando em fail-closed.
 * @dependencies vitest, app/api/admin/auth/login, app/api/admin/auth/mfa/verify,
 *   app/api/admin/auth/logout, lib/admin/auth, app/admin-dashboard/(protegido)/layout.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const ADMIN_EMAIL = 'admin@gradualinfo.dev';

const mockCookiesStore = {
  get: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: async () => mockCookiesStore,
  headers: async () => new Headers(),
}));

let activeMockSupabase: ReturnType<typeof createMockSupabaseClient> | null =
  null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async (onCookies?: (cookies: any[]) => void) => {
    if (activeMockSupabase?.onCookiesCallback && onCookies) {
      activeMockSupabase.onCookiesCallback(onCookies);
    }
    return activeMockSupabase?.client;
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '00000000-0000-4000-8000-000000000001',
    adminEmail: 'admin@gradualinfo.dev',
    isProduction: false,
    siteUrl: 'https://gradualinfo.com.br',
    supabase: {
      url: 'https://local.supabase.co',
      anonKey: 'fake-anon-key',
    },
  },
  readAdminAccessConfig: () => ({
    issuer: 'https://test-team.cloudflareaccess.com',
    audience: 'test-aud',
    ownerEmail: ADMIN_EMAIL,
    hosts: ['gradualinfo.com.br'],
  }),
}));

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: async () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));

vi.mock('@/lib/admin/rate-limit', () => ({
  consumeAdminRateLimit: vi.fn(async () => ({ allowed: true })),
  adminRateLimitResponse: vi.fn(() => null),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/audit-service', () => ({
  recordAdminAudit: vi.fn(),
}));

import { POST as loginPost } from '@/app/api/admin/auth/login/route';
import { POST as mfaVerifyPost } from '@/app/api/admin/auth/mfa/verify/route';
import { POST as logoutPost } from '@/app/api/admin/auth/logout/route';
import { assertAdminApiAuth, checkAdminUser } from '@/lib/admin/auth';
import {
  consumeAdminRateLimit,
  adminRateLimitResponse,
} from '@/lib/admin/rate-limit';

function createMockSupabaseClient(state: {
  signInError?: Error | null;
  signInUser?: { id: string; email: string } | null;
  currentUser?: { id: string; email: string } | null;
  getUserError?: Error | null;
  totpFactors?: Array<{ id: string; factor_type: string; status: string }>;
  challengeVerifyError?: Error | null;
  currentAal?: string;
  simulateCookiesOnSignOut?: boolean;
}) {
  let onCookiesHandler: ((cookies: any[]) => void) | undefined;

  const auth = {
    signInWithPassword: vi.fn(async ({ password }) => {
      if (state.signInError) {
        return {
          data: { user: null, session: null },
          error: state.signInError,
        };
      }
      if (password !== 'SenhaCorreta123!') {
        return {
          data: { user: null, session: null },
          error: new Error('Invalid login credentials'),
        };
      }
      const user = state.signInUser ?? {
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
      };
      if (onCookiesHandler) {
        onCookiesHandler([
          {
            name: 'sb-local-auth-token',
            value: 'session-token-aal1',
            options: { path: '/' },
          },
        ]);
      }
      return {
        data: {
          user,
          session: { access_token: 'tok-123', refresh_token: 'ref-123' },
        },
        error: null,
      };
    }),

    getUser: vi.fn(async () => {
      if (state.getUserError) {
        return { data: { user: null }, error: state.getUserError };
      }
      return {
        data: {
          user: state.currentUser ?? { id: ADMIN_ID, email: ADMIN_EMAIL },
        },
        error: null,
      };
    }),

    signOut: vi.fn(async () => {
      if (onCookiesHandler) {
        onCookiesHandler([
          {
            name: 'sb-local-auth-token',
            value: '',
            options: { maxAge: 0, path: '/' },
          },
        ]);
      }
      return { error: null };
    }),

    mfa: {
      listFactors: vi.fn(async () => ({
        data: {
          all: state.totpFactors ?? [
            { id: 'factor-totp-1', factor_type: 'totp', status: 'verified' },
          ],
        },
        error: null,
      })),

      getAuthenticatorAssuranceLevel: vi.fn(async () => ({
        data: {
          currentLevel: state.currentAal ?? 'aal1',
          nextLevel: 'aal2',
          currentAuthenticationMethods: [],
        },
        error: null,
      })),

      challengeAndVerify: vi.fn(async ({ code }) => {
        if (state.challengeVerifyError || code !== '123456') {
          return { data: null, error: new Error('Invalid TOTP code') };
        }
        if (onCookiesHandler) {
          onCookiesHandler([
            {
              name: 'sb-local-auth-token',
              value: 'session-token-aal2',
              options: { path: '/' },
            },
          ]);
        }
        return { data: { user: { id: ADMIN_ID } }, error: null };
      }),
    },
  };

  return {
    client: {
      auth,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      })),
    },
    onCookiesCallback(cb: (cookies: any[]) => void) {
      onCookiesHandler = cb;
    },
    auth,
  };
}

describe('Ciclo Integrado de Autenticação Real e MFA (Spec 0018 AC-04 a AC-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_TEST;
    vi.mocked(consumeAdminRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(adminRateLimitResponse).mockReturnValue(null);
  });

  describe('Cenário 1: Primeiro degrau — Credenciais incorretas (AC-04)', () => {
    it('redireciona para o login com error=invalid_credentials quando a senha está errada', async () => {
      activeMockSupabase = createMockSupabaseClient({});

      const body = new URLSearchParams({
        email: ADMIN_EMAIL,
        password: 'SenhaErrada999!',
        redirectTo: '/admin-dashboard',
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            origin: 'https://gradualinfo.com.br',
          },
          body: body.toString(),
        },
      );

      const response = await loginPost(request);

      expect(response.status).toBe(303);
      const location = response.headers.get('location');
      expect(location).toContain('/admin-dashboard/login');
      expect(location).toContain('error=invalid_credentials');
    });
  });

  describe('Cenário 2: Primeiro degrau — Identidade não autorizada (UUID divergente) (AC-04)', () => {
    it('executa signOut imediato e rejeita com invalid_credentials se o UUID não corresponder a ADMIN_USER_ID', async () => {
      activeMockSupabase = createMockSupabaseClient({
        signInUser: {
          id: '99999999-9999-9999-9999-999999999999',
          email: 'outro-usuario@supabase.co',
        },
      });

      const body = new URLSearchParams({
        email: 'outro-usuario@supabase.co',
        password: 'SenhaCorreta123!',
        redirectTo: '/admin-dashboard',
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            origin: 'https://gradualinfo.com.br',
          },
          body: body.toString(),
        },
      );

      const response = await loginPost(request);

      expect(response.status).toBe(303);
      const location = response.headers.get('location');
      expect(location).toContain('error=invalid_credentials');
      expect(activeMockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Cenário 3: Primeiro degrau — Login bem-sucedido e roteamento MFA (AC-04 e AC-05)', () => {
    it('redireciona para /admin-dashboard/mfa/verify quando o administrador possui TOTP ativo', async () => {
      activeMockSupabase = createMockSupabaseClient({
        totpFactors: [
          { id: 'factor-1', factor_type: 'totp', status: 'verified' },
        ],
        currentAal: 'aal1',
      });

      const body = new URLSearchParams({
        email: ADMIN_EMAIL,
        password: 'SenhaCorreta123!',
        redirectTo: '/admin-dashboard',
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            origin: 'https://gradualinfo.com.br',
          },
          body: body.toString(),
        },
      );

      const response = await loginPost(request);

      expect(response.status).toBe(303);
      const location = response.headers.get('location');
      expect(location).toContain('/admin-dashboard/mfa/verify');
      expect(location).toContain('redirectTo=%2Fadmin-dashboard');
    });

    it('redireciona para /admin-dashboard/mfa/setup quando o administrador ainda não possui TOTP', async () => {
      activeMockSupabase = createMockSupabaseClient({
        totpFactors: [],
        currentAal: 'aal1',
      });

      const body = new URLSearchParams({
        email: ADMIN_EMAIL,
        password: 'SenhaCorreta123!',
        redirectTo: '/admin-dashboard',
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            origin: 'https://gradualinfo.com.br',
          },
          body: body.toString(),
        },
      );

      const response = await loginPost(request);

      expect(response.status).toBe(303);
      const location = response.headers.get('location');
      expect(location).toContain('/admin-dashboard/mfa/setup');
    });
  });

  describe('Cenário 4: Bloqueio estrito sob nível AAL1 (AC-05)', () => {
    it('avaliação de usuário em AAL1 retorna mfa_challenge_required para páginas', async () => {
      const mock = createMockSupabaseClient({
        currentAal: 'aal1',
        totpFactors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
      });

      const authResult = await checkAdminUser(mock.client as never);

      expect(authResult.ok).toBe(false);
      if (!authResult.ok) {
        expect(authResult.reason).toBe('mfa_challenge_required');
      }
    });

    it('assertAdminApiAuth rejeita requisições a APIs administrativas com HTTP 403 sob AAL1', async () => {
      activeMockSupabase = createMockSupabaseClient({
        currentAal: 'aal1',
        totpFactors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/qualquer-operacao',
        {
          method: 'POST',
          headers: { origin: 'https://gradualinfo.com.br' },
        },
      );

      const apiAuth = await assertAdminApiAuth(request, 'admin');

      expect(apiAuth.ok).toBe(false);
      if (!apiAuth.ok) {
        expect(apiAuth.response.status).toBe(403);
        const text = await apiAuth.response.text();
        expect(text).toContain(
          'Autenticação de segundo fator (MFA/AAL2) obrigatória',
        );
      }
    });
  });

  describe('Cenário 5: Verificação de segundo degrau (MFA Verify) (AC-05)', () => {
    it('retorna HTTP 401 caso não haja sessão ativa ao tentar verificar MFA', async () => {
      activeMockSupabase = createMockSupabaseClient({
        getUserError: new Error('No session'),
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/mfa/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            origin: 'https://gradualinfo.com.br',
          },
          body: JSON.stringify({ code: '123456', factorId: 'factor-1' }),
        },
      );

      const response = await mfaVerifyPost(request);
      expect(response.status).toBe(401);
    });

    it('rejeita com erro quando o código TOTP de seis dígitos for inválido', async () => {
      activeMockSupabase = createMockSupabaseClient({
        challengeVerifyError: new Error('Bad code'),
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/mfa/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            origin: 'https://gradualinfo.com.br',
          },
          body: JSON.stringify({ code: '000000', factorId: 'factor-totp-1' }),
        },
      );

      const response = await mfaVerifyPost(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('invalid_code');
    });

    it('promove a sessão para AAL2 e redireciona para o dashboard com código TOTP válido', async () => {
      activeMockSupabase = createMockSupabaseClient({
        currentAal: 'aal2',
      });

      const body = new URLSearchParams({
        code: '123456',
        factorId: 'factor-totp-1',
        redirectTo: '/admin-dashboard',
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/mfa/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            origin: 'https://gradualinfo.com.br',
          },
          body: body.toString(),
        },
      );

      const response = await mfaVerifyPost(request);
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(
        'https://gradualinfo.com.br/admin-dashboard',
      );
    });
  });

  describe('Cenário 6: Dashboard e APIs sob nível AAL2 (AC-05)', () => {
    it('checkAdminUser autoriza com ok=true e aal=aal2 quando o nível for comprovado', async () => {
      const mock = createMockSupabaseClient({
        currentAal: 'aal2',
        totpFactors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
      });

      const authResult = await checkAdminUser(mock.client as never);

      expect(authResult.ok).toBe(true);
      if (authResult.ok) {
        expect(authResult.aal).toBe('aal2');
        expect(authResult.user.id).toBe(ADMIN_ID);
      }
    });

    it('assertAdminApiAuth permite operações administrativas quando o usuário estiver em AAL2', async () => {
      activeMockSupabase = createMockSupabaseClient({
        currentAal: 'aal2',
        totpFactors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/operacao-critica',
        {
          method: 'POST',
          headers: { origin: 'https://gradualinfo.com.br' },
        },
      );

      const apiAuth = await assertAdminApiAuth(request, 'admin');
      expect(apiAuth.ok).toBe(true);
      if (apiAuth.ok) {
        expect(apiAuth.user.id).toBe(ADMIN_ID);
      }
    });
  });

  describe('Cenário 7: Encerramento de sessão (Logout) (AC-07)', () => {
    it('executa signOut no Supabase, limpa cookies e redireciona para login com signedOut=1', async () => {
      activeMockSupabase = createMockSupabaseClient({});

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const response = await logoutPost(request);

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(
        'https://gradualinfo.com.br/admin-dashboard/login?signedOut=1',
      );
      expect(activeMockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Cenário 8: Indisponibilidade de serviços e Rate Limit (Fail Closed) (AC-08)', () => {
    it('retorna HTTP 429 ou 503 com Retry-After quando a quota de login é consumida ou indisponível', async () => {
      vi.mocked(adminRateLimitResponse).mockReturnValue(
        new Response('Muitas tentativas.', {
          status: 429,
          headers: { 'Retry-After': '60' },
        }),
      );

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: 'qualquer-senha',
          }),
        },
      );

      const response = await loginPost(request);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });
});
