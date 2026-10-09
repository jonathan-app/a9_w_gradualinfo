/**
 * @fileoverview app/api/admin/auth/logout/route.ts — encerramento de sessão administrativa
 * @module app/api/admin/auth/logout
 * @description Rota de encerramento de sessão via POST. Valida origem, efetua signOut no
 *   Supabase Auth e redireciona com status 303 para a tela de login.
 * @dependencies next/server, @/lib/admin/auth, @/lib/supabase/server
 */

import { validateAdminRequestOrigin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 1. Validação estrita de origem contra CSRF
  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  const isApiRequest =
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('sec-fetch-mode') === 'cors';

  let response: NextResponse;
  if (isApiRequest) {
    response = NextResponse.json({ ok: true });
  } else {
    const loginUrl = new URL('/admin-dashboard/login', request.url);
    response = NextResponse.redirect(loginUrl, 303);
  }

  response.cookies.delete('__e2e_session_role');
  return response;
}
