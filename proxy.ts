/**
 * @fileoverview Executa antes de cada requisição — o antigo `middleware.ts` (Next 16).
 * @module proxy
 * @description Único lugar do projeto que roda antes de rota: renova a sessão Supabase a cada
 *   requisição (ver `lib/supabase/middleware.ts`). O Next 16 renomeou o arquivo — `proxy.ts`
 *   substitui `middleware.ts`; o nome antigo ainda funciona, mas emite aviso de depreciação, e
 *   os dois no mesmo projeto é erro de build.
 * @dependencies next/server (NextRequest), @/lib/supabase/middleware (updateSession).
 *
 * O Next 16 fixa o proxy no runtime Node (declarar `runtime` aqui é erro de build); o OpenNext
 * rotula o suporte a middleware Node como experimental e avisa no build — aviso conhecido, não
 * bug do projeto.
 *
 * Por que o `matcher` é restrito a caminhos que precisam de sessão: rodar `updateSession` em
 * asset estático é desperdício — uma requisição de `.woff2` não carrega cookie de sessão, então
 * a renovação seria trabalho inútil em cada download de fonte.
 *
 * Referência: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
import { guardAdminAccess } from '@/lib/admin/access-guard';
import { classifyAdminPath } from '@/lib/admin/access';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isLocalEditorialMode } from '@/lib/env';
import { getLocalPostBySlug } from '@/lib/editorial/local-posts';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Renova a sessão e aplica a visibilidade antes do streaming da rota.
 * @param request - Requisição recebida pelo Next.
 * @returns Resposta de continuidade ou bloqueio com os cookies atualizados.
 */
export async function proxy(request: NextRequest) {
  if (
    isLocalEditorialMode(
      process.env.NODE_ENV,
      process.env.EDITORIAL_LOCAL,
      process.env.NEXT_PUBLIC_SITE_URL,
      env.isProduction,
    ) &&
    request.nextUrl.hostname === 'localhost' &&
    (request.nextUrl.pathname === '/' ||
      /^\/artigos\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(request.nextUrl.pathname))
  ) {
    const slug = request.nextUrl.pathname.split('/')[2];
    // Decide o 404 antes do streaming; somente o catálogo local é consultado.
    if (slug && !getLocalPostBySlug(slug)) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), {
        status: 404,
      });
    }
    return NextResponse.next();
  }
  if (classifyAdminPath(request.nextUrl.pathname) !== 'public') {
    const failure = guardAdminAccess(request);
    if (failure) return failure;
  }
  const response = await updateSession(request);
  if (classifyAdminPath(request.nextUrl.pathname) !== 'public') {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

/** Seleciona caminhos que exigem sessão, incluindo os protegidos com extensão. */
export const config = {
  matcher: [
    // Caminhos protegidos não podem escapar da verificação por parecerem assets.
    '/admin-dashboard/:path*',
    '/api/admin/:path*',
    '/artigos/:path*',
    '/preview/:path*',
    '/api/preview/:path*',
    // sitemap.xml chama getPublishedPosts e precisa do probe de disponibilidade do Sanity
    '/sitemap.xml',
    // robots.txt precisa da sessão para a verificação de acesso
    '/robots.txt',
    /*
     * Tudo, exceto:
     *   _next/static   → build do Next
     *   _next/image    → otimizador de imagem
     *   favicon.ico    → ícone
     *   arquivo com extensão (.*\\..*) → qualquer asset estático
     *   api/health     → sonda de liveness; não consulta sessão
     */
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|txt|xml)$).*)',
  ],
};
