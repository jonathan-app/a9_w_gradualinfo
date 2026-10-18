/**
 * @fileoverview Validação exata de SKU e variante da Spec 0017 (Fatia 3).
 * @module lib/offers/variant-validation
 * @description Garante que a oferta corresponda ao SKU, EAN e especificações
 *   canônicas da variante, evitando contaminação entre modelos/cores distintos.
 * @dependencies Nenhuma (funções puras).
 */

export interface VariantValidationInput {
  canonicalSku: string | null;
  announcedSku: string | null;
  canonicalEan: string | null;
  announcedEan: string | null;
  canonicalVariant: Record<string, unknown>;
  announcedVariant: Record<string, unknown>;
}

export type VariantValidationResult =
  | { valid: true; reason: 'exact_sku_variant_match' }
  | {
      valid: false;
      reason:
        | 'sku_missing'
        | 'sku_mismatch'
        | 'ean_missing'
        | 'ean_mismatch'
        | 'variant_mismatch';
    };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Valida a correspondência estrita de SKU, EAN e especificações de variante.
 *
 * @param input - Dados canônicos e anunciados da oferta.
 * @returns Resultado com booleano `valid` e motivo padronizado.
 */
export function validateExactVariant(
  input: VariantValidationInput,
): VariantValidationResult {
  const canonicalSku = input.canonicalSku?.trim();
  const announcedSku = input.announcedSku?.trim();
  if (!canonicalSku || !announcedSku) {
    return { valid: false, reason: 'sku_missing' };
  }
  if (canonicalSku !== announcedSku) {
    return { valid: false, reason: 'sku_mismatch' };
  }
  if (input.canonicalEan) {
    if (!input.announcedEan?.trim()) {
      return { valid: false, reason: 'ean_missing' };
    }
    if (input.canonicalEan.trim() !== input.announcedEan.trim()) {
      return { valid: false, reason: 'ean_mismatch' };
    }
  }
  if (stable(input.canonicalVariant) !== stable(input.announcedVariant)) {
    return { valid: false, reason: 'variant_mismatch' };
  }
  return { valid: true, reason: 'exact_sku_variant_match' };
}
