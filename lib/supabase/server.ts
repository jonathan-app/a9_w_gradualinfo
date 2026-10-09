import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * lib/supabase/server.ts — cliente Supabase para Server Components e Route Handlers
 *
 * `server-only` faz o erro aparecer em tempo de build, não em produção: se
 * algum Client Component importar este arquivo, o build quebra na hora em vez
 * de vazar chave para o browser.
 *
 * A sessão vive em cookie gerenciado pelo `@supabase/ssr`. `getAll` (e não
 * `get`) é o que o SSR espera: `get` só existe na versão anterior do Next e
 * deixa passar cookie undefined, o que derruba o refresh de token.
 *
 * Por que `async`: `cookies()` é assíncrono a partir do Next 15. Todo mundo
 * que chama esta função precisa de `await` — assinatura única, sem o bug
 * clássico de esquecer o await e receber `{}` em vez de cookie.
 *
 * @fileoverview Cliente Supabase do servidor, com sessão em cookie.
 * @returns Cliente `@supabase/ssr` com `getAll`/`setAll` encaixados no cookie
 *   store desta requisição; nenhum parâmetro — tudo vem de `env` e dos cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Em ambiente local de desenvolvimento ou testes E2E, permite simulação de papéis controlados
  const isDevOrTest =
    process.env.NODE_ENV !== 'production' || process.env.E2E_TEST === '1';
  const e2eRole = isDevOrTest
    ? cookieStore.get('__e2e_session_role')?.value
    : undefined;

  if (e2eRole) {
    const isOtherUser = e2eRole === 'other_user';
    const userId = isOtherUser
      ? '00000000-0000-0000-0000-999999999999'
      : env.adminUserId || '00000000-0000-0000-0000-000000000001';
    const userEmail = isOtherUser ? 'invasor@externo.com' : env.adminEmail;

    let currentLevel = 'aal1';
    let nextLevel = 'aal1';
    let hasTotpEnrolled = false;

    if (e2eRole === 'admin_no_mfa') {
      currentLevel = 'aal1';
      nextLevel = 'aal1';
      hasTotpEnrolled = false;
    } else if (e2eRole === 'admin_aal1') {
      currentLevel = 'aal1';
      nextLevel = 'aal2';
      hasTotpEnrolled = true;
    } else if (e2eRole === 'admin_aal2') {
      currentLevel = 'aal2';
      nextLevel = 'aal2';
      hasTotpEnrolled = true;
    }

    const mockUser = {
      id: userId,
      email: userEmail,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockFactor = {
      id: 'mock-factor-id',
      totp: {
        secret: 'MOCK_SECRET_KEY',
        uri: 'otpauth://totp/GradualInfo:admin?secret=MOCK_SECRET_KEY&issuer=GradualInfo',
      },
    };

    const baseClient = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    return {
      ...baseClient,
      auth: {
        ...baseClient.auth,
        async getUser() {
          return { data: { user: mockUser }, error: null };
        },
        async signOut() {
          try {
            cookieStore.delete('__e2e_session_role');
          } catch {
            // Server Component ignore
          }
          return { error: null };
        },
        mfa: {
          ...baseClient.auth.mfa,
          async getAuthenticatorAssuranceLevel() {
            return {
              data: {
                currentLevel,
                nextLevel,
                currentAuthenticationMethods: hasTotpEnrolled ? ['totp'] : [],
              },
              error: null,
            };
          },
          async enroll() {
            if (!hasTotpEnrolled) {
              return {
                data: { id: mockFactor.id, totp: mockFactor.totp },
                error: null,
              };
            }
            return { data: null, error: { message: 'Already enrolled' } };
          },
          async challengeAndVerify({ code }: { code: string }) {
            if (e2eRole === 'admin_aal1' && code === '123456') {
              return { data: null, error: null };
            }
            return { data: null, error: { message: 'Invalid code' } };
          },
          async listFactors() {
            if (hasTotpEnrolled) {
              return {
                data: { totp: [mockFactor] },
                error: null,
              };
            }
            return { data: { totp: [] }, error: null };
          },
        },
      },
    } as unknown as ReturnType<typeof createServerClient>;
  }

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // `setAll` é chamado pelo Supabase quando ele renova o token. Num Server
      // Component o cookie é somente leitura: a tentativa é silenciosamente
      // ignorada e o refresh acontece no `proxy.ts`, que roda no meioRequest e
      // tem permissão de escrita. O `try/catch` existe porque o Supabase não
      // trata o erro de cookie readonly.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component: sem escrita de cookie.
        }
      },
    },
  });
}

/** Leitura pública não envia cookies nem tokens de sessões editoriais. */
export function createPublicClient() {
  return createSupabaseClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
