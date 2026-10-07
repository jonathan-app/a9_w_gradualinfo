/**
 * @fileoverview Concessão de acesso ao preview editorial (login por segredo).
 * @module app/api/preview
 * @description Route handler que troca o token digitado em `/preview` por uma
 *   sessão Supabase real do usuário de preview (credenciais fixas em env) e por
 *   um grant assinado em cookie de curta duração.
 *   Contrato HTTP: POST com `application/x-www-form-urlencoded` e campos
 *   `token` (obrigatório) e `slug` (opcional, kebab-case). A cadeia de guards,
 *   nesta ordem, cada um com seu status: 403 origem ≠ `SITE_ORIGIN` · 429
 *   limite de tentativas · 503 preview não configurado · 400 content-type,
 *   corpo acima de 4 KiB ou entrada malformada · 401 token divergente (auditado)
 *   · 403 identidade ou sessão fora do esperado · 503 falha de autenticação.
 *   Sucesso responde 303 para `/artigos/<slug>` (ou `/`) com os cookies.
 *   GET responde 405 com `Allow: POST`.
 * @dependencies next/server (NextResponse/NextRequest), @supabase/ssr
 *   (signInWithPassword, getUser, getClaims), lib/env (credenciais de preview),
 *   lib/preview/session (comparação em tempo constante, emissão do grant),
 *   lib/preview/config (barreira de configuração e opções de cookie),
 *   lib/audit (evento `preview_login`).
 */
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

// Estado do rate limit, em memória e por instância: IP -> contagem e fim da
// janela. Em Map (não objeto) para que a varredura de expirados não perca
// chave protótipo e para limitar a entrada a 1000 IPs — ver `limited`.
const attempts = new Map<string, { count: number; until: number }>();
/**
 * Decide se a requisição está acima da cota do IP.
 *
 * Regras: janela de 60s com no máximo 20 tentativas por IP; entradas expiradas
 * são varridas de passagem (sem timer, o custo é só na chamada); e, com o Map
 * cheio (1000 IPs distintos), a rota recusa tudo — quem varre o token nunca vai
 * querer 1000 IPs de uma vez, e deixar o Map crescer sem teto seria o próprio
 * vetor de exaustão de memória.
 *
 * @param request - Requisição usada para extrair o IP do `x-forwarded-for`.
 * @returns `true` quando a cota estourou ou o Map está no limite de chaves.
 */
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

/**
 * Monta a resposta de erro padrão da rota.
 *
 * `private, no-store` em toda resposta desta rota: o texto do erro circula em
 * torno de autenticação e não pode repousar em cache de CDN ou de browser.
 *
 * @param message - Texto plano devolvido ao cliente.
 * @param status - Código HTTP da falha.
 * @returns NextResponse de texto com o status e o Cache-Control pedidos.
 */
function failure(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Autentica o token de preview e emite a sessão + grant.
 *
 * A ordem dos guards importa: origem, cota e configuração saem antes de
 * qualquer trabalho; o corpo é limitado a 4 KiB e seus campos sanitizados
 * antes de tocar no comparador; o token só é conferido por último, em tempo
 * constante (`equalSecret`), para não vazar por medição de tempo onde ele
 * divergiu. Acertando o token, o servidor autentica o usuário de preview fixo
 * em env e emite o `PREVIEW_COOKIE` com o `session_id` da sessão recém-criada.
 *
 * @param request - Requisição POST com formulário `token` (+ `slug` opcional).
 * @returns 303 com redirect para `/artigos/<slug>` (ou `/`) e cookies de sessão
 *   quando autorizado; caso contrário, `failure(...)` com o status da etapa que
 *   barrou. O `try/catch` final converte qualquer exceção do Supabase em 503
 *   auditado — a rota não pode devolver 500 com stack trace para quem tenta
 *   adivinhar o token.
 */
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
  // Slug restrito a kebab-case (mesmo formato do banco) e campo não repetido:
  // `get` devolve o primeiro, então um `token=` duplicado deixaria o valor
  // conferido divergir do que o formulário enviou por último (parameter
  // pollution) e um slug fora do padrão cairia direto no `notFound()`.
  if (
    (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
    form.getAll('token').length > 1 ||
    form.getAll('slug').length > 1
  )
    return failure('Entrada inválida.', 400);
  // Última barreira: origem, cota e formato já saíram sem custo, então o segredo
  // só é conferido por quem passou por tudo — e em tempo constante, para não
  // revelar por medição em que ponto o valor digitado divergiu.
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
    // Login com sucesso não basta: a conta precisa ser exatamente a de preview
    // (id conferido com env) e trazer a flag `preview` em app_metadata. Aceita
    // `true` e `'true'` porque o Supabase serializa booleans de metadata de um
    // jeito ou de outro conforme a origem da escrita.
    const { data: verified, error: userError } = await supabase.auth.getUser();
    const user = verified.user;
    if (
      userError ||
      !user ||
      user.id !== env.previewUserId ||
      ![true, 'true'].includes(user.app_metadata.preview)
    )
      return failure('Identidade não autorizada.', 403);
    // O grant é emitido por sessão, não por usuário: `session_id` precisa ser
    // UUID (formato antes de confiar no valor) e `sub` precisa bater com o
    // usuário recém-verificado — é o que permite revogar sessão a sessão.
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

/**
 * Recusa GET com 405 e `Allow: POST`.
 *
 * A rota é formulário: alcançá-la por link ou prefetch não tem o que autenticar
 * (não há corpo), então o aviso de método certo economiza uma tentativa vazia.
 *
 * @returns NextResponse 405 com o cabeçalho `Allow`.
 */
export function GET() {
  const response = failure('Use o formulário de preview.', 405);
  response.headers.set('Allow', 'POST');
  return response;
}
