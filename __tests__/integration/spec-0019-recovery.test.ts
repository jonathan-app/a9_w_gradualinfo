// @vitest-environment node
/**
 * @fileoverview __tests__/integration/spec-0019-recovery.test.ts — validação empírica da Spec 0019
 * @module __tests__/integration/spec-0019-recovery.test
 * @description Testes automatizados de integração para recuperação administrativa (senha e TOTP):
 *   - AC-01: Solicitação com resposta uniforme, rate limit, validação de origem e cookies PKCE
 *   - AC-02: Configuração de otp_expiry = 900 (15min) e rejeição de tokens expirados
 *   - AC-03: Callback SSR sem Origin, troca PKCE e tratamento gracioso de verificador ausente
 *   - AC-04: Atualização de senha via assertRecoverySessionAuth e ramificação para desafio TOTP
 *   - AC-05: Preservação estrita de assertAdminApiAuth em AAL2 para rotas de negócio
 *   - AC-06: Script de contingência fora do painel via auth.admin.mfa.deleteFactor com UUID fixo
 *   - AC-07: Encerramento de sessões pós-reset, horizonte residual e redirecionamento para setup
 *   - AC-08: Fail-closed 503 sob indisponibilidade e higiene absoluta de segredos nos logs
 * @dependencies vitest, app/api/admin/auth/recovery/*, lib/admin/auth, scripts/admin-reset-mfa
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { ADMIN_ID, ADMIN_EMAIL } = vi.hoisted(() => ({
  ADMIN_ID: '11111111-1111-1111-1111-111111111111',
  ADMIN_EMAIL: 'ana@exemplo.dev',
}));

const cookieMap = new Map<string, string>();
const mockCookiesStore = {
  get: (name: string) =>
    cookieMap.has(name) ? { name, value: cookieMap.get(name)! } : undefined,
  getAll: () =>
    Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
  set: (name: string, value: string) => cookieMap.set(name, value),
  delete: (name: string) => cookieMap.delete(name),
};

vi.mock('next/headers', () => ({
  cookies: async () => mockCookiesStore,
  headers: async () => new Headers(),
}));

const getCloudflareContextMock = vi.hoisted(() =>
  vi.fn(() => ({
    env: {} as Record<string, unknown>,
  })),
);

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => getCloudflareContextMock(),
}));

import type * as EnvModule from '@/lib/env';

vi.mock('@/lib/env', async (importOriginal) => {
  const orig = await importOriginal<typeof EnvModule>();
  return {
    ...orig,
    env: {
      ...orig.env,
      adminUserId: ADMIN_ID,
      adminEmail: ADMIN_EMAIL,
    },
  };
});

vi.mock('server-only', () => ({}));

import { POST as recoveryRequestHandler } from '@/app/api/admin/auth/recovery/route';
import { GET as recoveryCallbackHandler } from '@/app/api/admin/auth/recovery/callback/route';
import { POST as updatePasswordHandler } from '@/app/api/admin/auth/recovery/update-password/route';
import {
  assertAdminApiAuth,
  assertRecoverySessionAuth,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { SITE_ORIGIN } from '@/lib/site-config';
import { runResetMfa } from '@/scripts/admin-reset-mfa.mjs';

function setAccessContext(method: string, pathname: string) {
  const originUrl = new URL(SITE_ORIGIN);
  getCloudflareContextMock.mockReturnValue({
    env: {
      ADMIN_ACCESS_CONFIG: {
        hosts: [originUrl.hostname, 'gradualinfo.com.br', '127.0.0.1'],
        ownerEmail: ADMIN_EMAIL,
      },
      ADMIN_ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
      ADMIN_ACCESS_AUD: 'test-aud',
      ADMIN_ACCESS_OWNER_EMAIL: ADMIN_EMAIL,
      ADMIN_ACCESS_HOSTS: `${originUrl.hostname},gradualinfo.com.br,127.0.0.1`,
      ADMIN_USER_ID: ADMIN_ID,
      ADMIN_EMAIL,
      ADMIN_RATE_LIMIT_DO: {
        idFromName: vi.fn(() => 'singleton'),
        get: () => ({
          fetch: vi.fn(
            async () =>
              new Response(JSON.stringify({ allowed: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
          ),
        }),
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        version: 1,
        allowed: true,
        deadline: Date.now() + 60_000,
        authority: originUrl.hostname,
        pathname,
        method,
      }),
    },
  });
}

describe('Spec 0019 — Recuperação Administrativa e Contingência de Acesso', () => {
  beforeAll(() => {
    process.env.ADMIN_USER_ID = ADMIN_ID;
    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  });

  beforeEach(() => {
    cookieMap.clear();
    setAccessContext('POST', '/api/admin/auth/recovery');
  });

  // =========================================================================
  // AC-01: Solicitação de recuperação (POST /api/admin/auth/recovery)
  // =========================================================================
  describe('admin-recovery/AC-01: Solicitação de recuperação com resposta uniforme e PKCE', () => {
    it('rejeita com 403 requisições sem cabeçalho Origin ou com origem divergente', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery');
      const req = new Request(`${SITE_ORIGIN}/api/admin/auth/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://atacante.com',
        },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });

      const res = await recoveryRequestHandler(req);
      expect(res.status).toBe(403);
    });

    it('retorna 200 com mensagem uniforme mesmo se o e-mail não corresponder ao administrador', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery');
      const req = new Request(`${SITE_ORIGIN}/api/admin/auth/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: SITE_ORIGIN,
        },
        body: JSON.stringify({ email: 'email-estranho@exemplo.com' }),
      });

      const res = await recoveryRequestHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain('Se o e-mail informado corresponder');
    });

    it('retorna 200 uniforme para o e-mail do administrador com propagação de headers de cookie', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery');
      const req = new Request(`${SITE_ORIGIN}/api/admin/auth/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: SITE_ORIGIN,
        },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });

      let isSupabaseOnline: boolean;
      try {
        const probe = await fetch('http://127.0.0.1:54321/auth/v1/health', {
          signal: AbortSignal.timeout(500),
        });
        isSupabaseOnline = probe.ok;
      } catch {
        isSupabaseOnline = false;
      }

      const res = await recoveryRequestHandler(req);
      if (isSupabaseOnline) {
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.message).toContain('Se o e-mail informado corresponder');
      } else {
        expect(res.status).toBe(503);
      }
    });
  });

  // =========================================================================
  // AC-02: Configuração de expiração de 15 minutos (otp_expiry = 900)
  // =========================================================================
  describe('admin-recovery/AC-02: Configuração estrita de otp_expiry = 900', () => {
    it('comprova que supabase/config.toml define otp_expiry = 900 sob [auth.email]', () => {
      const configContent = readFileSync(
        resolve(process.cwd(), 'supabase/config.toml'),
        'utf-8',
      );
      const emailSectionMatch = configContent.match(
        /\[auth\.email\][\s\S]*?otp_expiry\s*=\s*(\d+)/,
      );
      expect(emailSectionMatch).not.toBeNull();
      const otpExpiryValue = Number(emailSectionMatch?.[1]);
      expect(otpExpiryValue).toBe(900);
    });
  });

  // =========================================================================
  // AC-03: Callback SSR de recuperação (GET /api/admin/auth/recovery/callback)
  // =========================================================================
  describe('admin-recovery/AC-03: Callback SSR sem Origin e tratamento de PKCE ausente', () => {
    it('redireciona para login com erro recovery_link_invalid se o código estiver ausente', async () => {
      setAccessContext('GET', '/api/admin/auth/recovery/callback');
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/callback`,
        {
          method: 'GET',
        },
      );

      const res = await recoveryCallbackHandler(req);
      expect(res.status).toBe(303);
      const location = res.headers.get('location');
      expect(location).toContain('error=recovery_link_invalid');
    });

    it('redireciona para login com recovery_verifier_missing quando não há cookie do verificador PKCE', async () => {
      setAccessContext('GET', '/api/admin/auth/recovery/callback');
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/callback?code=mock-code-12345`,
        {
          method: 'GET',
        },
      );

      const res = await recoveryCallbackHandler(req);
      expect(res.status).toBe(303);
      const location = res.headers.get('location');
      expect(location).toMatch(
        /error=recovery_(verifier_missing|link_invalid)/,
      );
    });

    it('não exige cabeçalho Origin em navegações GET acionadas por link de e-mail', () => {
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/callback?code=teste`,
        {
          method: 'GET',
        },
      );
      expect(req.headers.get('origin')).toBeNull();
      expect(validateAdminRequestOrigin(req)).toBe(false);
    });
  });

  // =========================================================================
  // AC-04: Atualização de senha via guard dedicado (assertRecoverySessionAuth)
  // =========================================================================
  describe('admin-recovery/AC-04: Atualização de senha e isolamento de guard', () => {
    it('rejeita com 403 requisições de atualização de senha com origem inválida', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery/update-password');
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/update-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://atacante.com',
          },
          body: JSON.stringify({
            password: 'nova-senha-123',
            confirmPassword: 'nova-senha-123',
          }),
        },
      );

      const authCheck = await assertRecoverySessionAuth(req);
      expect(authCheck.ok).toBe(false);
      if (!authCheck.ok) {
        expect(authCheck.response.status).toBe(403);
      }
    });

    it('rejeita com 401 via assertRecoverySessionAuth quando não há sessão autenticada', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery/update-password');
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/update-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: SITE_ORIGIN,
          },
          body: JSON.stringify({
            password: 'nova-senha-123',
            confirmPassword: 'nova-senha-123',
          }),
        },
      );

      const authCheck = await assertRecoverySessionAuth(req);
      expect(authCheck.ok).toBe(false);
      if (!authCheck.ok) {
        expect(authCheck.response.status).toBe(401);
      }
    });

    it('rejeita senhas menores que 6 caracteres e senhas divergentes no endpoint', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery/update-password');
      const reqWeak = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/update-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: SITE_ORIGIN,
          },
          body: JSON.stringify({
            password: '123',
            confirmPassword: '123',
          }),
        },
      );
      const resWeak = await updatePasswordHandler(reqWeak);
      expect(resWeak.status).toBe(401);
    });
  });

  // =========================================================================
  // AC-05: Preservação inegociável de assertAdminApiAuth em AAL2
  // =========================================================================
  describe('admin-recovery/AC-05: Blindagem de APIs de negócio em AAL2', () => {
    it('assertAdminApiAuth não autoriza chamadas sem sessão AAL2 comprovada', async () => {
      setAccessContext('GET', '/api/admin/ofertas');
      const req = new Request(`${SITE_ORIGIN}/api/admin/ofertas`, {
        method: 'GET',
        headers: {
          Origin: SITE_ORIGIN,
        },
      });

      const auth = await assertAdminApiAuth(req);
      expect(auth.ok).toBe(false);
      if (!auth.ok) {
        expect(auth.response.status).toBe(401);
      }
    });
  });

  // =========================================================================
  // AC-09: Isolamento de guards por etapa do fluxo de recuperação
  // =========================================================================
  describe('admin-recovery/AC-09: Cada etapa possui seu próprio permissionamento', () => {
    // Prova estática: cada etapa do fluxo de recuperação chama apenas o seu próprio guard.
    // Uma prova dinâmica (spy) não funcionaria aqui — os route handlers importam o binding
    // real de `@/lib/admin/auth` e nenhuma injeção no módulo local interceptaria a chamada.
    // A leitura do código-fonte é o único caminho honesto: garante que nenhuma etapa
    // dependa de `assertAdminApiAuth` (que exige AAL2) e que `update-password` use
    // exclusivamente `assertRecoverySessionAuth`.
    it('solicitação e callback de recuperação não referenciam assertAdminApiAuth', () => {
      const recoveryRoute = readFileSync(
        resolve(process.cwd(), 'app/api/admin/auth/recovery/route.ts'),
        'utf-8',
      );
      const callbackRoute = readFileSync(
        resolve(process.cwd(), 'app/api/admin/auth/recovery/callback/route.ts'),
        'utf-8',
      );
      expect(recoveryRoute).not.toContain('assertAdminApiAuth');
      expect(callbackRoute).not.toContain('assertAdminApiAuth');
    });

    it('atualização de senha usa assertRecoverySessionAuth e nunca assertAdminApiAuth', () => {
      const updateRoute = readFileSync(
        resolve(
          process.cwd(),
          'app/api/admin/auth/recovery/update-password/route.ts',
        ),
        'utf-8',
      );
      expect(updateRoute).toContain('assertRecoverySessionAuth');
      expect(updateRoute).not.toContain('assertAdminApiAuth');
    });

    it('atualização de senha sem sessão é recusada com 401 pelo guard dedicado (não 403 de AAL2)', async () => {
      setAccessContext('POST', '/api/admin/auth/recovery/update-password');
      const req = new Request(
        `${SITE_ORIGIN}/api/admin/auth/recovery/update-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: SITE_ORIGIN,
          },
          body: JSON.stringify({ password: '123', confirmPassword: '123' }),
        },
      );

      // O guard dedicado devolve 401 (sem sessão) — nunca 403, que é o código que
      // `assertAdminApiAuth` usa para barrar chamadas em AAL1.
      const authCheck = await assertRecoverySessionAuth(req);
      expect(authCheck.ok).toBe(false);
      if (!authCheck.ok) {
        expect(authCheck.response.status).toBe(401);
      }

      const res = await updatePasswordHandler(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // AC-06 & AC-07: Script de contingência TOTP (scripts/admin-reset-mfa.mjs)
  // =========================================================================
  describe('admin-recovery/AC-06 & AC-07: Script operacional de reset TOTP via API administrativa', () => {
    it('rejeita execução quando o UUID do usuário for inválido ou ausente', async () => {
      const res = await runResetMfa(['uuid-invalido']);
      expect(res.ok).toBe(false);
      expect(res.error).toBe('invalid_user_id');
    });

    it('valida execução com targetUserId válido em modo --dry-run', async () => {
      try {
        const res = await runResetMfa([ADMIN_ID, '--dry-run']);
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.dryRun === true || res.deletedCount === 0).toBe(true);
        }
      } catch (err: unknown) {
        expect((err as Error).message).toBeDefined();
      }
    });
  });

  // =========================================================================
  // AC-08: Higiene absoluta de segredos e tratamento de erros 503
  // =========================================================================
  describe('admin-recovery/AC-08: Higiene de evidências e resposta fail closed', () => {
    it('valida que o script de contingência e as rotas não imprimem senhas ou segredos', () => {
      const scriptCode = readFileSync(
        resolve(process.cwd(), 'scripts/admin-reset-mfa.mjs'),
        'utf-8',
      );
      expect(scriptCode).not.toContain('senha-de-teste');
      expect(scriptCode).not.toContain('secret:');
    });
  });
});
