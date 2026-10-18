/**
 * @fileoverview Testes unitários para o validador de elegibilidade de frete (Spec 0017 Fatia 2).
 * @module __tests__/unit/lib/offers/shipping-validation
 * @description Comprova o limite estrito de 15%, exceções de produto volumoso e região remota,
 *   auditoria manual vinculada, expiração e integridade de hashes.
 * @dependencies vitest, @/lib/offers/shipping-validation.
 */
import { describe, expect, it } from 'vitest';
import {
  validateShippingEligibility,
  type ShippingException,
} from '@/lib/offers/shipping-validation';

const now = new Date('2026-10-14T12:00:00.000Z');
const base = {
  offerId: 'offer-1',
  productId: 'product-1',
  priceCents: 10_000,
  shippingCostCents: 1_500,
  now,
};
const evidenceHash = 'a'.repeat(64);

function exception(
  overrides: Partial<ShippingException> = {},
): ShippingException {
  return {
    id: 'exception-1',
    type: 'bulky_product',
    productId: 'product-1',
    active: true,
    validFrom: '2026-10-01T00:00:00.000Z',
    validUntil: null,
    reviewedBy: 'admin-1',
    reviewedAt: '2026-10-02T00:00:00.000Z',
    evidenceHash,
    ...overrides,
  };
}

describe('validateShippingEligibility', () => {
  it('aceita frete zero', () => {
    expect(
      validateShippingEligibility({ ...base, shippingCostCents: 0 }).eligible,
    ).toBe(true);
  });

  it('aceita exatamente 15% (limite inclusivo)', () => {
    expect(
      validateShippingEligibility({ ...base, shippingCostCents: 1_500 }),
    ).toMatchObject({
      eligible: true,
      decision: 'eligible',
      reason: 'shipping_within_15_percent',
    });
  });

  it('rejeita 15,01%', () => {
    expect(
      validateShippingEligibility({ ...base, shippingCostCents: 1_501 }),
    ).toMatchObject({
      eligible: false,
      decision: 'rejected',
      reason: 'shipping_exceeds_15_percent_no_exception',
    });
  });

  it('rejeita preço zero, frete negativo e valores fracionários', () => {
    for (const input of [
      { ...base, priceCents: 0 },
      { ...base, shippingCostCents: -1 },
      { ...base, shippingCostCents: 10.5 },
    ]) {
      expect(validateShippingEligibility(input).reason).toBe('invalid_amount');
    }
  });

  it('rejeita produto sem exceção quando frete excede 15%', () => {
    expect(
      validateShippingEligibility({ ...base, shippingCostCents: 2_000 })
        .eligible,
    ).toBe(false);
  });

  it('não libera exceção volumosa sem auditoria manual vinculada', () => {
    expect(
      validateShippingEligibility({
        ...base,
        shippingCostCents: 2_000,
        exceptions: [exception()],
      }),
    ).toMatchObject({
      eligible: false,
      decision: 'manual_review_required',
      requiresManualReview: true,
      exceptionId: 'exception-1',
    });
  });

  it('aceita exceção volumosa após auditoria vinculada', () => {
    expect(
      validateShippingEligibility({
        ...base,
        shippingCostCents: 2_000,
        exceptions: [exception()],
        manuallyAuditedExceptionIds: ['exception-1'],
      }),
    ).toMatchObject({ eligible: true, decision: 'eligible_by_exception' });
  });

  it('não aplica exceção volumosa a outro produto', () => {
    expect(
      validateShippingEligibility({
        ...base,
        productId: 'product-2',
        shippingCostCents: 2_000,
        exceptions: [exception()],
      }).decision,
    ).toBe('rejected');
  });

  it('exige região exata para exceção remota', () => {
    const remote = exception({
      type: 'remote_region',
      productId: null,
      regionCode: 'BR-AM-01',
    });
    expect(
      validateShippingEligibility({
        ...base,
        shippingCostCents: 2_000,
        exceptions: [remote],
      }).decision,
    ).toBe('rejected');
    expect(
      validateShippingEligibility({
        ...base,
        shippingCostCents: 2_000,
        regionCode: 'br-am-01',
        exceptions: [remote],
      }).decision,
    ).toBe('manual_review_required');
  });

  it('falha fechado para exceção expirada ou inativa', () => {
    for (const item of [
      exception({ validUntil: '2026-10-10T00:00:00.000Z' }),
      exception({ active: false }),
    ]) {
      expect(
        validateShippingEligibility({
          ...base,
          shippingCostCents: 2_000,
          exceptions: [item],
        }).decision,
      ).toBe('rejected');
    }
  });

  it('falha fechado se o registro de exceção não tiver hash SHA-256 válido', () => {
    expect(
      validateShippingEligibility({
        ...base,
        shippingCostCents: 2_000,
        exceptions: [exception({ evidenceHash: 'not-a-hash' })],
      }).decision,
    ).toBe('rejected');
  });

  it('mantém comparação exata para valores grandes em centavos', () => {
    const priceCents = 9_000_000_000_000;
    expect(
      validateShippingEligibility({
        ...base,
        priceCents,
        shippingCostCents: 1_350_000_000_000,
      }).eligible,
    ).toBe(true);
  });
});
