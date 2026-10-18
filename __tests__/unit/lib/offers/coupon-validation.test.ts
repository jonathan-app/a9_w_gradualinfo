/**
 * @fileoverview Testes unitários para o validador de cupons (Spec 0017 Fatia 3).
 * @module __tests__/unit/lib/offers/coupon-validation.test
 * @description Comprova o cálculo de descontos fixos e percentuais em centavos inteiros,
 *   rejeição de cupons restritivos, vigência e correspondência de escopo.
 * @dependencies vitest, @/lib/offers/coupon-validation.
 */

import { describe, expect, it } from 'vitest';
import {
  validateCoupon,
  type CouponDefinition,
} from '@/lib/offers/coupon-validation';

const now = new Date('2026-10-14T12:00:00.000Z');
const base = {
  basePriceCents: 10_000,
  couponCode: 'SAVE10',
  merchantId: 'merchant-1',
  productId: 'product-1',
  variantKey: 'variant-1',
  now,
};
const coupon: CouponDefinition = {
  code: 'SAVE10',
  kind: 'universal',
  discountType: 'percent_bps',
  discountValue: 1000,
  isActive: true,
  validFrom: '2026-10-01T00:00:00.000Z',
  validUntil: null,
  merchantId: null,
  productId: null,
  variantKey: null,
};

describe('validateCoupon', () => {
  it('não altera preço sem cupom', () => {
    expect(
      validateCoupon({ ...base, couponCode: null, coupon: null }),
    ).toMatchObject({
      eligible: true,
      effectivePriceCents: 10_000,
      discountCents: 0,
      reason: 'no_coupon',
    });
  });

  it('calcula percentual em centavos inteiros e arredonda para baixo', () => {
    expect(
      validateCoupon({ ...base, basePriceCents: 999, coupon }),
    ).toMatchObject({
      eligible: true,
      effectivePriceCents: 900,
      discountCents: 99,
    });
  });

  it('aplica desconto fixo em centavos', () => {
    expect(
      validateCoupon({
        ...base,
        coupon: {
          ...coupon,
          discountType: 'fixed_cents',
          discountValue: 750,
        },
      }),
    ).toMatchObject({
      eligible: true,
      effectivePriceCents: 9_250,
      discountCents: 750,
    });
  });

  it('rejeita cupom restritivo', () => {
    expect(
      validateCoupon({ ...base, coupon: { ...coupon, kind: 'restricted' } }),
    ).toMatchObject({ eligible: false, reason: 'coupon_restricted' });
  });

  it('rejeita escopo de variante divergente', () => {
    expect(
      validateCoupon({ ...base, coupon: { ...coupon, variantKey: 'other' } }),
    ).toMatchObject({ eligible: false, reason: 'coupon_scope_mismatch' });
  });

  it('rejeita cupom expirado e desconto maior que o preço', () => {
    expect(
      validateCoupon({
        ...base,
        coupon: { ...coupon, validUntil: '2026-10-14T11:59:59.000Z' },
      }).reason,
    ).toBe('coupon_expired');
    expect(
      validateCoupon({
        ...base,
        coupon: {
          ...coupon,
          discountType: 'fixed_cents',
          discountValue: 10_000,
        },
      }).reason,
    ).toBe('coupon_invalid_discount');
  });
});
