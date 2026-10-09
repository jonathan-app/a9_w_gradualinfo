/**
 * @fileoverview app/api/admin/auth/mfa/verify/route.ts — verificação e elevação para AAL2
 * @module app/api/admin/auth/mfa/verify
 * @description Endpoint de validação de desafio TOTP. Valida origem, aplica rate limiting,
 *   submete o código de 6 dígitos via challengeAndVerify no Supabase Auth, eleva a sessão
 *   para AAL2 e redireciona estritamente para caminhos sanitizados.
 * @dependencies next/server, @/lib/admin/auth, @/lib/env, @/lib/supabase/server
 */

import {
  resolveSafeRedirectBase,
  sanitizeAdminRedirect,
  validateAdminRequestOrigin,
} from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Rate limiting em memória para proteger contra força bruta em códigos TOTP de 6 dígitos
const mfaAttempts = new Map<string, { count: number; resetAt: number }>();

function isMfaRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = mfaAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    mfaAttempts.set(ip, { count: 1, resetAt: now + 60000 });
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
  if (isMfaRateLimited(ip)) {
    return new NextResponse('Muitas tentativas. Aguarde um minuto.', {
      status: 429,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  // 3. Verificação de fail-closed e usuário autenticado
  const adminId = env.adminUserId.trim();
  if (!adminId) {
    return new NextResponse('Configuração administrativa ausente.', {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user || authData.user.id !== adminId) {
    return new NextResponse('Não autorizado.', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  let code: string;
  let factorId: string;
  let redirectToRaw: string;
  let source: string;

  const contentType = request.headers.get('content-type') || '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  if (isForm) {
    const formData = await request.formData();
    code = String(formData.get('code') || '').replace(/\s+/g, '');
    factorId = String(formData.get('factorId') || '').trim();
    redirectToRaw = String(formData.get('redirectTo') || '');
    source = String(formData.get('source') || 'verify');
  } else if (contentType.includes('application/json')) {
    const json = await request.json();
    code = String(json.code || '').replace(/\s+/g, '');
    factorId = String(json.factorId || '').trim();
    redirectToRaw = String(json.redirectTo || '');
    source = String(json.source || 'verify');
  } else {
    return new NextResponse('Formato não suportado.', { status: 415 });
  }

  const baseUrl = resolveSafeRedirectBase(request);

  const safeRedirect = sanitizeAdminRedirect(redirectToRaw);

  const fallbackUrl = new URL(
    source === 'setup'
      ? '/admin-dashboard/mfa/setup'
      : '/admin-dashboard/mfa/verify',
    baseUrl,
  );
  fallbackUrl.searchParams.set('redirectTo', safeRedirect);

  const createRedirectWithCookies = async (target: URL) => {
    const res = NextResponse.redirect(target, 303);
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value);
    });
    return res;
  };

  if (!code || !/^\d{6}$/.test(code)) {
    if (isForm) {
      fallbackUrl.searchParams.set('error', 'invalid_code_format');
      return await createRedirectWithCookies(fallbackUrl);
    }
    return NextResponse.json(
      { ok: false, error: 'invalid_code_format' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  // 4. Resolução do factorId se não foi provido explicitamente
  if (!factorId) {
    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError || !factors) {
      if (isForm) {
        fallbackUrl.searchParams.set('error', 'no_factors');
        return await createRedirectWithCookies(fallbackUrl);
      }
      return NextResponse.json(
        { ok: false, error: 'no_factors' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // `all` inclui o fator pendente de verificação (o bucket `totp` só lista
    // verificados) — durante a primeira matrícula AAL2 ainda não existe fator
    // verificado, então o único fator presente é justamente o pendente.
    const totpFactors = (factors.all ?? []).filter(
      (factor: { factor_type?: string }) => factor.factor_type === 'totp',
    );
    const matchedFactor =
      totpFactors.find((f: { status?: string }) => f.status === 'verified') ||
      totpFactors[0];

    if (!matchedFactor) {
      if (isForm) {
        fallbackUrl.searchParams.set('error', 'no_factors');
        return await createRedirectWithCookies(fallbackUrl);
      }
      return NextResponse.json(
        { ok: false, error: 'no_factors' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    factorId = matchedFactor.id;
  }

  // 5. Execução do desafio e elevação da sessão para AAL2
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (verifyError) {
    if (isForm) {
      fallbackUrl.searchParams.set('error', 'invalid_code');
      return await createRedirectWithCookies(fallbackUrl);
    }
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  // 6. Sucesso: redireciona para destino sanitizado
  if (isForm) {
    const targetUrl = new URL(safeRedirect, baseUrl);
    return await createRedirectWithCookies(targetUrl);
  }

  return NextResponse.json(
    { ok: true, redirectTo: safeRedirect },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
