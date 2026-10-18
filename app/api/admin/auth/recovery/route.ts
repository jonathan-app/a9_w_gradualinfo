/**
 * @fileoverview app/api/admin/auth/recovery/route.ts — solicitação de recuperação de senha
 * @module app/api/admin/auth/recovery
 * @description Endpoint de solicitação de redefinição de senha para o administrador único.
 *   Opera sem sessão prévia sob a proteção de borda do Cloudflare Access, aplica validação
 *   estrita de origem (CSRF), rate limit compartilhado, emite o disparo nativo com PKCE
 *   e propaga os cookies do verificador para o navegador, devolvendo resposta uniforme.
 * @dependencies next/server, @/lib/admin/auth, @/lib/admin/session-response, @/lib/env
 */

import { guardAdminAccess } from '@/lib/admin/access-guard';
import {
  resolveSafeRedirectBase,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import {
  adminRateLimitResponse,
  consumeAdminRateLimit,
} from '@/lib/admin/rate-limit';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

const UNIFORM_MESSAGE =
  'Se o e-mail informado corresponder ao administrador, as instruções foram enviadas.';

/**
 * Processa solicitação de redefinição de senha com resposta uniforme contra enumeração.
 * @param request - Requisição contendo email do solicitante.
 * @returns Resposta HTTP 200 com mensagem uniforme e cookies do verificador PKCE.
 */
export async function POST(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;

  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  const rateResponse = adminRateLimitResponse(
    request,
    await consumeAdminRateLimit('login'),
    'login',
  );
  if (rateResponse) return rateResponse;

  let email: string;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    email = String(formData.get('email') || '').trim();
  } else if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    email = String(json?.email || '').trim();
  } else {
    return new NextResponse('Formato não suportado.', { status: 415 });
  }

  const baseUrl = resolveSafeRedirectBase(request);
  const redirectTo = new URL(
    '/api/admin/auth/recovery/callback',
    baseUrl,
  ).toString();

  const { supabase, finish } = await createAdminSessionResponse();

  const adminEmailConfigured = env.adminEmail.trim().toLowerCase();
  const requestedEmail = email.toLowerCase();

  if (requestedEmail && requestedEmail === adminEmailConfigured) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        requestedEmail,
        { redirectTo },
      );
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
    } catch {
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
  }

  // Resposta uniforme: e-mail coincidente ou não, preserva cookies PKCE gerados
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const successUrl = new URL(
      '/admin-dashboard/recovery/request?sent=1',
      baseUrl,
    );
    return finish(NextResponse.redirect(successUrl, 303));
  }

  return finish(
    NextResponse.json(
      { ok: true, message: UNIFORM_MESSAGE },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    ),
  );
}
