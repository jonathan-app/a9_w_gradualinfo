/**
 * @fileoverview app/api/admin/auth/login/route.ts — autenticação no servidor do painel
 * @module app/api/admin/auth/login
 * @description Endpoint de login exclusivo para o administrador. Valida origem da requisição,
 *   aplica rate limiting, autentica credenciais contra o Supabase Auth no servidor, avalia a
 *   escada de MFA (setup vs verify vs aal2) e redireciona estritamente para caminhos sanitizados.
 * @dependencies next/server, @/lib/admin/auth, @/lib/supabase/server
 */
import { guardAdminAccess } from '@/lib/admin/access-guard';

import {
  resolveAdminMfaLadder,
  resolveSafeRedirectBase,
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { env } from '@/lib/env';
import { UUID_PATTERN } from '@/lib/preview/session';
import { NextResponse } from 'next/server';
import {
  consumeAdminRateLimit,
  adminRateLimitResponse,
} from '@/lib/admin/rate-limit';

/**
 * Autentica exclusivamente a identidade administrativa antes de iniciar MFA.
 * @param request - Credenciais, origem e destino interno.
 * @returns Resposta sem cache e com cookies fornecidos pelo SDK.
 */
export async function POST(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;
  // 1. Validação estrita de origem contra CSRF
  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  // A admissão já foi comprovada; preservar as duas quotas do contrato aceito.
  const rateResponse = adminRateLimitResponse(
    request,
    await consumeAdminRateLimit('login'),
    'login',
  );
  if (rateResponse) return rateResponse;

  let email: string;
  let password: string;
  let redirectToRaw: string;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    email = String(formData.get('email') || '').trim();
    password = String(formData.get('password') || '');
    redirectToRaw = String(formData.get('redirectTo') || '');
  } else if (contentType.includes('application/json')) {
    const json = await request.json();
    email = String(json.email || '').trim();
    password = String(json.password || '');
    redirectToRaw = String(json.redirectTo || '');
  } else {
    return new NextResponse('Formato não suportado.', { status: 415 });
  }

  const baseUrl = resolveSafeRedirectBase(request);

  const safeRedirect = sanitizeAdminRedirect(redirectToRaw);
  const loginUrl = new URL('/admin-dashboard/login', baseUrl);
  loginUrl.searchParams.set('redirectTo', safeRedirect);

  if (!email || !password) {
    loginUrl.searchParams.set('error', 'missing_credentials');
    return NextResponse.redirect(loginUrl, 303);
  }

  // 3. Autenticação contra Supabase Auth no servidor
  const adminId = env.adminUserId.trim();
  if (!UUID_PATTERN.test(adminId)) {
    return new NextResponse('Operação indisponível.', {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
  const { supabase, finish } = await createAdminSessionResponse();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    if (
      error &&
      (('status' in error &&
        typeof error.status === 'number' &&
        error.status >= 500) ||
        error.name === 'AuthRetryableFetchError' ||
        error.message?.includes('fetch failed'))
    ) {
      return finish(
        new NextResponse(
          'Serviço de autenticação temporariamente indisponível.',
          {
            status: 503,
            headers: {
              'Cache-Control': 'private, no-store',
              'Retry-After': '5',
            },
          },
        ),
        true,
      );
    }
    loginUrl.searchParams.set('error', 'invalid_credentials');
    return finish(NextResponse.redirect(loginUrl, 303), true);
  }

  if (data.user.id !== adminId) {
    // Nunca emitir a sessão recém-criada de outra identidade, mesmo se signOut falhar.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // A remoção dos cookies capturados continua obrigatória.
    }
    loginUrl.searchParams.set('error', 'invalid_credentials');
    return finish(NextResponse.redirect(loginUrl, 303), true);
  }

  // Helper para propagar cookies de sessão do Supabase no redirecionamento
  const createRedirectWithCookies = async (target: URL) => {
    return finish(NextResponse.redirect(target, 303));
  };

  // 4. Verificação estrita da escada de MFA
  try {
    const ladder = await resolveAdminMfaLadder(supabase);

    let destinationUrl: URL;

    if (ladder.action === 'ok') {
      // c) AAL2 completo: redireciona para destino sanitizado
      destinationUrl = new URL(safeRedirect, baseUrl);
    } else {
      // a) Sem TOTP cadastrado: setup obrigatório.
      // b) TOTP presente (inclusive pendente de verificação) mas sessão AAL1: desafio.
      destinationUrl = new URL(
        ladder.action === 'setup'
          ? '/admin-dashboard/mfa/setup'
          : '/admin-dashboard/mfa/verify',
        baseUrl,
      );
      destinationUrl.searchParams.set('redirectTo', safeRedirect);
    }

    return await createRedirectWithCookies(destinationUrl);
  } catch {
    // Falha fechada: exige desafio
    const verifyUrl = new URL('/admin-dashboard/mfa/verify', baseUrl);
    verifyUrl.searchParams.set('redirectTo', safeRedirect);
    return await createRedirectWithCookies(verifyUrl);
  }
}
