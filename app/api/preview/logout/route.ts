/**
 * @fileoverview Encerramento de sessão de preview editorial e revogação no Cloudflare Durable Object e Supabase.
 * @module app/api/preview/logout
 * @description Route handler que revoga a sessão persistente com consistência forte no
 *   Cloudflare Durable Object (`PreviewSessionDO`), finaliza a sessão no Supabase e limpa os cookies
 *   no cliente.
 *   Contrato HTTP: POST exclusivo; status 303 com redirect para `/` confirmado apenas
 *   após a persistência síncrona da revogação; 503 quando a gravação da revogação ou do provedor
 *   falha (com zeramento de cookies locais de contingência); 403 para origem divergente
 *   de SITE_ORIGIN; e 405 com `Allow: POST` para requisições GET.
 * @dependencies next/server (NextResponse/NextRequest), @supabase/ssr (createServerClient),
 *   lib/env, lib/site-config (SITE_ORIGIN), lib/audit (evento `preview_logout`),
 *   lib/preview/config (previewCookieOptions), lib/preview/session (readPreviewGrant, PREVIEW_COOKIE),
 *   lib/preview/durable-object (getPreviewSessionStore).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { audit } from '@/lib/audit';
import { previewCookieOptions } from '@/lib/preview/config';
import { readPreviewGrant, PREVIEW_COOKIE } from '@/lib/preview/session';
import { getPreviewSessionStore } from '@/lib/preview/durable-object';

/**
 * Encerra a sessão de preview e revoga imediatamente no Durable Object e Supabase.
 *
 * @param request - Requisição POST vinda do formulário ou cliente autorizado.
 * @returns 303 redirect para a home no sucesso; 503 quando a chamada de revogação falha.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== SITE_ORIGIN) {
    return new NextResponse('Origem não autorizada.', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const cookieValue = request.cookies.get(PREVIEW_COOKIE)?.value;
  const grant = readPreviewGrant(cookieValue, env.previewSigningKey);
  let failed = false;

  // 1. Revogação persistida no Durable Object com consistência forte
  if (grant?.session_id) {
    try {
      const store = getPreviewSessionStore();
      const revoked = await store.revokeSession(grant.session_id);
      if (!revoked) {
        failed = true;
      }
    } catch {
      failed = true;
    }
  }

  // 2. Encerramento de sessão no Supabase Auth (preservado como camada de contingência)
  try {
    const supabase = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      },
    );
    const { error } = await supabase.auth.signOut();
    if (error) {
      failed = true;
    }
  } catch {
    failed = true;
  }

  // Logout só confirmado após persistir a revogação
  const response = failed
    ? new NextResponse(
        'Sessão local encerrada; revogação remota indisponível.',
        {
          status: 503,
        },
      )
    : NextResponse.redirect(new URL('/', SITE_ORIGIN), 303);

  response.headers.set('Cache-Control', 'private, no-store');

  // Limpeza de cookies de preview e auxiliares no cliente
  const cookiesToClear = new Set<string>([PREVIEW_COOKIE]);
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-') || name === PREVIEW_COOKIE)
    .forEach(({ name }) => cookiesToClear.add(name));

  cookiesToClear.forEach((name) =>
    response.cookies.set(name, '', {
      ...previewCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    }),
  );

  audit({ type: 'preview_logout', ok: !failed });
  return response;
}

/**
 * Recusa GET com 405 e cabeçalho `Allow: POST`.
 *
 * @returns Resposta 405 em texto, sem cache.
 */
export function GET() {
  return new NextResponse('Use POST para sair.', {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'private, no-store' },
  });
}
