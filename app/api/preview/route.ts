import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { audit } from '@/lib/audit';
import {
  isPreviewConfigured,
  previewCookieOptions,
} from '@/lib/preview/config';
import {
  equalSecret,
  issuePreviewGrant,
  PREVIEW_COOKIE,
  PREVIEW_TTL,
  UUID_PATTERN,
} from '@/lib/preview/session';

const attempts = new Map<string, { count: number; until: number }>();
function limited(request: NextRequest): boolean {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until <= now) attempts.delete(key);
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const value = attempts.get(ip);
  if (!value) {
    if (attempts.size >= 1000) return true;
    attempts.set(ip, { count: 1, until: now + 60_000 });
    return false;
  }
  return ++value.count > 20;
}

function failure(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== SITE_ORIGIN)
    return failure('Origem não autorizada.', 403);
  if (limited(request)) return failure('Limite de tentativas excedido.', 429);
  if (!isPreviewConfigured()) return failure('Preview não configurado.', 503);
  if (
    !request.headers
      .get('content-type')
      ?.startsWith('application/x-www-form-urlencoded')
  )
    return failure('Formato inválido.', 400);
  // O limite do corpo evita aceitar entradas enormes no comparador e no parser.
  const body = await request.text();
  if (Buffer.byteLength(body) > 4096) return failure('Corpo inválido.', 400);
  const form = new URLSearchParams(body);
  const token = form.get('token');
  const slug = form.get('slug');
  if (
    (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
    form.getAll('token').length > 1 ||
    form.getAll('slug').length > 1
  )
    return failure('Entrada inválida.', 400);
  if (!token || !equalSecret(token, env.previewToken)) {
    audit({ type: 'preview_login', ok: false });
    return failure('Não autorizado.', 401);
  }
  const response = NextResponse.redirect(
    new URL(slug ? `/artigos/${slug}` : '/', SITE_ORIGIN),
    303,
  );
  response.headers.set('Cache-Control', 'private, no-store');
  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      // Login deliberadamente isolado da sessão anterior do navegador.
      getAll: () => response.cookies.getAll(),
      setAll: (values) =>
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            ...previewCookieOptions,
          }),
        ),
    },
  });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: env.previewEmail,
      password: env.previewPassword,
    });
    if (error || !data.user) return failure('Falha de autenticação.', 503);
    const { data: verified, error: userError } = await supabase.auth.getUser();
    const user = verified.user;
    if (
      userError ||
      !user ||
      user.id !== env.previewUserId ||
      ![true, 'true'].includes(user.app_metadata.preview)
    )
      return failure('Identidade não autorizada.', 403);
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();
    const sessionId = claims?.claims.session_id;
    if (
      claimsError ||
      typeof sessionId !== 'string' ||
      !UUID_PATTERN.test(sessionId) ||
      claims?.claims.sub !== user.id
    )
      return failure('Sessão inválida.', 403);
    response.cookies.set(
      PREVIEW_COOKIE,
      issuePreviewGrant(user.id, sessionId, env.previewToken),
      { ...previewCookieOptions, maxAge: PREVIEW_TTL },
    );
    audit({ type: 'preview_login', ok: true });
    return response;
  } catch {
    audit({ type: 'preview_login', ok: false });
    return failure('Autenticação indisponível.', 503);
  }
}

export function GET() {
  const response = failure('Use o formulário de preview.', 405);
  response.headers.set('Allow', 'POST');
  return response;
}
