/**
 * @fileoverview Limites do ambiente editorial local.
 * @module lib/editorial/local-mode
 * @description Permite rascunhos somente em desenvolvimento e em loopback.
 * @dependencies Nenhuma.
 */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Restringe o atalho local à home e ao segmento público de artigos (exclui assets com extensão). */
export function isLocalEditorialPath(host: string, path: string): boolean {
  return (
    LOOPBACK.has(host) &&
    (path === '/' || /^\/artigos\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(path))
  );
}
