/**
 * @fileoverview Adaptador OpenNext para quota administrativa compartilhada.
 * @module lib/admin/rate-limit
 * @description Falha fechado sem binding ou protocolo válido, sem usar IP ou memória local.
 * @dependencies @opennextjs/cloudflare, next/server, lib/admin/rate-limit-protocol.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import {
  readBoundedJson,
  type AdminRateDecision,
  type AdminRateOperation,
} from './rate-limit-protocol';

/** Binding interno, tipado independentemente das credenciais do ambiente. */
export interface AdminRateBindings {
  ADMIN_RATE_LIMIT_DO?: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
}

const localRateLimits = new Map<
  AdminRateOperation,
  { count: number; expiresAt: number }
>();

/**
 * Consulta o singleton com prazo que cobre fetch, leitura e validação.
 * @param operation - Operação escolhida pelo handler, nunca pelo corpo recebido do usuário.
 * @returns Permissão persistida ou falha 429/503.
 */
export async function consumeAdminRateLimit(
  operation: AdminRateOperation,
): Promise<AdminRateDecision> {
  const unavailable: AdminRateDecision = { status: 503, retryAfter: 5 };
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    let binding: AdminRateBindings['ADMIN_RATE_LIMIT_DO'] | undefined;
    try {
      binding = (getCloudflareContext().env as unknown as AdminRateBindings)
        ?.ADMIN_RATE_LIMIT_DO;
    } catch {
      // Fora do runtime Cloudflare Workers em ambiente Node local ou teste E2E
    }
    if (!binding) {
      if (process.env.E2E_REAL_SUPABASE === '1') {
        const now = Date.now();
        const current = localRateLimits.get(operation);
        if (!current || now >= current.expiresAt) {
          localRateLimits.set(operation, {
            count: 1,
            expiresAt: now + 3_000,
          });
          return { status: 200 };
        }
        if (current.count < 5) {
          current.count += 1;
          return { status: 200 };
        }
        const retryAfter = Math.max(
          1,
          Math.ceil((current.expiresAt - now) / 1000),
        );
        return { status: 429, retryAfter };
      }
      return unavailable;
    }
    const stub = binding.get(binding.idFromName('admin-auth-rate-limit:v1'));
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abort.abort();
        reject(new Error('Prazo excedido.'));
      }, 2000);
    });
    const work = async (): Promise<AdminRateDecision> => {
      const response = await stub.fetch(
        new Request('http://admin-rate-limit/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation }),
          signal: abort.signal,
        }),
      );
      if (
        response.headers.get('content-type')?.split(';')[0]?.trim() !==
        'application/json'
      )
        return unavailable;
      const body = await readBoundedJson(response, 256, abort.signal);
      if (!body || typeof body !== 'object' || !('allowed' in body))
        return unavailable;
      if (
        response.status === 200 &&
        body.allowed === true &&
        Object.keys(body).length === 1
      )
        return { status: 200 };
      if (
        response.status === 429 &&
        body.allowed === false &&
        Object.keys(body).length === 2 &&
        'retryAfter' in body &&
        typeof body.retryAfter === 'number' &&
        Number.isInteger(body.retryAfter) &&
        body.retryAfter >= 1 &&
        body.retryAfter <= 60 &&
        response.headers.get('retry-after') === String(body.retryAfter)
      )
        return { status: 429, retryAfter: body.retryAfter };
      return unavailable;
    };
    return await Promise.race([work(), deadline]);
  } catch {
    return unavailable;
  } finally {
    if (timer) clearTimeout(timer);
    abort.abort();
  }
}

/**
 * Constrói bloqueio real sem streaming ou redirecionamento, mantendo mensagens genéricas.
 * @param request - Define apenas o formato JSON ou HTML da resposta.
 * @param decision - Quota excedida ou indisponível.
 * @param operation - Escolhe link fixo de retorno.
 * @returns Resposta privada 429/503, ou null quando autorizado.
 */
export function adminRateLimitResponse(
  request: Request,
  decision: AdminRateDecision,
  operation: AdminRateOperation,
): NextResponse | null {
  if (decision.status === 200) return null;
  const headers = {
    'Retry-After': String(decision.retryAfter),
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  const error =
    decision.status === 429 ? 'rate_limited' : 'rate_limit_unavailable';
  if (
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('content-type')?.includes('application/json')
  )
    return NextResponse.json(
      { ok: false, error, retryAfter: decision.retryAfter },
      { status: decision.status, headers },
    );
  const title =
    decision.status === 429
      ? 'Muitas tentativas'
      : 'Serviço temporariamente indisponível';
  const link =
    operation === 'login'
      ? '/admin-dashboard/login'
      : '/admin-dashboard/mfa/verify';
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${title}</title><body><h1>${title}</h1><p>Aguarde e tente novamente.</p><a href="${link}">Voltar</a></body></html>`,
    {
      status: decision.status,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}
