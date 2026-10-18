/**
 * @fileoverview Validação determinística de cupons da Spec 0017 (Fatia 3).
 * @module lib/offers/coupon-validation
 * @description Diferencia cupons universais de restritivos, calcula descontos
 *   fixos e percentuais em aritmética inteira e valida vigência e escopo.
 * @dependencies Nenhuma (funções puras).
 */

export type CouponKind = 'universal' | 'restricted';
export type CouponDiscountType = 'fixed_cents' | 'percent_bps';

export interface CouponDefinition {
  code: string;
  kind: CouponKind;
  discountType: CouponDiscountType;
  discountValue: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  merchantId: string | null;
  productId: string | null;
  variantKey: string | null;
}

export interface CouponValidationInput {
  basePriceCents: number;
  couponCode: string | null;
  coupon: CouponDefinition | null;
  merchantId: string;
  productId: string;
  variantKey: string;
  now?: Date;
}

export type CouponValidationResult =
  | {
      eligible: true;
      effectivePriceCents: number;
      discountCents: number;
      reason: 'no_coupon' | 'universal_coupon_applied';
    }
  | {
      eligible: false;
      effectivePriceCents: null;
      discountCents: 0;
      reason:
        | 'invalid_amount'
        | 'coupon_not_found'
        | 'coupon_inactive'
        | 'coupon_not_yet_valid'
        | 'coupon_expired'
        | 'coupon_restricted'
        | 'coupon_scope_mismatch'
        | 'coupon_invalid_discount';
    };

const isPositiveInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

/**
 * Valida a aplicabilidade de um cupom sobre o preço base.
 *
 * @param input - Dados do cupom, preço base e escopo de loja/produto/variante.
 * @returns Resultado com preço efetivo após desconto ou motivo de rejeição.
 */
export function validateCoupon(
  input: CouponValidationInput,
): CouponValidationResult {
  if (!isPositiveInteger(input.basePriceCents)) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'invalid_amount',
    };
  }
  if (!input.couponCode?.trim()) {
    return {
      eligible: true,
      effectivePriceCents: input.basePriceCents,
      discountCents: 0,
      reason: 'no_coupon',
    };
  }
  const coupon = input.coupon;
  if (
    !coupon ||
    coupon.code.trim().toUpperCase() !== input.couponCode.trim().toUpperCase()
  ) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_not_found',
    };
  }
  if (!coupon.isActive) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_inactive',
    };
  }
  const now = input.now ?? new Date();
  const start = Date.parse(coupon.validFrom);
  if (!Number.isFinite(start) || now.getTime() < start) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_not_yet_valid',
    };
  }
  if (coupon.validUntil) {
    const end = Date.parse(coupon.validUntil);
    if (!Number.isFinite(end) || now.getTime() >= end) {
      return {
        eligible: false,
        effectivePriceCents: null,
        discountCents: 0,
        reason: 'coupon_expired',
      };
    }
  }
  if (coupon.kind !== 'universal') {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_restricted',
    };
  }
  if (
    (coupon.merchantId && coupon.merchantId !== input.merchantId) ||
    (coupon.productId && coupon.productId !== input.productId) ||
    (coupon.variantKey && coupon.variantKey !== input.variantKey)
  ) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_scope_mismatch',
    };
  }
  if (
    !Number.isSafeInteger(coupon.discountValue) ||
    coupon.discountValue <= 0
  ) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_invalid_discount',
    };
  }
  let discountCents: number;
  if (coupon.discountType === 'fixed_cents') {
    discountCents = coupon.discountValue;
  } else {
    // percent_bps: 10000 = 100%. Arredonda para baixo para não extrapolar a taxa anunciada.
    if (coupon.discountValue > 10000) {
      return {
        eligible: false,
        effectivePriceCents: null,
        discountCents: 0,
        reason: 'coupon_invalid_discount',
      };
    }
    discountCents = Number(
      (BigInt(input.basePriceCents) * BigInt(coupon.discountValue)) / 10000n,
    );
  }
  if (discountCents <= 0 || discountCents >= input.basePriceCents) {
    return {
      eligible: false,
      effectivePriceCents: null,
      discountCents: 0,
      reason: 'coupon_invalid_discount',
    };
  }
  return {
    eligible: true,
    effectivePriceCents: input.basePriceCents - discountCents,
    discountCents,
    reason: 'universal_coupon_applied',
  };
}
