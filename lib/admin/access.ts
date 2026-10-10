/**
 * @fileoverview Admissão criptográfica Access antes do despacho OpenNext.
 * @module lib/admin/access
 * @description Valida configuração, JWT e JWKS sem persistir identidade ou asserção.
 * @dependencies jose, lib/env, lib/admin/rate-limit-protocol.
 */
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';
import { readAdminAccessConfig, type AdminAccessConfig } from '../env';
import { readBoundedJson } from './rate-limit-protocol';

/** Resultado transportado exclusivamente no env da requisição atual. */
export interface AdminAccessContext {
  version: 1;
  authority: string;
  method: string;
  pathname: string;
  deadline: number;
  allowed: true;
}

class AccessUnavailable extends Error {}
interface KeysState {
  issuer: string;
  keys: JWK[];
  expires: number;
  lastFetch: number;
  pending?: Promise<void>;
}

/**
 * Classifica também formas codificadas que não podem escapar como públicas.
 * @param pathname - Caminho da URL recebida na entrada Worker.
 * @returns public, protected ou ambiguous, sem despachar caminhos ambíguos.
 */
export function classifyAdminPath(
  pathname: string,
): 'public' | 'protected' | 'ambiguous' {
  const protectedPath = (path: string) =>
    ['/admin-dashboard', '/api/admin'].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  if (protectedPath(pathname))
    return /%|\\|\/\//.test(pathname) ? 'ambiguous' : 'protected';
  let candidate = pathname;
  // Decodificação até ponto fixo: o limite é o tamanho de entrada, que diminui.
  for (let index = 0; index <= pathname.length; index++) {
    const normalized = candidate.replaceAll('\\', '/').replace(/\/{2,}/g, '/');
    const resolved = new URL(normalized, 'https://path.invalid').pathname;
    if (protectedPath(normalized) || protectedPath(resolved))
      return 'ambiguous';
    try {
      const next = decodeURIComponent(candidate);
      if (next === candidate) return 'public';
      candidate = next;
    } catch {
      return candidate.includes('admin') ? 'ambiguous' : 'public';
    }
  }
  return 'ambiguous';
}

/**
 * Constrói uma recusa sanitizada sem eco de entrada.
 * @param request - Seleciona somente JSON ou HTML.
 * @param status - Recusa, forma ambígua ou indisponibilidade.
 * @returns Resposta privada, sem redirect.
 */
export function accessFailureResponse(
  request: Request | undefined,
  status: 400 | 403 | 503,
): Response {
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  if (status === 503) headers['Retry-After'] = '5';
  const error = status === 503 ? 'access_unavailable' : 'access_denied';
  if (
    request?.headers.get('accept')?.includes('application/json') ||
    request?.headers.get('content-type')?.includes('application/json')
  )
    return Response.json({ ok: false, error }, { status, headers });
  return new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Acesso restrito</title><p>Acesso indisponível ou não permitido.</p></html>',
    {
      status,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

function authority(request: Request, config: AdminAccessConfig): string | null {
  const url = new URL(request.url);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.port ||
    url.hostname.endsWith('.') ||
    !config.hosts.includes(url.hostname)
  )
    return null;
  const host = request.headers.get('host');
  if (host && host.toLowerCase().replace(/:443$/, '') !== url.hostname)
    return null;
  return url.hostname;
}

function validKeys(value: unknown): JWK[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('keys' in value) ||
    !Array.isArray(value.keys) ||
    value.keys.length > 64
  )
    throw new AccessUnavailable();
  const keys: JWK[] = [];
  for (const key of value.keys) {
    if (!key || typeof key !== 'object') throw new AccessUnavailable();
    if (
      key.kty !== 'RSA' ||
      (key.alg !== undefined && key.alg !== 'RS256') ||
      (key.use !== undefined && key.use !== 'sig')
    )
      continue;
    if (
      typeof key.kid !== 'string' ||
      !key.kid ||
      key.kid.length > 256 ||
      typeof key.n !== 'string' ||
      !/^[A-Za-z0-9_-]+$/.test(key.n) ||
      typeof key.e !== 'string' ||
      !/^[A-Za-z0-9_-]+$/.test(key.e) ||
      ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'].some((name) => name in key) ||
      (key.key_ops !== undefined &&
        (!Array.isArray(key.key_ops) ||
          !key.key_ops.includes('verify') ||
          key.key_ops.some((operation: unknown) => operation !== 'verify')))
    )
      throw new AccessUnavailable();
    if (keys.some((existing) => existing.kid === key.kid))
      throw new AccessUnavailable();
    keys.push(key as JWK);
  }
  return keys;
}

/**
 * Cria verificador com cache limitado de chaves públicas, nunca tokens.
 * @param fetchKeys - Fetch da plataforma, injetável em testes de falhas.
 * @returns Função de admissão usando env explícito do Worker.
 */
export function createAccessAdmission(fetchKeys: typeof fetch = fetch) {
  let state: KeysState | undefined;
  async function keyFor(
    config: AdminAccessConfig,
    kid: string,
  ): Promise<JWK | undefined> {
    if (!state || state.issuer !== config.issuer)
      state = {
        issuer: config.issuer,
        keys: [],
        expires: 0,
        lastFetch: -Infinity,
      };
    const current = state;
    const now = performance.now();
    const existing = current.keys.find((key) => key.kid === kid);
    if (existing && now < current.expires) return existing;
    if (!current.pending && now - current.lastFetch >= 30000) {
      current.lastFetch = now;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AccessUnavailable());
        }, 2000);
      });
      const work = (async () => {
        try {
          const response = await fetchKeys(
            `${config.issuer}/cdn-cgi/access/certs`,
            { signal: controller.signal, redirect: 'error' },
          );
          if (
            response.status !== 200 ||
            response.headers.get('content-type')?.split(';')[0]?.trim() !==
              'application/json'
          )
            throw new AccessUnavailable();
          const keys = validKeys(
            await readBoundedJson(response, 65536, controller.signal),
          );
          if (controller.signal.aborted) throw new AccessUnavailable();
          current.keys = keys;
          current.expires = performance.now() + 300000;
        } catch {
          throw new AccessUnavailable();
        }
      })();
      current.pending = Promise.race([work, timeout]).finally(() => {
        if (timer) clearTimeout(timer);
        current.pending = undefined;
      });
    }
    if (current.pending) await current.pending;
    if (performance.now() >= current.expires) throw new AccessUnavailable();
    return current.keys.find((key) => key.kid === kid);
  }
  return async (
    request: Request,
    bindings: Record<string, unknown>,
  ): Promise<AdminAccessContext | Response> => {
    const deadline = performance.now() + 2000;
    const config = readAdminAccessConfig(bindings);
    if (!config) return accessFailureResponse(request, 503);
    const host = authority(request, config);
    if (!host) return accessFailureResponse(request, 403);
    const token = request.headers.get('cf-access-jwt-assertion');
    if (!token || new TextEncoder().encode(token).length > 8192)
      return accessFailureResponse(request, 403);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = async () => {
        const header = decodeProtectedHeader(token);
        if (
          header.alg !== 'RS256' ||
          typeof header.kid !== 'string' ||
          !header.kid ||
          header.kid.length > 256 ||
          header.jku ||
          header.x5u
        )
          return accessFailureResponse(request, 403);
        const jwk = await keyFor(config, header.kid);
        if (!jwk) return accessFailureResponse(request, 403);
        if (performance.now() >= deadline) throw new AccessUnavailable();
        let key;
        try {
          key = await importJWK(jwk, 'RS256');
        } catch {
          throw new AccessUnavailable();
        }
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['RS256'],
          issuer: config.issuer,
          audience: config.audience,
          clockTolerance: 5,
          requiredClaims: ['iat', 'exp', 'sub', 'email', 'type'],
        });
        if (
          !Number.isSafeInteger(payload.iat) ||
          !Number.isSafeInteger(payload.exp) ||
          (payload.nbf !== undefined && !Number.isSafeInteger(payload.nbf)) ||
          !payload.iat ||
          !payload.exp ||
          payload.exp <= payload.iat ||
          payload.exp - payload.iat > 3600 ||
          payload.iat > Date.now() / 1000 + 5 ||
          payload.type !== 'app' ||
          typeof payload.sub !== 'string' ||
          !payload.sub ||
          payload.email !== config.ownerEmail
        )
          return accessFailureResponse(request, 403);
        if (performance.now() >= deadline) throw new AccessUnavailable();
        return Object.freeze({
          version: 1 as const,
          authority: host,
          method: request.method,
          pathname: new URL(request.url).pathname,
          deadline,
          allowed: true as const,
        });
      };
      return await Promise.race([
        work(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new AccessUnavailable()),
            Math.max(0, deadline - performance.now()),
          );
        }),
      ]);
    } catch (error) {
      return accessFailureResponse(
        request,
        error &&
          typeof error === 'object' &&
          'code' in error &&
          [
            'ERR_JWS_INVALID',
            'ERR_JWT_INVALID',
            'ERR_JWT_EXPIRED',
            'ERR_JWT_CLAIM_VALIDATION_FAILED',
            'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
            'ERR_JOSE_ALG_NOT_ALLOWED',
          ].includes(String(error.code))
          ? 403
          : 503,
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

/** Verificador único do isolate, com cache somente de JWKS. */
export const admitAdminAccess = createAccessAdmission();
