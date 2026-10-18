/**
 * @fileoverview app/api/admin/auth/recovery/update-password/route.ts — atualização de senha sob recuperação
 * @module app/api/admin/auth/recovery/update-password
 * @description Endpoint de atualização de senha exclusivo para o administrador sob sessão de recuperação.
 *   Valida origem, rate limit e requer autenticação do administrador único via assertRecoverySessionAuth.
 *   Executa updateUser({ password }), respeita a exigência de AAL2 do GoTrue conduzindo ao desafio TOTP
 *   quando necessário, e garante que a sessão pós-atualização cumpra a escada MFA antes de acessar o painel.
 * @dependencies next/server, @/lib/admin/auth, @/lib/admin/session-response, @/lib/admin/rate-limit
 */

import {
  assertRecoverySessionAuth,
  resolveAdminMfaLadder,
  resolveSafeRedirectBase,
} from '@/lib/admin/auth';
import {
  adminRateLimitResponse,
  consumeAdminRateLimit,
} from '@/lib/admin/rate-limit';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { NextResponse } from 'next/server';

/**
 * Atualiza a credencial primária do administrador único sob sessão de recuperação autenticada.
 * @param request - Requisição POST com nova senha e confirmação.
 * @returns Redirecionamento 303 ou JSON com próximo degrau obrigatório na escada MFA.
 */
export async function POST(request: Request) {
  const authCheck = await assertRecoverySessionAuth(request);
  if (!authCheck.ok) {
    return authCheck.response;
  }

  const rateResponse = adminRateLimitResponse(
    request,
    await consumeAdminRateLimit('login'),
    'login',
  );
  if (rateResponse) return rateResponse;

  let password: string;
  let confirmPassword: string;
  const contentType = request.headers.get('content-type') || '';
  const isForm = contentType.includes('application/x-www-form-urlencoded');

  if (isForm) {
    const formData = await request.formData();
    password = String(formData.get('password') || '');
    confirmPassword = String(
      formData.get('confirmPassword') || formData.get('confirm') || '',
    );
  } else if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    password = String(json?.password || '');
    confirmPassword = String(json?.confirmPassword || json?.confirm || '');
  } else {
    return new NextResponse('Formato não suportado.', { status: 415 });
  }

  const baseUrl = resolveSafeRedirectBase(request);
  const updatePageUrl = new URL(
    '/admin-dashboard/recovery/update-password',
    baseUrl,
  );

  if (!password || password.length < 6) {
    if (isForm) {
      updatePageUrl.searchParams.set('error', 'weak_password');
      return NextResponse.redirect(updatePageUrl, 303);
    }
    return NextResponse.json(
      { ok: false, error: 'A senha deve conter no mínimo 6 caracteres.' },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    if (isForm) {
      updatePageUrl.searchParams.set('error', 'password_mismatch');
      return NextResponse.redirect(updatePageUrl, 303);
    }
    return NextResponse.json(
      { ok: false, error: 'As senhas informadas não coincidem.' },
      { status: 400 },
    );
  }

  const { supabase, finish } = await createAdminSessionResponse();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (
      ('status' in error &&
        typeof error.status === 'number' &&
        error.status >= 500) ||
      error.name === 'AuthRetryableFetchError' ||
      error.message?.includes('fetch failed')
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

    // Se o GoTrue exigir AAL2 para alterar a senha com TOTP ativo
    if (
      error.message?.includes('AAL2') ||
      error.message?.includes('insufficient_aal') ||
      ('code' in error && error.code === 'insufficient_aal')
    ) {
      const verifyUrl = new URL('/admin-dashboard/mfa/verify', baseUrl);
      verifyUrl.searchParams.set(
        'redirectTo',
        '/admin-dashboard/recovery/update-password',
      );
      if (isForm) {
        return finish(NextResponse.redirect(verifyUrl, 303));
      }
      return finish(
        NextResponse.json({
          ok: false,
          redirectTo: verifyUrl.pathname + verifyUrl.search,
        }),
      );
    }

    if (isForm) {
      updatePageUrl.searchParams.set('error', 'update_failed');
      return finish(NextResponse.redirect(updatePageUrl, 303));
    }
    return finish(
      NextResponse.json(
        { ok: false, error: 'Não foi possível atualizar a senha.' },
        { status: 400 },
      ),
    );
  }

  // Senha atualizada com sucesso. Avalia próximo degrau da escada MFA.
  try {
    const ladder = await resolveAdminMfaLadder(supabase);
    let targetUrl: URL;

    if (ladder.action === 'ok') {
      targetUrl = new URL('/admin-dashboard', baseUrl);
    } else if (ladder.action === 'verify') {
      targetUrl = new URL('/admin-dashboard/mfa/verify', baseUrl);
      targetUrl.searchParams.set('redirectTo', '/admin-dashboard');
    } else {
      targetUrl = new URL('/admin-dashboard/mfa/setup', baseUrl);
      targetUrl.searchParams.set('redirectTo', '/admin-dashboard');
    }

    if (isForm) {
      return finish(NextResponse.redirect(targetUrl, 303));
    }
    return finish(
      NextResponse.json({
        ok: true,
        redirectTo: targetUrl.pathname + targetUrl.search,
      }),
    );
  } catch {
    const fallbackUrl = new URL('/admin-dashboard/mfa/verify', baseUrl);
    fallbackUrl.searchParams.set('redirectTo', '/admin-dashboard');
    if (isForm) {
      return finish(NextResponse.redirect(fallbackUrl, 303));
    }
    return finish(
      NextResponse.json({
        ok: true,
        redirectTo: fallbackUrl.pathname + fallbackUrl.search,
      }),
    );
  }
}
