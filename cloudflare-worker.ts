/**
 * @fileoverview Ponto de entrada do Cloudflare Worker integrando OpenNext e Durable Objects.
 * @module cloudflare-worker
 * @description Exporta o handler principal gerado pelo OpenNext para o Next.js e expõe
 *   a classe PreviewSessionDO para atendimento aos bindings de Durable Object da Cloudflare.
 * @dependencies .open-next/worker.js, lib/preview/durable-object.
 */
export * from './.open-next/worker.js';
export { PreviewSessionDO } from './lib/preview/durable-object';
