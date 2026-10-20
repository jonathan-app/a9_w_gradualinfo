// @vitest-environment node
/**
 * @fileoverview __tests__/unit/admin-auth.test.ts — testes de autorização e segurança do painel
 * @module __tests__/unit/admin-auth.test
 * @description Valida os controles de acesso da spec 0007 e exigências da entrega:
 *   - Anônimo redireciona para login;
 *   - Sessão expirada/inválida resulta em unauthenticated;
 *   - Outro usuário autenticado (UUID divergente) é rejeitado com unauthorized (404/403);
 *   - Ausência de ADMIN_USER_ID no servidor resulta em fail-closed absoluto (config_missing);
 *   - Escada de MFA restritiva: sem TOTP cadastrado exige setup (mfa_enrollment_required);
 *     com TOTP mas sessão AAL1 exige desafio (mfa_challenge_required);
 *     somente sessão AAL2 comprovada autoriza o painel e emissão de preview;
 *   - Sanitização de redirecionamento aceita apenas /admin-dashboard ou /admin-dashboard/... e rejeita /admin-dashboard-falso;
 *   - Validação de origem bloqueia tentativas de CSRF em login, logout e operações.
 * @dependencies vitest, lib/admin/auth, app/api/admin/preview/route, app/api/admin/auth/logout/route
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { TEST_ADMIN_ID, TEST_OTHER_ID } = vi.hoisted(() => ({
  TEST_ADMIN_ID: '11111111-1111-4111-8111-111111111111',
  TEST_OTHER_ID: '22222222-2222-4222-8222-222222222222',
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: TEST_ADMIN_ID,
    adminEmail: 'a3qua96@gmail.com',
    sanityStudioUrl: 'https://gradualinfo.sanity.studio',
    previewSecret: 'teste-segredo-preview-1234567890123456',
    previewSigningKey: 'chave-assinatura-preview-1234567890123456',
    previewUserId: TEST_ADMIN_ID,
    isProduction: false,
    supabase: {
      url: 'http://127.0.0.1:54321',
      anonKey: 'fake-anon-key',
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
  }),
}));

const mockSupabaseAuth = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  mfa: {
    getAuthenticatorAssuranceLevel: vi.fn(),
    enroll: vi.fn(),
    challengeAndVerify: vi.fn(),
    listFactors: vi
      .fn()
      .mockResolvedValue({ data: { all: [], totp: [] }, error: null }),
  },
}));

vi.mock('@/lib/admin/audit-service', () => ({
  recordAdminAudit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: mockSupabaseAuth,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  }),
}));

vi.mock('@/lib/preview/durable-object', () => ({
  getPreviewSessionStore: () => ({
    createSession: vi.fn().mockResolvedValue(undefined),
    isSessionValid: vi.fn().mockResolvedValue(true),
    revokeSession: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { env } from '@/lib/env';
import {
  checkAdminUser,
  resolveSafeRedirectBase,
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
  assertAdminApiAuth,
} from '@/lib/admin/auth';
import { POST as adminLogoutPost } from '@/app/api/admin/auth/logout/route';
import { POST as adminPreviewPost } from '@/app/api/admin/preview/route';

describe('Painel Administrativo — Autorização e MFA (Spec 0007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Sanitização estrita de redirecionamento pós-login', () => {
    it('aceita a raiz do painel administrativo exata', () => {
      expect(sanitizeAdminRedirect('/admin-dashboard')).toBe(
        '/admin-dashboard',
      );
    });

    it('aceita subcaminhos válidos do painel', () => {
      expect(sanitizeAdminRedirect('/admin-dashboard/mfa/setup')).toBe(
        '/admin-dashboard/mfa/setup',
      );
      expect(sanitizeAdminRedirect('/admin-dashboard/artigos')).toBe(
        '/admin-dashboard/artigos',
      );
    });

    it('rejeita prefixos colidentes fraudulentos como /admin-dashboard-falso', () => {
      expect(sanitizeAdminRedirect('/admin-dashboard-falso')).toBe(
        '/admin-dashboard',
      );
      expect(sanitizeAdminRedirect('/admin-dashboard-phishing/login')).toBe(
        '/admin-dashboard',
      );
    });

    it('rejeita open-redirect com protocolo absoluto ou barras duplas', () => {
      expect(sanitizeAdminRedirect('https://evil.com/admin-dashboard')).toBe(
        '/admin-dashboard',
      );
      expect(sanitizeAdminRedirect('//evil.com')).toBe('/admin-dashboard');
      expect(sanitizeAdminRedirect('javascript:alert(1)')).toBe(
        '/admin-dashboard',
      );
      expect(sanitizeAdminRedirect('\\\\evil.com')).toBe('/admin-dashboard');
    });

    it('rejeita valores nulos, vazios ou indefinidos caindo no padrão seguro', () => {
      expect(sanitizeAdminRedirect(null)).toBe('/admin-dashboard');
      expect(sanitizeAdminRedirect(undefined)).toBe('/admin-dashboard');
      expect(sanitizeAdminRedirect('')).toBe('/admin-dashboard');
      expect(sanitizeAdminRedirect('   ')).toBe('/admin-dashboard');
    });
  });

  describe('1.1 Resolução segura de URL base (mitigação de Host Header Injection)', () => {
    it('mantém o host do portal quando coincide com SITE_ORIGIN', () => {
      const req = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          headers: {
            host: 'gradualinfo.com.br',
            'x-forwarded-proto': 'https',
          },
        },
      );
      expect(resolveSafeRedirectBase(req)).toBe('https://gradualinfo.com.br');
    });

    it('permite origens locais legítimas (localhost e 127.0.0.1) em ambiente de teste', () => {
      const localReq1 = new Request(
        'http://localhost:3000/api/admin/auth/login',
        {
          headers: { host: 'localhost:3000' },
        },
      );
      expect(resolveSafeRedirectBase(localReq1)).toBe('http://localhost:3000');

      const localReq2 = new Request(
        'http://127.0.0.1:3000/api/admin/auth/login',
        {
          headers: { host: '127.0.0.1:3000' },
        },
      );
      expect(resolveSafeRedirectBase(localReq2)).toBe('http://127.0.0.1:3000');
    });

    it('bloqueia host arbitrário forjado (Host Header Injection) e faz fallback para SITE_ORIGIN', () => {
      const evilReq = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
        {
          headers: {
            host: 'evil-attacker.com',
            'x-forwarded-proto': 'https',
          },
        },
      );
      expect(resolveSafeRedirectBase(evilReq)).toBe(
        'https://gradualinfo.com.br',
      );
    });

    it('bloqueia localhost em ambiente de produção e recorre exclusivamente a SITE_ORIGIN', () => {
      // Simula ambiente de produção temporariamente
      const prevIsProd = (env as unknown as { isProduction: boolean })
        .isProduction;
      try {
        (env as unknown as { isProduction: boolean }).isProduction = true;

        const prodLocalReq = new Request(
          'https://gradualinfo.com.br/api/admin/auth/login',
          {
            headers: { host: 'localhost:3000' },
          },
        );
        // Em produção, localhost NÃO é aceito e cai estritamente no SITE_ORIGIN
        expect(resolveSafeRedirectBase(prodLocalReq)).toBe(
          'https://gradualinfo.com.br',
        );
      } finally {
        (env as unknown as { isProduction: boolean }).isProduction = prevIsProd;
      }
    });

    it('retorna fallback seguro quando o cabeçalho host está ausente', () => {
      const noHostReq = new Request(
        'https://gradualinfo.com.br/api/admin/auth/login',
      );
      expect(resolveSafeRedirectBase(noHostReq)).toBe(
        'https://gradualinfo.com.br',
      );
    });
  });

  describe('2. Validação de origem contra requisições forjadas (CSRF)', () => {
    it('aprova requisição com cabeçalho Origin correspondente ao SITE_ORIGIN', () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { origin: 'https://gradualinfo.com.br' },
        },
      );
      expect(validateAdminRequestOrigin(request)).toBe(true);
    });

    it('aprova requisição com Referer correspondente ao SITE_ORIGIN', () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { referer: 'https://gradualinfo.com.br/admin-dashboard' },
        },
      );
      expect(validateAdminRequestOrigin(request)).toBe(true);
    });

    it('rejeita requisição com Origin fraudulento de domínio externo', () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { origin: 'https://attacker.example.com' },
        },
      );
      expect(validateAdminRequestOrigin(request)).toBe(false);
    });

    it('rejeita requisição com Referer fraudulento de domínio externo', () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { referer: 'https://attacker.example.com/phishing' },
        },
      );
      expect(validateAdminRequestOrigin(request)).toBe(false);
    });
  });

  describe('3. Verificação no servidor e escada de MFA (checkAdminUser)', () => {
    it('cenário: acesso anônimo retorna unauthenticated', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('unauthenticated');
      }
    });

    it('cenário: sessão expirada ou erro do Supabase retorna unauthenticated', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('JWT expired'),
          }),
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('unauthenticated');
      }
    });

    it('cenário: usuário autenticado com UUID divergente retorna unauthorized', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_OTHER_ID,
                email: 'outro-usuario@dominio.com',
              },
            },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        })),
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('unauthorized');
        expect(result.user?.id).toBe(TEST_OTHER_ID);
      }
    });

    it('cenário: administrador sem nenhum fator TOTP cadastrado exige matrícula (mfa_enrollment_required)', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_ADMIN_ID,
                email: 'a3qua96@gmail.com',
              },
            },
            error: null,
          }),
          mfa: {
            getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
              data: {
                currentLevel: 'aal1',
                nextLevel: 'aal1', // Sem TOTP cadastrado
              },
              error: null,
            }),
            listFactors: vi.fn().mockResolvedValue({
              data: { all: [], totp: [] },
              error: null,
            }),
          },
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('mfa_enrollment_required');
      }
    });

    it('cenário: administrador com TOTP cadastrado mas sessão AAL1 exige desafio (mfa_challenge_required)', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_ADMIN_ID,
                email: 'a3qua96@gmail.com',
              },
            },
            error: null,
          }),
          mfa: {
            getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
              data: {
                currentLevel: 'aal1', // Login com senha pendente de 2FA
                nextLevel: 'aal2',
              },
              error: null,
            }),
            listFactors: vi.fn().mockResolvedValue({
              data: {
                all: [
                  { id: 'factor-id', factor_type: 'totp', status: 'verified' },
                ],
                totp: [
                  { id: 'factor-id', factor_type: 'totp', status: 'verified' },
                ],
              },
              error: null,
            }),
          },
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('mfa_challenge_required');
      }
    });

    it('cenário: fator TOTP pendente de verificação também exige desafio, nunca setup (regressão de re-enroll)', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_ADMIN_ID,
                email: 'a3qua96@gmail.com',
              },
            },
            error: null,
          }),
          mfa: {
            getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
              data: {
                currentLevel: 'aal1',
                nextLevel: 'aal1', // Fator pendente deixa nextLevel em aal1
              },
              error: null,
            }),
            listFactors: vi.fn().mockResolvedValue({
              data: {
                all: [
                  {
                    id: 'factor-pendente',
                    factor_type: 'totp',
                    status: 'unverified',
                  },
                ],
                totp: [], // Bucket totp só lista fatores verificados
              },
              error: null,
            }),
          },
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('mfa_challenge_required');
      }
    });

    it('cenário: administrador com sessão em AAL2 autoriza com sucesso', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: TEST_ADMIN_ID,
                email: 'a3qua96@gmail.com',
              },
            },
            error: null,
          }),
          mfa: {
            getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
              data: {
                currentLevel: 'aal2',
                nextLevel: 'aal2',
              },
              error: null,
            }),
          },
        },
      } as any;

      const result = await checkAdminUser(mockClient);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.aal).toBe('aal2');
        expect(result.user.id).toBe(TEST_ADMIN_ID);
      }
    });

    it('cenário: falha fechada absoluta quando ADMIN_USER_ID está ausente no servidor (config_missing)', async () => {
      const { env } = await import('@/lib/env');
      const originalId = env.adminUserId;
      (env as any).adminUserId = '';

      try {
        const mockClient = {
          auth: {
            getUser: vi.fn(),
          },
        } as any;

        const result = await checkAdminUser(mockClient);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('config_missing');
        }
        expect(mockClient.auth.getUser).not.toHaveBeenCalled();
      } finally {
        (env as any).adminUserId = originalId;
      }
    });
  });

  describe('4. Guarda em cada operação e emissão de preview restrita a AAL2', () => {
    it('rejeita logout se a origem for ilegítima (CSRF)', async () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { origin: 'https://attacker.example.com' },
        },
      );

      const response = await adminLogoutPost(request);
      expect(response.status).toBe(403);
    });

    it('rejeita emissão de preview em /api/admin/preview se a origem for ilegítima', async () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: { origin: 'https://attacker.example.com' },
        },
      );

      const response = await adminPreviewPost(request);
      expect(response.status).toBe(403);
    });

    it('rejeita slug de preview com caracteres maliciosos ou formato inválido', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'a3qua96@gmail.com' } },
        error: null,
      });
      mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        error: null,
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ slug: '../../etc/passwd' }),
        },
      );

      const response = await adminPreviewPost(request);
      expect(response.status).toBe(400);
    });

    it('emite preview e cookie seguro com sucesso quando administrador possui AAL2', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'a3qua96@gmail.com' } },
        error: null,
      });
      mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        error: null,
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ slug: 'meu-artigo-teste' }),
        },
      );

      const response = await adminPreviewPost(request);
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(
        'https://gradualinfo.com.br/artigos/meu-artigo-teste',
      );
      expect(response.cookies.get('gradualinfo-preview')?.value).toBeDefined();
    });

    it('rejeita emissão de preview se sessão do administrador estiver apenas em AAL1', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'a3qua96@gmail.com' } },
        error: null,
      });
      mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal2' },
        error: null,
      });
      mockSupabaseAuth.mfa.listFactors.mockResolvedValue({
        data: {
          all: [{ id: 'factor-id', factor_type: 'totp', status: 'verified' }],
          totp: [{ id: 'factor-id', factor_type: 'totp', status: 'verified' }],
        },
        error: null,
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ slug: 'meu-artigo-teste' }),
        },
      );

      const response = await adminPreviewPost(request);
      expect(response.status).toBe(403);
    });

    it('rejeita emissão de preview para usuário autenticado com UUID não autorizado', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: TEST_OTHER_ID, email: 'invasor@dominio.com' } },
        error: null,
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ slug: 'meu-artigo-teste' }),
        },
      );

      const response = await adminPreviewPost(request);
      expect(response.status).toBe(403);
    });

    it('guarda assertAdminApiAuth falha fechado se a requisição não atender os requisitos', async () => {
      const invalidOriginRequest = new Request(
        'https://gradualinfo.com.br/api/admin/preview',
        {
          method: 'POST',
          headers: { origin: 'https://evil.com' },
        },
      );

      const res = await assertAdminApiAuth(invalidOriginRequest, 'admin');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });
  });
});

// Esta suíte isola a camada já admitida; admissão criptográfica tem suíte própria.
vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: () => {},
  getAdminAccessLogoutUrl: () =>
    'https://admin.example.test/cdn-cgi/access/logout',
}));
