/**
 * @fileoverview Concessão de acesso ao preview editorial (login por segredo e Durable Object).
 * @module app/api/preview
 * @description Route handler que valida o token de preview enviado exclusivamente no corpo (POST)
 *   e registra a sessão com consistência forte no Cloudflare Durable Object ANTES de emitir
 *   o cookie assinado HMAC-SHA256 (`gradualinfo-preview`, TTL 1800s).
 *   Contrato HTTP: POST com `application/x-www-form-urlencoded` ou `application/json` e campos
 *   `token` (obrigatório) e `slug` (opcional, kebab-case). A cadeia de guards:
 *   403 origem ≠ `SITE_ORIGIN` · 429 limite de tentativas · 400 content-type, corpo acima de 4 KiB
 *   ou entrada malformada · 401 token divergente (tempo constante) · 503 erro de persistência no DO.
 *   Sucesso responde 303 para `/artigos/<slug>` (ou `/`) com o cookie de preview.
 *   GET responde 405 com `Allow: POST`.
 * @dependencies next/server (NextResponse/NextRequest), lib/env, lib/site-config (SITE_ORIGIN),
 *   lib/preview/session (equalSecret, issuePreviewGrant, PREVIEW_COOKIE, PREVIEW_TTL),
 *   lib/preview/config (previewCookieOptions), lib/preview/durable-object (getPreviewSessionStore),
 *   lib/audit (evento `preview_login`).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { SITE_ORIGIN } from '@/lib/site-config';
import { audit } from '@/lib/audit';
import { previewCookieOptions } from '@/lib/preview/config';
import {
  equalSecret,
  issuePreviewGrant,
  PREVIEW_COOKIE,
  PREVIEW_TTL,
  UUID_PATTERN,
} from '@/lib/preview/session';
import { getPreviewSessionStore } from '@/lib/preview/durable-object';

// Estado do rate limit, em memória e por instância: IP -> contagem e fim da janela
const attempts = new Map<string, { count: number; until: number }>();

/**
 * Decide se a requisição está acima da cota do IP (máximo 20 tentativas por minuto).
 *
 * @param request - Requisição para extração do IP.
 * @returns `true` quando a cota estourou.
 */
function limited(request: NextRequest): boolean {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.until <= now) attempts.delete(key);
  }
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

/**
 * Monta a resposta de erro padrão da rota com cabeçalho Cache-Control private, no-store.
 *
 * @param message - Texto plano devolvido.
 * @param status - Código HTTP da falha.
 * @returns NextResponse com texto e status.
 */
function failure(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Autentica o token de preview e emite a sessão persistida no Durable Object.
 *
 * @param request - Requisição POST com corpo application/x-www-form-urlencoded ou JSON.
 * @returns 303 com redirecionamento para o destino e cookie de sessão.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== SITE_ORIGIN) {
    return failure('Origem não autorizada.', 403);
  }
  if (limited(request)) {
    return failure('Limite de tentativas excedido.', 429);
  }

  const contentType = request.headers.get('content-type') || '';
  let token: string | null;
  let slug: string | null;

  // Limite de tamanho de corpo (4 KiB)
  const bodyText = await request.text();
  if (Buffer.byteLength(bodyText) > 4096) {
    return failure('Corpo inválido.', 400);
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const form = new URLSearchParams(bodyText);
    token = form.get('token');
    slug = form.get('slug');
    if (form.getAll('token').length > 1 || form.getAll('slug').length > 1) {
      return failure('Entrada inválida.', 400);
    }
  } else if (contentType.startsWith('application/json')) {
    try {
      const parsed = JSON.parse(bodyText);
      token = typeof parsed.token === 'string' ? parsed.token : null;
      slug = typeof parsed.slug === 'string' ? parsed.slug : null;
    } catch {
      return failure('Formato inválido.', 400);
    }
  } else {
    return failure('Formato inválido.', 400);
  }

  // Validação estrita de slug contra open-redirect
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return failure('Entrada inválida.', 400);
  }

  // Comparação de segredo em tempo constante
  if (!token || !equalSecret(token, env.previewSecret)) {
    audit({ type: 'preview_login', ok: false });
    return failure('Não autorizado.', 401);
  }

  const now = Date.now();
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + PREVIEW_TTL;
  let sessionId: string = randomUUID();
  let subjectId: string = env.previewUserId || sessionId;
  const supabaseCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  // Quando o Sanity não está ativo e as credenciais legadas do Supabase existem,
  // autentica também a sessão Supabase para que a RLS (`posts_select_preview`)
  // autorize a leitura de rascunhos sem service_role e o logout possa revogar no GoTrue.
  if (
    !(env.sanity?.projectId && env.sanity?.dataset) &&
    Boolean(env.previewEmail && env.previewPassword && env.previewUserId)
  ) {
    const supabase = createServerClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        cookies: {
          getAll: () => supabaseCookies,
          setAll: (values) => {
            for (const value of values) {
              const previous = supabaseCookies.findIndex(
                (cookie) => cookie.name === value.name,
              );
              if (previous >= 0) supabaseCookies.splice(previous, 1);
              supabaseCookies.push(value);
            }
          },
        },
      },
    );
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: env.previewEmail,
        password: env.previewPassword,
      });
      if (error || !data.user) {
        audit({ type: 'preview_login', ok: false });
        return failure('Falha de autenticação.', 503);
      }
      const { data: verified, error: userError } =
        await supabase.auth.getUser();
      const user = verified.user;
      if (
        userError ||
        !user ||
        user.id !== env.previewUserId ||
        ![true, 'true'].includes(user.app_metadata?.preview)
      ) {
        audit({ type: 'preview_login', ok: false });
        return failure('Identidade não autorizada.', 403);
      }
      const { data: claims, error: claimsError } =
        await supabase.auth.getClaims();
      const claimedSessionId = claims?.claims?.session_id;
      if (
        claimsError ||
        typeof claimedSessionId !== 'string' ||
        !UUID_PATTERN.test(claimedSessionId) ||
        claims?.claims?.sub !== user.id
      ) {
        audit({ type: 'preview_login', ok: false });
        return failure('Sessão inválida.', 403);
      }
      sessionId = claimedSessionId;
      subjectId = user.id;
    } catch {
      audit({ type: 'preview_login', ok: false });
      return failure('Autenticação indisponível.', 503);
    }
  }

  // Criação da sessão antes de emitir cookie: persistência no Durable Object com consistência forte
  try {
    const store = getPreviewSessionStore();
    await store.createSession({
      session_id: sessionId,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });
  } catch {
    audit({ type: 'preview_login', ok: false });
    return failure('Armazenamento de sessão indisponível.', 503);
  }

  // Emissão do cookie assinado HMAC-SHA256
  const cookieValue = issuePreviewGrant(
    subjectId,
    sessionId,
    env.previewSigningKey,
    now,
  );

  const response = NextResponse.redirect(
    new URL(slug ? `/artigos/${slug}` : '/', SITE_ORIGIN),
    303,
  );
  response.headers.set('Cache-Control', 'private, no-store');
  for (const { name, value, options } of supabaseCookies) {
    response.cookies.set(name, value, {
      ...options,
      ...previewCookieOptions,
    });
  }
  response.cookies.set(PREVIEW_COOKIE, cookieValue, {
    ...previewCookieOptions,
    maxAge: PREVIEW_TTL,
  });

  audit({ type: 'preview_login', ok: true });
  return response;
}

/**
 * Recusa GET com 405 e cabeçalho `Allow: POST`.
 *
 * @returns NextResponse 405.
 */
export function GET() {
  const response = failure('Use o formulário de preview.', 405);
  response.headers.set('Allow', 'POST');
  return response;
}
