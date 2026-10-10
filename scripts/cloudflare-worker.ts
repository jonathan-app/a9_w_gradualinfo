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
    return dispatchWithAdminAccess(
      request,
      env as unknown as Record<string, unknown>,
      (req, scoped) =>
        openNextWorker.fetch(req, scoped as unknown as CloudflareEnv, ctx),
    );
  },
};
export { PreviewSessionDO } from '../lib/preview/durable-object';
export { AdminRateLimitDO } from '../lib/admin/rate-limit-do';
