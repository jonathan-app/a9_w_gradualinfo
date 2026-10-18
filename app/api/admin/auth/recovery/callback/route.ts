/**
 * @fileoverview app/api/admin/auth/recovery/callback/route.ts — callback SSR de recuperação de senha
 * @module app/api/admin/auth/recovery/callback
 * @description Rota de callback SSR que recebe o código de autorização PKCE via link de e-mail.
 *   Opera sem sessão prévia sob a proteção de borda do Cloudflare Access, sem exigir cabeçalho Origin.
 *   Consome o verificador de código gravado nos cookies SSR, executa a troca por sessão,
 *   trata graciosamente a ausência do verificador (cross-browser), confere a identidade e
 *   direciona para o desafio TOTP se houver MFA ativo ou para a atualização de senha.
 * @dependencies next/server, @/lib/admin/access-guard, @/lib/admin/auth, @/lib/admin/session-response, @/lib/env
 */

import { guardAdminAccess } from '@/lib/admin/access-guard';
import {
  resolveAdminMfaLadder,
  resolveSafeRedirectBase,
} from '@/lib/admin/auth';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

/**
 * Processa o retorno do link de recuperação por e-mail e troca código PKCE por sessão SSR.
 * @param request - Requisição GET com parâmetros code ou error.
 * @returns Redirecionamento 303 com cookies de sessão de recuperação ou mensagem de erro sanitizada.
 */
export async function GET(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;

  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get('code');
  const errorParam = reqUrl.searchParams.get('error');
  const baseUrl = resolveSafeRedirectBase(request);

  const loginUrl = new URL('/admin-dashboard/login', baseUrl);

  if (errorParam || !code) {
    loginUrl.searchParams.set('error', 'recovery_link_invalid');
    return NextResponse.redirect(loginUrl, 303);
  }

  const { supabase, finish } = await createAdminSessionResponse();

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
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

      // Trata especificamente falta de verificador PKCE (outro navegador ou janela anônima)
      if (
        error?.name === 'AuthPKCECodeVerifierMissingError' ||
        error?.message?.toLowerCase().includes('code verifier')
      ) {
        loginUrl.searchParams.set('error', 'recovery_verifier_missing');
      } else {
        loginUrl.searchParams.set('error', 'recovery_link_invalid');
      }
      return finish(NextResponse.redirect(loginUrl, 303), true);
    }

    const adminId = env.adminUserId.trim();
    if (data.user.id !== adminId) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignora erro de signout
      }
      loginUrl.searchParams.set('error', 'recovery_link_invalid');
      return finish(NextResponse.redirect(loginUrl, 303), true);
    }

    // Avalia o próximo degrau: se possui TOTP ativo, conduz ao desafio antes de atualizar
    const ladder = await resolveAdminMfaLadder(supabase);

    let destinationUrl: URL;
    if (ladder.action === 'verify') {
      destinationUrl = new URL('/admin-dashboard/mfa/verify', baseUrl);
      destinationUrl.searchParams.set(
        'redirectTo',
        '/admin-dashboard/recovery/update-password',
      );
    } else {
      destinationUrl = new URL(
        '/admin-dashboard/recovery/update-password',
        baseUrl,
      );
    }

    return finish(NextResponse.redirect(destinationUrl, 303));
  } catch {
    loginUrl.searchParams.set('error', 'recovery_link_invalid');
    return finish(NextResponse.redirect(loginUrl, 303), true);
  }
}
