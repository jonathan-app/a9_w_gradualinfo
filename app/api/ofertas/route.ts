/**
 * @fileoverview app/api/ofertas/route.ts — consulta pública de ofertas ativas
 * @module app/api/ofertas/route
 * @description Rota pública para listar ofertas ativas e verificadas consumindo a view
 *   active_offers_view com validação defensiva de parâmetros e sanitização fail-closed de erros (Spec 0021, AC-05 e AC-06).
 * @dependencies @/lib/supabase/server, @/lib/logger
 */

import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const { data, error } = await query;

  if (error) {
    logger.info('api/ofertas', {
      event: 'query_error',
      code: error.code,
    });
    return NextResponse.json(
      {
        error: 'unavailable',
        message: 'Serviço de ofertas temporariamente indisponível.',
      },
      { status: 503 },
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
