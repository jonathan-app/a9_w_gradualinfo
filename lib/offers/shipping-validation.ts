/**
 * @fileoverview Regras determinísticas de elegibilidade de frete da Spec 0017 (Fatia 2).
 * @module lib/offers/shipping-validation
 * @description Implementa a avaliação de frete: frete <= 15% do preço em aritmética
 *   inteira de centavos, validação de catálogo de exceções (produtos volumosos e regiões
 *   remotas) com evidência auditada SHA-256 e postura de falha segura (fail-closed).
 * @dependencies Nenhuma (funções puras).
 */

export type ShippingExceptionType = 'bulky_product' | 'remote_region';

export interface ShippingException {
  id: string;
  type: ShippingExceptionType;
  productId?: string | null;
  regionCode?: string | null;
  active: boolean;
  validFrom: string;
  validUntil?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  evidenceHash: string;
}

export interface ShippingValidationInput {
  offerId: string;
  productId: string;
  priceCents: number;
  shippingCostCents: number;
  regionCode?: string | null;
  now?: Date;
  exceptions?: ShippingException[];
  manuallyAuditedExceptionIds?: string[];
}

export type ShippingDecision =
  'eligible' | 'rejected' | 'manual_review_required' | 'eligible_by_exception';

export interface ShippingValidationResult {
  eligible: boolean;
  decision: ShippingDecision;
  reason:
    | 'invalid_amount'
    | 'shipping_within_15_percent'
    | 'shipping_exceeds_15_percent_no_exception'
    | 'exception_catalogued_but_manual_audit_missing'
    | 'catalogued_exception_with_manual_audit';
  exceptionId: string | null;
  requiresManualReview: boolean;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

function isValidMoney(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isValidPrice(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isCurrent(exception: ShippingException, now: Date): boolean {
  const start = Date.parse(exception.validFrom);
  const end = exception.validUntil
    ? Date.parse(exception.validUntil)
    : Infinity;
  return (
    Number.isFinite(start) && start <= now.getTime() && end > now.getTime()
  );
}

function hasValidScope(exception: ShippingException): boolean {
  if (exception.type === 'bulky_product') {
    return Boolean(exception.productId?.trim()) && !exception.regionCode;
  }
  return (
    !exception.productId &&
    Boolean(
      exception.regionCode &&
      /^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(exception.regionCode),
    )
  );
}

function hasValidReview(exception: ShippingException): boolean {
  return Boolean(
    exception.reviewedBy?.trim() &&
    exception.reviewedAt &&
    Number.isFinite(Date.parse(exception.reviewedAt)) &&
    SHA256_HEX.test(exception.evidenceHash),
  );
}

/**
 * Valida deterministicamente a elegibilidade de frete de uma oferta.
 *
 * @param input - Dados da oferta, preço, frete e lista opcional de exceções catalogadas.
 * @returns Resultado contendo elegibilidade booleana, decisão padronizada, motivo e ID de exceção.
 *
 * O limite é inclusivo: frete * 100 <= preço * 15 em aritmética inteira.
 * A exceção catalogada só é elegível quando a auditoria manual correspondente
 * já está vinculada ao ID da exceção. A camada de persistência deve validar o
 * hash exato da evidência e a origem admin_aal2, como faz a função SQL.
 */
export function validateShippingEligibility(
  input: ShippingValidationInput,
): ShippingValidationResult {
  const invalid =
    !input.offerId.trim() ||
    !input.productId.trim() ||
    !isValidPrice(input.priceCents) ||
    !isValidMoney(input.shippingCostCents);

  if (invalid) {
    return {
      eligible: false,
      decision: 'rejected',
      reason: 'invalid_amount',
      exceptionId: null,
      requiresManualReview: false,
    };
  }

  if (
    BigInt(input.shippingCostCents) * 100n <=
    BigInt(input.priceCents) * 15n
  ) {
    return {
      eligible: true,
      decision: 'eligible',
      reason: 'shipping_within_15_percent',
      exceptionId: null,
      requiresManualReview: false,
    };
  }

  const now = input.now ?? new Date();
  const regionCode = input.regionCode?.trim().toUpperCase() || null;
  const candidates = (input.exceptions ?? [])
    .filter((exception) => {
      if (
        !exception.active ||
        !isCurrent(exception, now) ||
        !hasValidScope(exception) ||
        !hasValidReview(exception)
      ) {
        return false;
      }
      if (exception.type === 'bulky_product') {
        return exception.productId === input.productId;
      }
      return Boolean(
        regionCode && exception.regionCode?.toUpperCase() === regionCode,
      );
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'bulky_product' ? -1 : 1;
      return b.validFrom.localeCompare(a.validFrom);
    });

  const exception = candidates[0];
  if (!exception) {
    return {
      eligible: false,
      decision: 'rejected',
      reason: 'shipping_exceeds_15_percent_no_exception',
      exceptionId: null,
      requiresManualReview: false,
    };
  }

  if (!(input.manuallyAuditedExceptionIds ?? []).includes(exception.id)) {
    return {
      eligible: false,
      decision: 'manual_review_required',
      reason: 'exception_catalogued_but_manual_audit_missing',
      exceptionId: exception.id,
      requiresManualReview: true,
    };
  }

  return {
    eligible: true,
    decision: 'eligible_by_exception',
    reason: 'catalogued_exception_with_manual_audit',
    exceptionId: exception.id,
    requiresManualReview: false,
  };
}
