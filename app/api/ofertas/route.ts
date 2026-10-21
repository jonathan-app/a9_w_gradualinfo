/**
 * @fileoverview app/api/ofertas/route.ts — consulta pública de ofertas ativas
 * @module app/api/ofertas/route
 * @description Rota pública para listar ofertas ativas e verificadas consumindo a view
 *   active_offers_view com validação defensiva de parâmetros, rate-limit por IP
 *   e sanitização fail-closed de erros (Spec 0021, AC-05 e AC-06).
 * @dependencies @/lib/supabase/server, @/lib/logger
 */

import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/utils/api-response';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate-limit público: 60 requisições por minuto por IP (mitiga scraping)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const ipRequestMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  entry.count += 1;
  return false;
}

export interface OfertasRouteDependencies {
  supabaseClient?: unknown;
}

export async function handleGetOfertas(
  request: Request,
  deps: OfertasRouteDependencies = {},
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');
  const merchantId = searchParams.get('merchant_id');
  const limitParam = searchParams.get('limit');

  // Rate-limit público: 60 req/min por IP (mitiga scraping)
  // Desativado em ambiente de teste para não prejudicar suítes que fazem
  // múltiplas requisições em sequência.
  if (process.env.NODE_ENV !== 'test') {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? (forwarded.split(',')[0]?.trim() ?? 'unknown')
      : 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Muitas requisições. Tente novamente mais tarde.',
        },
        { status: 429 },
      );
    }
  }

  // Validação defensiva de UUIDv4 nos filtros
  if (productId && !UUID_V4_REGEX.test(productId)) {
    return NextResponse.json(
      {
        error: 'invalid_parameter',
        message: 'O parâmetro product_id deve ser um UUIDv4 válido.',
      },
      { status: 400 },
    );
  }

  if (merchantId && !UUID_V4_REGEX.test(merchantId)) {
    return NextResponse.json(
      {
        error: 'invalid_parameter',
        message: 'O parâmetro merchant_id deve ser um UUIDv4 válido.',
      },
      { status: 400 },
    );
  }

  // Validação defensiva de limite (inteiro estrito entre 1 e 100)
  let limit = 20;
  if (limitParam !== null) {
    if (!/^\d+$/.test(limitParam)) {
      return NextResponse.json(
        {
          error: 'invalid_parameter',
          message: 'O parâmetro limit deve ser um número inteiro.',
        },
        { status: 400 },
      );
    }
    const parsedLimit = Number.parseInt(limitParam, 10);
    if (parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json(
        {
          error: 'invalid_parameter',
          message: 'O parâmetro limit deve ser um inteiro entre 1 e 100.',
        },
        { status: 400 },
      );
    }
    limit = parsedLimit;
  }

  const supabase = (deps.supabaseClient || createPublicClient()) as ReturnType<
    typeof createPublicClient
  >;

  let query = supabase
    .from('active_offers_view')
    .select(
      `
      id,
      product_id,
      merchant_id,
      price_cents,
      original_price_cents,
      payment_method,
      installment_count,
      installment_price_cents,
      shipping_cost_cents,
      affiliate_url,
      badge_status,
      badge_verified_at,
      badge_expires_at,
      status,
      created_at,
      updated_at
    `,
    )
    .limit(limit);

  if (productId) {
    query = query.eq('product_id', productId);
  }
  if (merchantId) {
    query = query.eq('merchant_id', merchantId);
  }

  let data: unknown[] | null;
  let error: { code?: string } | null;
  try {
    const result = await query;
    data = result.data;
    error = result.error;
  } catch {
    logger.info('api/ofertas', {
      event: 'query_exception',
    });
    return apiErrorResponse(
      503,
      'unavailable',
      'Serviço de ofertas temporariamente indisponível.',
    );
  }

  if (error) {
    logger.info('api/ofertas', {
      event: 'query_error',
      code: error.code,
    });
    return apiErrorResponse(
      503,
      'unavailable',
      'Serviço de ofertas temporariamente indisponível.',
    );
  }

  return NextResponse.json(
    { offers: data ?? [] },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}

export async function GET(request: Request): Promise<Response> {
  return handleGetOfertas(request);
}
