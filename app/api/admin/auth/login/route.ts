/**
 * @fileoverview app/api/admin/auth/login/route.ts — autenticação no servidor do painel
 * @module app/api/admin/auth/login
 * @description Endpoint de login exclusivo para o administrador. Valida origem da requisição,
 *   aplica rate limiting, autentica credenciais contra o Supabase Auth no servidor, avalia a
 *   escada de MFA (setup vs verify vs aal2) e redireciona estritamente para caminhos sanitizados.
 * @dependencies next/server, @/lib/admin/auth, @/lib/supabase/server
 */

import {
  resolveAdminMfaLadder,
  resolveSafeRedirectBase,
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Memória simples de rate limiting por IP/origem para mitigar brute force local
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 5;
}

export async function POST(request: Request) {
  // 1. Validação estrita de origem contra CSRF
  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  // 2. Limitação de taxa contra força bruta
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'local';
  if (isRateLimited(ip)) {
    const isJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      return new NextResponse(
        JSON.stringify({
          error: 'rate_limited',
          message: 'Muitas tentativas de login. Limite de taxa excedido.',
        }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      );
    }
    const loginUrl = new URL('/admin-dashboard/login', request.url);
    loginUrl.searchParams.set('error', 'rate_limited');
    return NextResponse.redirect(loginUrl, 303);
  }

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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    loginUrl.searchParams.set('error', 'invalid_credentials');
    return NextResponse.redirect(loginUrl, 303);
  }

  // Helper para propagar cookies de sessão do Supabase no redirecionamento
  const createRedirectWithCookies = async (target: URL) => {
    const res = NextResponse.redirect(target, 303);
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value);
    });
    return res;
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
