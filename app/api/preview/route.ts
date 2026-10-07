import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const slug = searchParams.get('slug');

  const previewToken = env.previewToken;
  if (!previewToken) {
    return new NextResponse('Preview não configurado no servidor.', {
      status: 403,
    });
  }

  if (!token) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const encoder = new TextEncoder();
  const tokenBuf = encoder.encode(token);
  const expectedBuf = encoder.encode(previewToken);

  if (tokenBuf.length !== expectedBuf.length) {
    return new NextResponse('Não autorizado', { status: 401 });
  }
  let equal = true;
  for (let i = 0; i < tokenBuf.length; i++) {
    if (tokenBuf[i] !== expectedBuf[i]) equal = false;
  }
  if (!equal) {
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
    console.error('Supabase Auth Error:', error.message);
    return new NextResponse('Falha ao autenticar o usuário de preview.', {
      status: 500,
    });
  }

  return response;
}
