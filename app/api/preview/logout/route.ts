import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));

  try {
    const supabase = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                maxAge: 0,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              });
            });
          },
        },
      },
    );
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Erro no logout de preview', err);
  }

  const authCookies = request.cookies.getAll().filter((cookie) =>
    cookie.name.includes('sb-'),
  );
  authCookies.forEach((cookie) => {
    response.cookies.delete(cookie.name);
  });

  return response;
}
