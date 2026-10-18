/**
 * lib/security-headers.ts — fonte única dos headers de segurança
 * @fileoverview Um lugar só para o conjunto de headers de segurança, usado pelo
 *   `next.config.ts` e pelas respostas montadas à mão no proxy e no guarda.
 * @module lib/security-headers
 * @description Resposta construída à mão (503 de indisponibilidade, 404 de
 *   artigo bloqueado, recusa do Access) não passa pelo `headers()` do
 *   `next.config.ts`: o Next só aplica aquele mecanismo nas respostas que ele
 *   mesmo renderiza. Sem esta módulo, cada resposta de falha ficava sem CSP e
 *   sem HSTS, justamente as respostas que mais precisam de fail closed.
 * @dependencies lib/env é lida pelo chamador e entra como parâmetro, para a
 *   função ser pura e testável sem mexer em `process.env`.
 *
 * Por que parâmetros e não `env` direto
 * - `env` é um objeto congelado na importação. Testar a variação produção vs
 *   desenvolvimento exigiria reimportar módulo com `vi.resetModules()`. Com
 *   parâmetros, o teste chama a função duas vezes e compara.
 * - Os dois chamadores já têm `env` em mãos; passar `env.isProduction` e
 *   `env.siteUrl` é uma linha cada.
 */

/**
 * Monta o valor da Content-Security-Policy.
 *
 * @param isProduction - `true` em produção some com o `unsafe-eval`.
 * @returns String pronta para o header.
 */
export function contentSecurityPolicy(isProduction: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' só fora de produção: o dev server do React precisa dele, e
    // em produção ele abriria eval para qualquer script injetado — por isso
    // some da string quando isProduction é true.
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://va.vercel-scripts.com https://www.googletagmanager.com https://static.cloudflareinsights.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // As duas origens do Cloudflare Web Analytics: a zona injeta o beacon no
    // HTML servido, e sem elas o nosso próprio header bloquearia a análise já
    // habilitada no painel.
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://static.cloudflareinsights.com https://cloudflareinsights.com",
    "frame-src 'self' https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    // Sem `form-action`: o Chromium (regressão M132+, crbug 393431137) bloqueia
    // o envio do form e o redirect posterior mesmo para a MESMA origem quando
    // a porta é custom/localhost, tornando o login do painel inoperante. A
    // mitigação de CSRF não depende dessa diretiva: login/logout/preview
    // validam Origin/Referer contra SITE_ORIGIN no servidor (AC-05).
  ].join('; ');
}

/**
 * Conjunto completo de headers de segurança.
 *
 * @param [options] - `isProduction` (padrão: o de `lib/env`) e `siteUrl`
 *   (padrão: o de `lib/env`) decidem o HSTS.
 * @returns Mapa de header para valor, pronto para `Object.entries` (next.config)
 *   ou para espalhar em `headers` de `Response`/`NextResponse`.
 */
export function securityHeaders(
  options: { isProduction?: boolean; siteUrl?: string } = {},
): Record<string, string> {
  const isProduction = options.isProduction ?? defaultIsProduction();
  const siteUrl = options.siteUrl ?? 'http://localhost:3000';
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': contentSecurityPolicy(isProduction),
  };
  // HSTS só em produção com host real em https: fixar max-age para localhost
  // prende o dev server ao TLS, e o aviso de certificado não confiável não tem
  // volta fácil — por isso a checagem de protocolo e de host.
  try {
    const url = new URL(siteUrl);
    if (
      isProduction &&
      url.protocol === 'https:' &&
      !['localhost', '127.0.0.1'].includes(url.hostname)
    ) {
      headers['Strict-Transport-Security'] =
        'max-age=31536000; includeSubDomains; preload';
    }
  } catch {
    // siteUrl inválido não pode derrubar a resposta: segue sem HSTS.
  }
  return headers;
}

/**
 * Fallback de `isProduction` quando o chamador não informa.
 *
 * @returns `true` quando `NODE_ENV` é production.
 */
function defaultIsProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
