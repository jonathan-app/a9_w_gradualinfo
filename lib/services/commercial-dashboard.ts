/**
 * @fileoverview lib/services/commercial-dashboard.ts — serviço de leitura de dados comerciais para o dashboard operacional
 * @module lib/services/commercial-dashboard
 * @description Executa exclusivamente no servidor (server-only) consultas autorizadas de ofertas,
 *   cômputo deduplicado de medianas via RPC SQL e histórico de observações anômalas (Spec 0017 Regra 3).
 *   Utiliza cliente Supabase isolado com permissão de serviço, sem cookies e sem persistência de sessão,
 *   projetando apenas campos estritamente permitidos para a apresentação.
 * @dependencies server-only, @supabase/supabase-js, @/lib/env
 */
import 'server-only';

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { env, isSupabaseServiceRoleConfigured } from '@/lib/env';

export interface CommercialOfferItem {
  id: string;
  productId: string;
  merchantId: string;
  merchantName: string;
  title: string;
  priceCents: number;
  originalPriceCents: number | null;
  currency: string;
  paymentMethod: 'a_vista' | 'parcelado';
  badgeStatus: 'unverified' | 'verified' | 'expired' | 'rejected';
  badgeExpiresAt: string | null;
  status: string;
  median30dCents: number | null; // null = histórico insuficiente (< 5 amostras diárias UTC distintas)
  hasOutlier: boolean;
  outlierCount: number;
}

export interface CommercialDashboardData {
  status: 'configured' | 'unconfigured' | 'empty' | 'error';
  offers: CommercialOfferItem[];
  totalOffers: number;
  page: number;
  pageSize: number;
  errorMessage?: string;
}

/**
 * Cria cliente Supabase privilegiado com chave service_role exclusivamente no servidor.
 * Desativação estrita de persistência de sessão, sem compartilhamento de cookies com o cliente.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const serviceKey = env.supabase.serviceRoleKey?.trim();
  if (!serviceKey) return null;

  return createSupabaseClient(env.supabase.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

interface GetCommercialDashboardOptions {
  page?: number;
  pageSize?: number;
  customClient?: SupabaseClient | null;
}

/**
 * Obtém os dados consolidados do painel comercial de ofertas sob autorização do servidor.
 *
 * @param options - Parâmetros de paginação e injeção opcional de cliente para testes.
 * @returns CommercialDashboardData estruturado com projeção sanitizada.
 */
export async function getCommercialDashboardData(
  options: GetCommercialDashboardOptions = {},
): Promise<CommercialDashboardData> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize ?? 10));

  if (!isSupabaseServiceRoleConfigured && !options.customClient) {
    return {
      status: 'unconfigured',
      offers: [],
      totalOffers: 0,
      page,
      pageSize,
    };
  }

  const supabase = options.customClient ?? createServiceRoleClient();
  if (!supabase) {
    return {
      status: 'unconfigured',
      offers: [],
      totalOffers: 0,
      page,
      pageSize,
    };
  }

  try {
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    // 1. Busca de ofertas ativas com contagem total e junção de lojista
    const {
      data: rawOffers,
      error: offersError,
      count,
    } = await supabase
      .from('offers')
      .select(
        `
        id,
        product_id,
        merchant_id,
        title,
        price_cents,
        original_price_cents,
        currency,
        payment_method,
        badge_status,
        badge_expires_at,
        status,
        merchants:merchant_id ( name )
      `,
        { count: 'exact' },
      )
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex);

    if (offersError) {
      return {
        status: 'error',
        offers: [],
        totalOffers: 0,
        page,
        pageSize,
        errorMessage: 'Falha ao consultar catálogo de ofertas comerciais.',
      };
    }

    if (!rawOffers || rawOffers.length === 0) {
      return {
        status: 'empty',
        offers: [],
        totalOffers: 0,
        page,
        pageSize,
      };
    }

    // 2. Coleta de chaves únicas para deduplicação do cálculo de mediana
    // Chave de deduplicação: `${productId}:${merchantId}:${paymentMethod}`
    const medianCache = new Map<string, number | null>();
    const medianTuples: Array<{
      key: string;
      productId: string;
      merchantId: string;
      paymentMethod: string;
    }> = [];

    const productIdsSet = new Set<string>();

    for (const item of rawOffers) {
      productIdsSet.add(item.product_id);
      const tupleKey = `${item.product_id}:${item.merchant_id}:${item.payment_method}`;
      if (!medianCache.has(tupleKey)) {
        medianCache.set(tupleKey, null);
        medianTuples.push({
          key: tupleKey,
          productId: item.product_id,
          merchantId: item.merchant_id,
          paymentMethod: item.payment_method,
        });
      }
    }

    // 3. Execução deduplicada da RPC calculate_offer_median
    await Promise.all(
      medianTuples.map(async (tuple) => {
        try {
          const { data: medianResult, error: rpcError } = await supabase.rpc(
            'calculate_offer_median',
            {
              p_product_id: tuple.productId,
              p_merchant_id: tuple.merchantId,
              p_payment_method: tuple.paymentMethod,
            },
          );
          if (!rpcError && typeof medianResult === 'number') {
            medianCache.set(tuple.key, medianResult);
          } else {
            // Retorno null ou erro indica histórico insuficiente (< 5 amostras UTC)
            medianCache.set(tuple.key, null);
          }
        } catch {
          medianCache.set(tuple.key, null);
        }
      }),
    );

    // 4. Consulta de observações anômalas em public.price_history (is_anomalous = true)
    // Permissão de serviço permite recuperar anomalias ocultadas pelo RLS público
    const productIds = Array.from(productIdsSet);
    const outlierCountsByProduct = new Map<string, number>();

    if (productIds.length > 0) {
      const { data: anomalyRows, error: anomalyError } = await supabase
        .from('price_history')
        .select('product_id')
        .in('product_id', productIds)
        .eq('is_anomalous', true);

      if (!anomalyError && anomalyRows) {
        for (const row of anomalyRows) {
          const current = outlierCountsByProduct.get(row.product_id) ?? 0;
          outlierCountsByProduct.set(row.product_id, current + 1);
        }
      }
    }

    // 5. Mapeamento final para o DTO seguro
    const offers: CommercialOfferItem[] = rawOffers.map((item) => {
      const merchantObj = Array.isArray(item.merchants)
        ? item.merchants[0]
        : item.merchants;
      const merchantName =
        (merchantObj as { name?: string })?.name || 'Lojista Parceiro';

      const tupleKey = `${item.product_id}:${item.merchant_id}:${item.payment_method}`;
      const median30dCents = medianCache.get(tupleKey) ?? null;
      const outlierCount = outlierCountsByProduct.get(item.product_id) ?? 0;

      return {
        id: item.id,
        productId: item.product_id,
        merchantId: item.merchant_id,
        merchantName,
        title: item.title,
        priceCents: item.price_cents,
        originalPriceCents: item.original_price_cents,
        currency: item.currency || 'BRL',
        paymentMethod: item.payment_method as 'a_vista' | 'parcelado',
        badgeStatus: item.badge_status as CommercialOfferItem['badgeStatus'],
        badgeExpiresAt: item.badge_expires_at,
        status: item.status,
        median30dCents,
        hasOutlier: outlierCount > 0,
        outlierCount,
      };
    });

    return {
      status: 'configured',
      offers,
      totalOffers: count ?? offers.length,
      page,
      pageSize,
    };
  } catch {
    return {
      status: 'error',
      offers: [],
      totalOffers: 0,
      page,
      pageSize,
      errorMessage: 'Erro inesperado ao consultar dados comerciais.',
    };
  }
}
