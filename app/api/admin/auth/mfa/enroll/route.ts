/**
 * @fileoverview app/api/admin/auth/mfa/enroll/route.ts — início do registro de fator TOTP
 * @module app/api/admin/auth/mfa/enroll
 * @description Endpoint seguro para geração de fator TOTP no Supabase Auth. Valida origem,
 *   restringe ao UUID do administrador e retorna a chave secreta e QR code para associação.
 * @dependencies next/server, @/lib/admin/auth, @/lib/env, @/lib/supabase/server
 */

import { validateAdminRequestOrigin } from '@/lib/admin/auth';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 1. Validação estrita de origem contra CSRF
  if (!validateAdminRequestOrigin(request)) {
    return new NextResponse('Origem não permitida.', { status: 403 });
  }

  // 2. Verificação de fail-closed e usuário autenticado
  const adminId = env.adminUserId.trim();
  if (!adminId) {
    return new NextResponse('Configuração administrativa ausente.', {
      status: 500,
    });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user || authData.user.id !== adminId) {
    return new NextResponse('Não autorizado.', { status: 403 });
  }

  // 3. Início da matrícula TOTP
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'GradualInfo',
    friendlyName: 'Admin Authenticator',
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: 'Falha ao iniciar registro TOTP.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
