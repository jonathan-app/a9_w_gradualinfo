/**
 * @fileoverview app/api/admin/auth/logout/route.ts — encerramento de sessão administrativa
 * @module app/api/admin/auth/logout
 * @description Rota de encerramento de sessão via POST. Valida origem, efetua signOut no
 *   Supabase Auth e redireciona com status 303 para a tela de login.
 * @dependencies next/server, @/lib/admin/auth, @/lib/supabase/server
 */
import {
  getAdminAccessLogoutUrl,
  guardAdminAccess,
} from '@/lib/admin/access-guard';

import {
  resolveSafeRedirectBase,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { NextResponse } from 'next/server';

/**
 * Encerra a sessão com os atributos de remoção fornecidos pelo SDK.
 * @param request - Requisição de mutação com origem validada.
 * @returns Resposta de saída sem cache.
 */
export async function POST(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;
  // 1. Validação estrita de origem contra CSRF
  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  const { supabase, finish } = await createAdminSessionResponse();
  await supabase.auth.signOut();

  const isApiRequest =
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('sec-fetch-mode') === 'cors';

  const baseUrl = resolveSafeRedirectBase(request);

  let response: NextResponse;
  if (isApiRequest) {
    response = NextResponse.json({
      ok: true,
      accessLogoutUrl: getAdminAccessLogoutUrl(),
    });
  } else {
    const loginUrl = new URL('/admin-dashboard/login', baseUrl);
    loginUrl.searchParams.set('signedOut', '1');
    response = NextResponse.redirect(loginUrl, 303);
  }

  response.cookies.delete('__e2e_session_role');
  return finish(response);
}
