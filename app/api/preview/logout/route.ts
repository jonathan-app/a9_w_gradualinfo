import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { audit } from '@/lib/audit';
import { previewCookieOptions } from '@/lib/preview/config';
import { PREVIEW_COOKIE } from '@/lib/preview/session';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== SITE_ORIGIN)
    return new NextResponse('Origem não autorizada.', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  const changed = new Set<string>();
  let failed = false;
  try {
    const supabase = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => values.forEach(({ name }) => changed.add(name)),
        },
      },
    );
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  const response = failed
    ? new NextResponse(
        'Sessão local encerrada; revogação remota indisponível.',
        { status: 503 },
      )
    : NextResponse.redirect(new URL('/', SITE_ORIGIN), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  changed.add(PREVIEW_COOKIE);
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-'))
    .forEach(({ name }) => changed.add(name));
  changed.forEach((name) =>
    response.cookies.set(name, '', {
      ...previewCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    }),
  );
  audit({ type: 'preview_logout', ok: !failed });
  return response;
}

export function GET() {
  return new NextResponse('Use POST para sair.', {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'private, no-store' },
  });
}
