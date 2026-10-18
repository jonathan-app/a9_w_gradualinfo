/**
 * @fileoverview Ponto de entrada do Cloudflare Worker integrando OpenNext e Durable Objects.
 * @module cloudflare-worker
 * @description Exporta o handler principal gerado pelo OpenNext para o Next.js e expõe
 *   a classe PreviewSessionDO para atendimento aos bindings de Durable Object da Cloudflare.
 * @dependencies ../.open-next/worker.js, ../lib/admin/access-worker,
 *   ../lib/preview/durable-object, ../lib/admin/rate-limit-do.
 */
export * from '../.open-next/worker.js';
import openNextWorker from '../.open-next/worker.js';
import { isTestAccessHarnessAllowed } from '../lib/admin/access';
import { dispatchWithAdminAccess } from '../lib/admin/access-worker';

/** Primeira barreira, anterior ao adaptador e suas respostas automáticas. */
export default {
  /**
   * Admite a requisição usando bindings originais da plataforma.
   * @param request - Request original do Worker.
   * @param env - Bindings da plataforma.
   * @param ctx - Contexto de execução original.
   * @returns Resposta privada administrativa ou resposta pública normal.
   */
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const envRecord = env as unknown as Record<string, unknown>;
    let targetRequest = request;
    const url = new URL(request.url);
    const isLocalHarness =
      isTestAccessHarnessAllowed(envRecord) &&
      (Boolean(url.port) || url.protocol !== 'https:');

    if (isLocalHarness) {
      const allowedHosts = String(envRecord.ADMIN_ACCESS_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean);
      const primaryHost = allowedHosts[0] || 'admin.example.test';
      const normalized = new URL(request.url);
      normalized.protocol = 'https:';
      normalized.port = '';
      normalized.hostname = primaryHost;
      const headers = new Headers(request.headers);
      if (!headers.get('cf-access-jwt-assertion')) {
        const cookie = headers.get('cookie') || '';
        const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
        if (match && match[1]) {
          headers.set('cf-access-jwt-assertion', decodeURIComponent(match[1]));
        }
      }
      headers.set('host', primaryHost);
      const allowedOriginHosts = [
        'localhost',
        '127.0.0.1',
        'gradualinfo.com.br',
        'admin.example.test',
      ];
      if (headers.get('origin')) {
        try {
          const origUrl = new URL(headers.get('origin')!);
          if (allowedOriginHosts.includes(origUrl.hostname)) {
            headers.set('origin', 'https://gradualinfo.com.br');
          }
        } catch {
          // Mantém o origin original se for inválido ou não-local
        }
      }
      if (headers.get('referer')) {
        try {
          const ref = new URL(headers.get('referer')!);
          if (allowedOriginHosts.includes(ref.hostname)) {
            headers.set(
              'referer',
              `https://gradualinfo.com.br${ref.pathname}${ref.search}`,
            );
          }
        } catch {
          // Ignora se o referer não puder ser parseado como URL válida
        }
      }
      targetRequest = new Request(normalized, {
        method: request.method,
        headers,
        body: request.body,
        // @ts-expect-error duplex required for streaming body in fetch
        duplex: request.body ? 'half' : undefined,
      });
    }

    const response = await dispatchWithAdminAccess(
      targetRequest,
      envRecord,
      (req, scoped) =>
        openNextWorker.fetch(req, scoped as unknown as CloudflareEnv, ctx),
    );

    if (isLocalHarness && response.headers.has('location')) {
      const location = response.headers.get('location')!;
      const localOrigin = String(
        envRecord.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin,
      );
      const rewritten = location.replace(
        /^https?:\/\/(?:admin\.example\.test|(?:www\.)?gradualinfo\.com\.br)(?::\d+)?/,
        localOrigin,
      );
      if (rewritten !== location) {
        const headers = new Headers(response.headers);
        headers.set('location', rewritten);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    }
    return response;
  },
};
export { PreviewSessionDO } from '../lib/preview/durable-object';
export { AdminRateLimitDO } from '../lib/admin/rate-limit-do';
