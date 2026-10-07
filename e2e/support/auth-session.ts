import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';
import { issuePreviewGrant, PREVIEW_COOKIE } from '../../lib/preview/session';
export function localAdmin() {
  const url = process.env.E2E_SUPABASE_UPSTREAM;
  const key = process.env.CI_LOCAL_SERVICE_ROLE;
  if (
    !url ||
    !key ||
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  )
    throw new Error('Admin só na stack descartável.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function installSession(
  context: BrowserContext,
  baseURL: string,
  credentials: { email: string; password: string },
) {
  const jar: { name: string; value: string }[] = [];
  const client = createServerClient(
    process.env.E2E_SUPABASE_UPSTREAM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar,
        setAll: (values) => {
          for (const value of values) {
            const previous = jar.findIndex(
              (cookie) => cookie.name === value.name,
            );
            if (previous >= 0) jar.splice(previous, 1);
            jar.push({ name: value.name, value: value.value });
          }
        },
      },
    },
  );
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.session) throw new Error('Login real da fixture falhou.');
  // O host do proxy usa a mesma chave de storage: ambos têm 127 como project ref.
  const claims = JSON.parse(
    Buffer.from(
      data.session.access_token.split('.')[1]!,
      'base64url',
    ).toString(),
  );
  await context.addCookies(
    [
      ...jar,
      {
        name: PREVIEW_COOKIE,
        value: issuePreviewGrant(
          data.user.id,
          claims.session_id,
          process.env.SUPABASE_PREVIEW_TOKEN!,
        ),
      },
    ].map((cookie) => ({
      ...cookie,
      url: baseURL,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
    })),
  );
  return data.session;
}
