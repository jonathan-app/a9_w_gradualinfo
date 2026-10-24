/**
 * @fileoverview lib/admin/auth.ts — autorização e guarda de segurança administrativa
 * @module lib/admin/auth
 * @description Módulo de verificação no servidor para rotas e APIs sob /admin-dashboard.
 *   Implementa controle unário restrito ao UUID fixo do administrador único (fail-closed),
 *   exigência em camadas de autenticação multifator (MFA/TOTP com AAL2), validação de origem
 *   e sanitização estrita de redirecionamento interno.
 * @dependencies @/lib/env, @/lib/site-config, @/lib/supabase/server
 */

import { guardAdminAccess } from './access-guard';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'editor' | 'revisor';

export type AdminAuthFailureReason =
  | 'access_unavailable'
  | 'config_missing'
  | 'unauthenticated'
  | 'unauthorized'
  | 'role_unavailable'
  | 'mfa_enrollment_required'
  | 'mfa_challenge_required';

export type AdminAuthResult =
  | { ok: true; user: User; role: AdminRole; aal: 'aal2' }
  | {
      ok: false;
      reason: AdminAuthFailureReason;
      user?: User;
      currentAal?: string;
    };

/** Cliente Supabase do servidor, conforme `createClient` de `@/lib/supabase/server`. */
export type AdminSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resultado da avaliação da escada de MFA de uma sessão administrativa.
 */
export type AdminMfaLadder =
  | { action: 'ok' }
  | { action: 'setup'; currentAal: string }
  | { action: 'verify'; currentAal: string };

/**
 * Valida se um papel concedido satisfaz a exigencia hierarquica minima.
 * A hierarquia cumulativa define que admin satisfaz tudo, editor satisfaz editor e revisor,
 * e revisor satisfaz unicamente revisor.
 *
 * @param actual - Papel atual atribuido ao operador.
 * @param required - Papel minimo exigido pela rota ou operacao.
 * @returns Verdadeiro caso o papel atenda aos privilegios requeridos.
 */
export function roleSatisfies(actual: AdminRole, required: AdminRole): boolean {
  if (actual === 'admin') return true;
  if (actual === 'editor')
    return required === 'editor' || required === 'revisor';
  if (actual === 'revisor') return required === 'revisor';
  return false;
}

/**
 * Resolve o papel administrativo de um usuario autenticado.
 * A conta raiz definida em env.adminUserId e sempre reconhecida como admin.
 * Demais usuarios tem seu papel consultado na tabela isolada admin_user_roles.
 *
 * @param supabase - Cliente Supabase do servidor.
 * @param user - Objeto de usuario autenticado do Supabase Auth.
 * @returns Papel atribuido ou null se o usuario nao tiver papel no painel.
 */
export async function resolveAdminRole(
  supabase: AdminSupabaseClient,
  user: User,
): Promise<AdminRole | null> {
  const adminId = env.adminUserId.trim();
  if (adminId && user.id === adminId) {
    return 'admin';
  }

  try {
    const { data, error } = await supabase
      .from('admin_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao consultar papel do usuario: ${error.message}`);
    }

    if (
      data?.role === 'admin' ||
      data?.role === 'editor' ||
      data?.role === 'revisor'
    ) {
      return data.role;
    }

    return null;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Falha ao consultar')) {
      throw err;
    }
    throw new Error(
      'Falha de infraestrutura ao resolver papel administrativo.',
      {
        cause: err,
      },
    );
  }
}

/**
 * Decide o próximo degrau da escada MFA a partir do estado real da sessão.
 *
 * A distinção correta entre "sem fator" e "fator pendente" é essencial: um
 * TOTP matriculado mas ainda não verificado mantém `currentLevel` e `nextLevel`
 * em aal1 no `getAuthenticatorAssuranceLevel` — tratá-lo como ausência de fator
 * faria o guard voltar ao setup, re-enrollar e travar com 422 de conflito.
 * Por isso a presença de fator vem de `listFactors().data.all` (que inclui
 * fatores `unverified`; o bucket `totp` só lista os verificados).
 *
 * @param supabase - Cliente Supabase do servidor já autenticado.
 * @returns O próximo degrau: `ok` (aal2 comprovado), `setup` ou `verify`.
 */
export async function resolveAdminMfaLadder(
  supabase: AdminSupabaseClient,
): Promise<AdminMfaLadder> {
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || !aalData?.currentLevel)
    throw new Error('Estado MFA indisponível.');
  const currentAal = aalData.currentLevel;

  // Sessão já comprovada em AAL2: nada a exigir do fator.
  if (currentAal === 'aal2') {
    return { action: 'ok' };
  }

  const { data: factorData, error: factorError } =
    await supabase.auth.mfa.listFactors();
  if (factorError || !factorData) throw new Error('Estado MFA indisponível.');
  const factors = factorData?.all ?? [];
  const hasTotpFactor = factors.some(
    (factor: { factor_type: string }) => factor.factor_type === 'totp',
  );

  return hasTotpFactor
    ? { action: 'verify', currentAal }
    : { action: 'setup', currentAal };
}

/**
 * Sanitiza o destino de redirecionamento pós-login.
 *
 * Restringe destinos estritamente a `/admin-dashboard` ou caminhos iniciando
 * com `/admin-dashboard/`. Rejeita qualquer prefixo falso (como `/admin-dashboard-falso`),
 * URLs externas com protocolo, ou esquemas com barra dupla (`//`) contra open-redirect.
 *
 * @param target - Caminho recebido via parâmetro de busca ou formulário.
 * @returns Caminho interno seguro garantido.
 */
export function sanitizeAdminRedirect(
  target: string | null | undefined,
): string {
  if (!target || typeof target !== 'string') {
    return '/admin-dashboard';
  }

  const trimmed = target.trim();

  // Rejeita protocolos absolutos, barras duplas e esquemas perigosos
  if (
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    trimmed.includes('\\')
  ) {
    return '/admin-dashboard';
  }

  // Aceita estritamente /admin-dashboard ou /admin-dashboard/...
  if (
    trimmed === '/admin-dashboard' ||
    trimmed.startsWith('/admin-dashboard/')
  ) {
    return trimmed;
  }

  return '/admin-dashboard';
}

/**
 * Valida a origem da requisição contra o domínio do portal.
 *
 * @param request - Requisição HTTP recebida.
 * @returns `true` se o cabeçalho Origin ou Referer corresponder a SITE_ORIGIN.
 */
export function validateAdminRequestOrigin(request: Request): boolean {
  const isAllowedOrigin = (targetOrigin: string, reqUrl: URL): boolean => {
    if (targetOrigin === new URL(SITE_ORIGIN).origin) {
      return true;
    }
    try {
      const targetUrl = new URL(targetOrigin);
      const isLocalTarget = ['localhost', '127.0.0.1'].includes(
        targetUrl.hostname,
      );
      const isLocalReq = ['localhost', '127.0.0.1'].includes(reqUrl.hostname);
      if (!env.isProduction && isLocalTarget && isLocalReq) {
        const targetPort =
          targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80');
        const reqPort =
          reqUrl.port || (reqUrl.protocol === 'https:' ? '443' : '80');
        return targetPort === reqPort && targetUrl.protocol === reqUrl.protocol;
      }
    } catch {
      // Ignora erro de parsing
    }
    return false;
  };

  try {
    const reqUrl = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin) {
      return isAllowedOrigin(origin, reqUrl);
    }

    const referer = request.headers.get('referer');
    if (referer) {
      const parsed = new URL(referer);
      return isAllowedOrigin(parsed.origin, reqUrl);
    }
  } catch {
    return false;
  }

  // Ausência dos dois cabeçalhos não comprova origem nem autoriza mutação.
  return false;
}

/**
 * Resolve a URL base segura para redirecionamentos no painel administrativo,
 * mitigando vulnerabilidades de Host Header Injection e Open Redirect.
 *
 * Em produção (env.isProduction), os redirecionamentos utilizam exclusivamente
 * a origem canônica configurada e validada (SITE_ORIGIN).
 * Apenas em desenvolvimento e testes locais (!env.isProduction) é permitida
 * a exceção para hosts locais controlados (localhost e 127.0.0.1).
 *
 * @param request - Requisição HTTP recebida.
 * @returns Origem base segura validada para construção de URLs de redirecionamento.
 */
export function resolveSafeRedirectBase(request: Request): string {
  const allowedSiteUrl = new URL(SITE_ORIGIN);
  const host = request.headers.get('host')?.trim();
  const proto = request.headers.get('x-forwarded-proto')?.trim() || 'http';

  // Se não houver cabeçalho Host explícito, usa a origem da própria requisição se válida, ou SITE_ORIGIN
  if (!host) {
    if (!env.isProduction || process.env.E2E_REAL_SUPABASE === '1') {
      try {
        const reqUrl = new URL(request.url);
        if (reqUrl.origin && reqUrl.origin !== 'null') {
          const isLocal = ['localhost', '127.0.0.1'].includes(
            reqUrl.hostname.toLowerCase(),
          );
          if (
            isLocal ||
            reqUrl.hostname.toLowerCase() ===
              allowedSiteUrl.hostname.toLowerCase()
          ) {
            return reqUrl.origin;
          }
        }
      } catch {
        // Ignora erro de parsing
      }
    }
    return SITE_ORIGIN;
  }

  try {
    const candidateUrl = new URL(`${proto}://${host}`);
    const candidateHostname = candidateUrl.hostname.toLowerCase();

    // 1. Host corresponde ao domínio oficial do portal (SITE_ORIGIN)
    if (
      candidateHostname === allowedSiteUrl.hostname.toLowerCase() &&
      (candidateUrl.port === allowedSiteUrl.port ||
        (!candidateUrl.port && !allowedSiteUrl.port))
    ) {
      if (allowedSiteUrl.protocol === 'https:' && proto !== 'https') {
        return allowedSiteUrl.origin;
      }
      return candidateUrl.origin;
    }

    // 2. Exceção de localhost e 127.0.0.1 estritamente restrita a desenvolvimento e teste
    if (
      (!env.isProduction || process.env.E2E_REAL_SUPABASE === '1') &&
      ['localhost', '127.0.0.1'].includes(candidateHostname)
    ) {
      try {
        const reqUrl = new URL(request.url);
        if (
          ['localhost', '127.0.0.1'].includes(reqUrl.hostname.toLowerCase())
        ) {
          if (
            allowedSiteUrl.protocol === 'https:' &&
            candidateHostname === allowedSiteUrl.hostname.toLowerCase()
          ) {
            return allowedSiteUrl.origin;
          }
          return candidateUrl.origin;
        }
      } catch {
        // Fallback local se a requisição não puder ser parseada
        return candidateUrl.origin;
      }
    }
  } catch {
    // Falha ao parsear host recebido
  }

  // Em produção, ou quando o host não for validado: fallback estrito para SITE_ORIGIN
  return SITE_ORIGIN;
}

/**
 * Verifica no servidor o usuário autenticado e a exigência de MFA para o painel.
 *
 * Regras estritas (spec 0007):
 * 1. Fail-closed: Se `ADMIN_USER_ID` não estiver configurado, nega acesso.
 * 2. Identidade via `auth.getUser()`, exigindo `user.id === ADMIN_USER_ID`. Nunca por e-mail ou metadata.
 * 3. MFA em camadas (`resolveAdminMfaLadder`):
 *    - Fator TOTP aal2 comprovado (sessão em aal2): autoriza (`{ ok: true, aal: 'aal2' }`).
 *    - Sem nenhum fator TOTP: retorna `mfa_enrollment_required` (setup).
 *    - Com fator TOTP (verificado ou pendente) mas sessão em aal1: retorna
 *      `mfa_challenge_required` (verify). Fator pendente não vai ao setup:
 *      re-enrollar aí geraria conflito e travaria o fluxo de matrícula.
 *
 * @param customClient - Cliente Supabase opcional para injeção em testes.
 * @returns Resultado detalhado da avaliação de autorização.
 */
export async function checkAdminUser(
  customClient?: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
): Promise<AdminAuthResult | Response> {
  const admissionFailure = guardAdminAccess();
  if (admissionFailure) return admissionFailure;
  const adminId = env.adminUserId.trim();

  // Fail-closed absoluto: configuracao ausente nunca pode abrir o painel.
  // Sem ADMIN_USER_ID configurado, nao entra identidade substituta em nenhum
  // ambiente — so um harness de teste explicit pode injetar um cliente mock.
  if (!adminId) {
    return { ok: false, reason: 'config_missing' };
  }

  const supabase = customClient || (await createClient());
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, reason: 'unauthenticated' };
  }

  // Resolucao de papel administrativo (conta raiz permanente ou registro no banco)
  let role: AdminRole | null;
  try {
    role = await resolveAdminRole(supabase, data.user);
  } catch {
    return { ok: false, reason: 'role_unavailable', user: data.user };
  }

  if (!role) {
    return { ok: false, reason: 'unauthorized', user: data.user };
  }

  // Avaliacao de MFA (Multi-Factor Authentication)
  try {
    const ladder = await resolveAdminMfaLadder(supabase);

    if (ladder.action === 'ok') {
      return { ok: true, user: data.user, role, aal: 'aal2' as const };
    }

    return {
      ok: false,
      reason:
        ladder.action === 'setup'
          ? 'mfa_enrollment_required'
          : 'mfa_challenge_required',
      user: data.user,
      currentAal: ladder.currentAal,
    };
  } catch {
    // Em caso de falha de consulta do subsistema de MFA, falha fechado exigindo desafio
    return {
      ok: false,
      reason: 'mfa_challenge_required',
      user: data.user,
    };
  }
}

/**
 * Alias de conveniência para checkAdminUser, mantendo aderência ao nome usado na spec 0007.
 */
export const requireAdminAuth = checkAdminUser;

/**
 * Guarda especializada para Route Handlers e mutações sob `/api/admin/*`.
 *
 * Avalia validação de origem (CSRF), autorização cumulativa (papel + AAL2) e hierarquia de acesso.
 * O segundo argumento requiredRole é estritamente obrigatório, sem papel padrão permissivo.
 *
 * @param request - Requisição HTTP opcional para verificação de origem.
 * @param requiredRole - Papel mínimo exigido para autorizar a operação.
 * @returns Objeto com `ok: true`, `user` e `role`, ou `ok: false` com `response` formatado.
 */
export async function assertAdminApiAuth(
  request: Request | undefined,
  requiredRole: AdminRole,
): Promise<
  | { ok: true; user: User; role: AdminRole }
  | {
      ok: false;
      response: Response;
    }
> {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return { ok: false, response: admissionFailure };
  if (request && !validateAdminRequestOrigin(request)) {
    return {
      ok: false,
      response: new Response('Origem não permitida.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  const auth = await checkAdminUser();
  if (auth instanceof Response) return { ok: false, response: auth };
  if (auth.ok) {
    if (!roleSatisfies(auth.role, requiredRole)) {
      return {
        ok: false,
        response: new Response('Papel insuficiente para esta operação.', {
          status: 403,
          headers: { 'Cache-Control': 'private, no-store' },
        }),
      };
    }
    return { ok: true, user: auth.user, role: auth.role };
  }

  if (auth.reason === 'config_missing') {
    return {
      ok: false,
      response: new Response(
        'Configuração administrativa ausente no servidor.',
        {
          status: 500,
          headers: { 'Cache-Control': 'private, no-store' },
        },
      ),
    };
  }

  if (auth.reason === 'unauthenticated') {
    return {
      ok: false,
      response: new Response('Autenticação necessária.', {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  if (auth.reason === 'role_unavailable') {
    return {
      ok: false,
      response: new Response('Serviço de autorização indisponível.', {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  if (auth.reason === 'unauthorized') {
    return {
      ok: false,
      response: new Response('Acesso negado.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  // mfa_enrollment_required ou mfa_challenge_required
  return {
    ok: false,
    response: new Response(
      'Autenticação de segundo fator (MFA/AAL2) obrigatória.',
      {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    ),
  };
}

/**
 * Alias de conveniência para assertAdminApiAuth, unificando a guarda de sessão administrativa.
 */
export const requireAdminSession = assertAdminApiAuth;

/**
 * Guarda especializada para mutações sob a sessão de recuperação (/api/admin/auth/recovery/update-password).
 * Valida origem (CSRF), admissão Access e identidade estrita do administrador único,
 * sem exigir AAL2 (já que a sessão de recuperação nasce em AAL1).
 *
 * @param request - Requisição HTTP recebida.
 * @returns Objeto com `ok: true` e `user`, ou `ok: false` com `response` formatado.
 */
export async function assertRecoverySessionAuth(request?: Request): Promise<
  | { ok: true; user: User }
  | {
      ok: false;
      response: Response;
    }
> {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return { ok: false, response: admissionFailure };
  if (request && !validateAdminRequestOrigin(request)) {
    return {
      ok: false,
      response: new Response('Origem não permitida.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  const adminId = env.adminUserId.trim();
  if (!adminId) {
    return {
      ok: false,
      response: new Response(
        'Configuração administrativa ausente no servidor.',
        {
          status: 500,
          headers: { 'Cache-Control': 'private, no-store' },
        },
      ),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      response: new Response('Autenticação necessária.', {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  if (data.user.id !== adminId) {
    return {
      ok: false,
      response: new Response('Acesso negado.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }

  return { ok: true, user: data.user };
}
