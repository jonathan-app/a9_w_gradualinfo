/**
 * @fileoverview Pipeline integrador do selo Preço Verificado da Spec 0017 (Fatia 3).
 * @module lib/offers/verified-price-pipeline
 * @description Conecta as validações de variante, cupom universal, mediana de 30 dias
 *   e frete/exceções em uma decisão determinística e auditável com validade de 24 horas.
 * @dependencies ./coupon-validation, ./shipping-validation, ./variant-validation.
 */

import { validateCoupon, type CouponDefinition } from './coupon-validation';
import {
  validateShippingEligibility,
  type ShippingValidationInput,
} from './shipping-validation';
import {
  validateExactVariant,
  type VariantValidationInput,
} from './variant-validation';

export interface VerifiedPricePipelineInput {
  action: 'concessao' | 'renovacao';
  basePriceCents: number;
  median30dCents: number | null;
  couponCode: string | null;
  coupon: CouponDefinition | null;
  merchantId: string;
  productId: string;
  variantKey: string;
  variant: VariantValidationInput;
  shipping: Omit<ShippingValidationInput, 'priceCents'>;
  evidenceHash: string;
}

export interface VerifiedPricePipelineResult {
  approved: boolean;
  badgeStatus: 'verified' | 'rejected' | 'unverified';
  action: 'concessao' | 'renovacao';
  effectivePriceCents: number | null;
  discountCents: number;
  reason: string;
  auditRule: string;
  evidenceHash: string;
  badgeExpiresAt: string | null;
}

/**
 * Avalia deterministicamente uma oferta pelo pipeline completo do selo Preço Verificado.
 *
 * @param input - Dados completos de preço, cupom, frete, variante e evidência.
 * @param now - Instante de referência para vigência (default: new Date()).
 * @returns Decisão estruturada com status do selo, auditoria e expiração em 24h.
 */
export function evaluateVerifiedPrice(
  input: VerifiedPricePipelineInput,
  now = new Date(),
): VerifiedPricePipelineResult {
  const reject = (
    reason: string,
    badgeStatus: 'rejected' | 'unverified' = 'rejected',
    effectivePriceCents: number | null = null,
    discountCents = 0,
  ): VerifiedPricePipelineResult => ({
    approved: false,
    badgeStatus,
    action: input.action,
    effectivePriceCents,
    discountCents,
    reason,
    auditRule: `verified_price_pipeline:${reason}`,
    evidenceHash: input.evidenceHash,
    badgeExpiresAt: null,
  });

  if (!/^[a-f0-9]{64}$/.test(input.evidenceHash)) {
    return reject('invalid_evidence_hash');
  }
  const variant = validateExactVariant(input.variant);
  if (!variant.valid) {
    return reject(variant.reason);
  }

  const coupon = validateCoupon({
    basePriceCents: input.basePriceCents,
    couponCode: input.couponCode,
    coupon: input.coupon,
    merchantId: input.merchantId,
    productId: input.productId,
    variantKey: input.variantKey,
    now,
  });
  if (!coupon.eligible) {
    return reject(coupon.reason);
  }
  if (
    input.median30dCents === null ||
    !Number.isSafeInteger(input.median30dCents) ||
    input.median30dCents <= 0
  ) {
    return reject(
      'insufficient_history',
      'unverified',
      coupon.effectivePriceCents,
      coupon.discountCents,
    );
  }
  if (coupon.effectivePriceCents >= input.median30dCents) {
    return reject(
      'price_not_below_median',
      'unverified',
      coupon.effectivePriceCents,
      coupon.discountCents,
    );
  }

  const shipping = validateShippingEligibility({
    ...input.shipping,
    priceCents: coupon.effectivePriceCents,
  });
  if (!shipping.eligible) {
    return reject(
      shipping.reason,
      shipping.requiresManualReview ? 'unverified' : 'rejected',
      coupon.effectivePriceCents,
      coupon.discountCents,
    );
  }
  if (shipping.exceptionId) {
    const exception = input.shipping.exceptions?.find(
      (candidate) => candidate.id === shipping.exceptionId,
    );
    if (!exception || exception.evidenceHash !== input.evidenceHash) {
      return reject(
        'shipping_exception_evidence_hash_mismatch',
        'unverified',
        coupon.effectivePriceCents,
        coupon.discountCents,
      );
    }
  }

  return {
    approved: true,
    badgeStatus: 'verified',
    action: input.action,
    effectivePriceCents: coupon.effectivePriceCents,
    discountCents: coupon.discountCents,
    reason: shipping.reason,
    auditRule: shipping.exceptionId
      ? `shipping_exception:${shipping.exceptionId}`
      : 'median_30d_coupon_variant_shipping',
    evidenceHash: input.evidenceHash,
    badgeExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
