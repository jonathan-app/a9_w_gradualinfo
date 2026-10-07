import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const attempts = new Map<string, { count: number; reset: number }>();

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor
    ? forwardedFor.split(',')[0]?.trim() || 'unknown'
    : 'unknown';
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const slug = searchParams.get('slug');

  const now = Date.now();
  const window = attempts.get(ip);
  if (window && now < window.reset) {
    if (window.count >= RATE_LIMIT_MAX) {
      audit({ type: 'preview_login', ok: false, ip });
      return new NextResponse('Limite de requisições excedido.', {
        status: 429,
      });
    }
    window.count++;
  } else {
    attempts.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
  }

  const previewToken = env.previewToken;
  if (!previewToken) {
    audit({ type: 'preview_login', ok: false, ip });
    return new NextResponse('Preview não configurado no servidor.', {
      status: 403,
    });
  }

  if (!token) {
    audit({ type: 'preview_login', ok: false, ip });
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const encoder = new TextEncoder();
  const tokenBuf = encoder.encode(token);
  const expectedBuf = encoder.encode(previewToken);

  if (tokenBuf.length !== expectedBuf.length) {
    audit({ type: 'preview_login', ok: false, ip });
    return new NextResponse('Não autorizado', { status: 401 });
  }
  let equal = true;
  for (let i = 0; i < tokenBuf.length; i++) {
    if (tokenBuf[i] !== expectedBuf[i]) equal = false;
  }
  if (!equal) {
    audit({ type: 'preview_login', ok: false, ip });
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(
    new URL(slug ? `/artigos/${slug}` : '/', request.url),
  );
  response.headers.set('Cache-Control', 'no-store');

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
          });
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: 'preview@gradualinfo.dev',
    password: previewToken,
  });

  if (error) {
    audit({ type: 'preview_login', ok: false, ip });
    return new NextResponse('Falha ao autenticar o usuário de preview.', {
      status: 500,
    });
  }

  audit({ type: 'preview_login', ok: true, ip });
  return response;
}
