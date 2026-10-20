/**
 * @fileoverview app/api/admin/preview/route.ts — emissão de preview restrita a AAL2
 * @module app/api/admin/preview
 * @description Endpoint administrativo para concessão direta de sessão de preview.
 *   Exige autenticação cumulativa do administrador (UUID fixo e nível AAL2) via assertAdminApiAuth.
 *   Cria a sessão no Durable Object com consistência forte e assina o cookie de preview.
 * @dependencies next/server, @/lib/admin/auth, @/lib/env, @/lib/preview/config, @/lib/preview/durable-object, @/lib/preview/session, @/lib/site-config
 */
import { guardAdminAccess } from '@/lib/admin/access-guard';

import { assertAdminApiAuth } from '@/lib/admin/auth';
import { recordAdminAudit } from '@/lib/admin/audit-service';
import { env } from '@/lib/env';
import { previewCookieOptions } from '@/lib/preview/config';
import { getPreviewSessionStore } from '@/lib/preview/durable-object';
import {
  PREVIEW_COOKIE,
  PREVIEW_TTL,
  issuePreviewGrant,
} from '@/lib/preview/session';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;
  // 1. Guarda estrita de autorização administrativa (papel + AAL2 + Origem)
  const auth = await assertAdminApiAuth(request, 'revisor');
  if (!auth.ok) {
    return auth.response;
  }

  let slug = '';
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    slug = String(formData.get('slug') || '').trim();
  } else if (contentType.includes('application/json')) {
    const json = await request.json();
    slug = String(json.slug || '').trim();
  }

  // Validação estrita de formato de slug
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new NextResponse('Slug de artigo inválido.', {
      status: 400,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const now = Date.now();
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + PREVIEW_TTL;
  const sessionId = randomUUID();

  // 2. Persistência de sessão no Durable Object (consistência forte e revogação imediata)
  try {
    const store = getPreviewSessionStore();
    await store.createSession({
      session_id: sessionId,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });
  } catch {
    return new NextResponse('Armazenamento de sessão indisponível.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  // 3. Emissão de cookie assinado com chave criptográfica
  const cookieValue = issuePreviewGrant(
    auth.user.id,
    sessionId,
    env.previewSigningKey,
    now,
  );

  const destination = slug ? `/artigos/${slug}` : '/';
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );

  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set(PREVIEW_COOKIE, cookieValue, {
    ...previewCookieOptions,
    maxAge: PREVIEW_TTL,
  });

  void recordAdminAudit({
    actorType: 'admin',
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    actorRole: auth.role,
    action: 'preview.issued',
    resourceType: 'preview',
    resourceId: slug || 'global',
    ipAddress: request.headers.get('cf-connecting-ip'),
  });

  return response;
}
