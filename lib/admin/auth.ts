/**
 * @fileoverview lib/admin/auth.ts — autorização e guarda de segurança administrativa
 * @module lib/admin/auth
 * @description Módulo de verificação no servidor para rotas e APIs sob /admin-dashboard.
 *   Implementa controle unário restrito ao UUID fixo do administrador único (fail-closed),
 *   exigência em camadas de autenticação multifator (MFA/TOTP com AAL2), validação de origem
 *   e sanitização estrita de redirecionamento interno.
 * @dependencies @/lib/env, @/lib/site-config, @/lib/supabase/server
 */

import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type AdminAuthFailureReason =
  | 'config_missing'
  | 'unauthenticated'
  | 'unauthorized'
  | 'mfa_enrollment_required'
  | 'mfa_challenge_required';

export type AdminAuthResult =
  | { ok: true; user: User; aal: 'aal2' }
  | {
      ok: false;
      reason: AdminAuthFailureReason;
      user?: User;
      currentAal?: string;
    };

/** Cliente Supabase do servidor, conforme `createClient` de `@/lib/supabase/server`. */
type AdminSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resultado da avaliação da escada de MFA de uma sessão administrativa.
 */
export type AdminMfaLadder =
  | { action: 'ok' }
  | { action: 'setup'; currentAal: string }
  | { action: 'verify'; currentAal: string };

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
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentAal = aalData?.currentLevel || 'aal1';

  // Sessão já comprovada em AAL2: nada a exigir do fator.
  if (currentAal === 'aal2') {
    return { action: 'ok' };
  }

  const { data: factorData } = await supabase.auth.mfa.listFactors();
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
    if (targetOrigin === SITE_ORIGIN || targetOrigin === reqUrl.origin) {
      return true;
    }
    try {
      const targetUrl = new URL(targetOrigin);
      const isLocalTarget = ['localhost', '127.0.0.1'].includes(
        targetUrl.hostname,
      );
      const isLocalReq = ['localhost', '127.0.0.1'].includes(reqUrl.hostname);
      if (isLocalTarget && isLocalReq) {
        const targetPort =
          targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80');
        const reqPort =
          reqUrl.port || (reqUrl.protocol === 'https:' ? '443' : '80');
        return targetPort === reqPort;
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

  // Em requisições de mesma origem sem cabeçalho explícito (ex: testes internos controlados)
  return true;
}

/**
 * Resolve a URL base segura para redirecionamentos no painel administrativo,
 * mitigando vulnerabilidades de Host Header Injection e Open Redirect.
 *
 * Valida o host recebido contra SITE_ORIGIN ou origens locais autorizadas (localhost, 127.0.0.1).
 * O host recebido na requisição NUNCA define livremente o destino do redirecionamento.
 * Se o cabeçalho Host for desconhecido, malicioso ou ausente, recorre estritamente a SITE_ORIGIN.
 *
 * @param request - Requisição HTTP recebida.
 * @returns Origem base segura validada para construção de URLs de redirecionamento.
 */
export function resolveSafeRedirectBase(request: Request): string {
  const host = request.headers.get('host')?.trim();
  const proto = request.headers.get('x-forwarded-proto')?.trim() || 'http';

  // Se não houver cabeçalho Host explícito, usa a origem da própria requisição se válida, ou SITE_ORIGIN
  if (!host) {
    try {
      const reqUrl = new URL(request.url);
      if (reqUrl.origin && reqUrl.origin !== 'null') {
        const isLocal = ['localhost', '127.0.0.1'].includes(
          reqUrl.hostname.toLowerCase(),
        );
        const allowedSite = new URL(SITE_ORIGIN);
        if (
          isLocal ||
          reqUrl.hostname.toLowerCase() === allowedSite.hostname.toLowerCase()
        ) {
          return reqUrl.origin;
        }
      }
    } catch {
      // Ignora erro de parsing
    }
    return SITE_ORIGIN;
  }

  try {
    const candidateUrl = new URL(`${proto}://${host}`);
    const candidateHostname = candidateUrl.hostname.toLowerCase();
    const allowedSiteUrl = new URL(SITE_ORIGIN);

    // 1. Host corresponde ao domínio oficial do portal (SITE_ORIGIN)
    if (
      candidateHostname === allowedSiteUrl.hostname.toLowerCase() &&
      (candidateUrl.port === allowedSiteUrl.port ||
        (!candidateUrl.port && !allowedSiteUrl.port))
    ) {
      return candidateUrl.origin;
    }

    // 2. Host corresponde a ambiente local de desenvolvimento/teste E a requisição também é local
    if (['localhost', '127.0.0.1'].includes(candidateHostname)) {
      try {
        const reqUrl = new URL(request.url);
        if (
          ['localhost', '127.0.0.1'].includes(reqUrl.hostname.toLowerCase())
        ) {
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

  // Fallback seguro incondicional: impede que host arbitrário manipule a base
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
): Promise<AdminAuthResult> {
  const adminId = env.adminUserId.trim();

  // Fail-closed absoluto: configuração ausente nunca pode abrir o painel
  if (!adminId) {
    return { ok: false, reason: 'config_missing' };
  }

  const supabase = customClient || (await createClient());
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, reason: 'unauthenticated' };
  }

  // Autorização estrita por UUID fixo do administrador
  if (data.user.id !== adminId) {
    return { ok: false, reason: 'unauthorized', user: data.user };
  }

  // Avaliação de MFA (Multi-Factor Authentication)
  try {
    const ladder = await resolveAdminMfaLadder(supabase);

    if (ladder.action === 'ok') {
      return { ok: true, user: data.user, aal: 'aal2' as const };
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
 * Avalia validação de origem (CSRF) e autorização cumulativa (UUID fixo + AAL2).
 * Se a verificação falhar, produz imediatamente um NextResponse com código de status e
 * cabeçalhos restritivos adequados.
 *
 * @param request - Requisição HTTP opcional para verificação de origem.
 * @returns Objeto com `ok: true` e `user`, ou `ok: false` com `response` formatado.
 */
export async function assertAdminApiAuth(request?: Request): Promise<
  | { ok: true; user: User }
  | {
      ok: false;
      response: Response;
    }
> {
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

  if (auth.ok) {
    return { ok: true, user: auth.user };
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
