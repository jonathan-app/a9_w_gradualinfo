/**
 * @fileoverview Testes unitários para a integração do pipeline do selo Preço Verificado (Spec 0017 Fatia 3).
 * @module __tests__/unit/lib/offers/verified-price-pipeline.test
 * @description Comprova o fluxo completo: aprovação combinada, bloqueio de SKU divergente,
 *   rejeição de cupom restritivo, tratamento de histórico insuficiente e preço acima da mediana.
 * @dependencies vitest, @/lib/offers/verified-price-pipeline.
 */

import { describe, expect, it } from 'vitest';
import {
  evaluateVerifiedPrice,
  type VerifiedPricePipelineInput,
} from '@/lib/offers/verified-price-pipeline';

const now = new Date('2026-10-14T12:00:00.000Z');
const input: VerifiedPricePipelineInput = {
  action: 'concessao',
  basePriceCents: 9_000,
  median30dCents: 10_000,
  couponCode: null,
  coupon: null,
  merchantId: 'merchant-1',
  productId: 'product-1',
  variantKey: 'v1',
  variant: {
    canonicalSku: 'SKU-1',
    announcedSku: 'SKU-1',
    canonicalEan: '123',
    announcedEan: '123',
    canonicalVariant: { ram: 16, storage: 512 },
    announcedVariant: { storage: 512, ram: 16 },
  },
  shipping: {
    offerId: 'offer-1',
    productId: 'product-1',
    shippingCostCents: 1_000,
  },
  evidenceHash: 'a'.repeat(64),
};

describe('evaluateVerifiedPrice integration', () => {
  it('concede selo quando SKU, variante, histórico, cupom e frete passam', () => {
    expect(evaluateVerifiedPrice(input, now)).toMatchObject({
      approved: true,
      badgeStatus: 'verified',
      effectivePriceCents: 9_000,
      reason: 'shipping_within_15_percent',
      badgeExpiresAt: '2026-10-15T12:00:00.000Z',
    });
  });

  it('bloqueia SKU divergente antes de emitir selo', () => {
    expect(
      evaluateVerifiedPrice(
        {
          ...input,
          variant: { ...input.variant, announcedSku: 'SKU-OTHER' },
        },
        now,
      ),
    ).toMatchObject({
      approved: false,
      badgeStatus: 'rejected',
      reason: 'sku_mismatch',
    });
  });

  it('não concede selo com cupom restritivo', () => {
    expect(
      evaluateVerifiedPrice(
        {
          ...input,
          couponCode: 'VIP',
          coupon: {
            code: 'VIP',
            kind: 'restricted',
            discountType: 'fixed_cents',
            discountValue: 500,
            isActive: true,
            validFrom: '2026-10-01T00:00:00.000Z',
            validUntil: null,
            merchantId: null,
            productId: null,
            variantKey: null,
          },
        },
        now,
      ),
    ).toMatchObject({ approved: false, reason: 'coupon_restricted' });
  });

  it('mantém selo oculto quando histórico é insuficiente', () => {
    expect(
      evaluateVerifiedPrice({ ...input, median30dCents: null }, now),
    ).toMatchObject({
      approved: false,
      badgeStatus: 'unverified',
      reason: 'insufficient_history',
    });
  });

  it('rejeita preço não inferior à mediana', () => {
    expect(
      evaluateVerifiedPrice({ ...input, basePriceCents: 10_000 }, now),
    ).toMatchObject({ approved: false, reason: 'price_not_below_median' });
  });
});
