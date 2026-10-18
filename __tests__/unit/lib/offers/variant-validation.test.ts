/**
 * @fileoverview Testes unitários para o validador de variantes exatas (Spec 0017 Fatia 3).
 * @module __tests__/unit/lib/offers/variant-validation.test
 * @description Comprova a correspondência estrita de SKU, EAN e atributos JSON
 *   independentemente da ordenação das chaves.
 * @dependencies vitest, @/lib/offers/variant-validation.
 */

import { describe, expect, it } from 'vitest';
import { validateExactVariant } from '@/lib/offers/variant-validation';

const base = {
  canonicalSku: 'NB-16-512',
  announcedSku: 'NB-16-512',
  canonicalEan: '7891234567890',
  announcedEan: '7891234567890',
  canonicalVariant: { ram_gb: 16, storage_gb: 512, cpu: 'gen-14' },
  announcedVariant: { cpu: 'gen-14', storage_gb: 512, ram_gb: 16 },
};

describe('validateExactVariant', () => {
  it('aceita SKU, EAN e parâmetros idênticos independentemente da ordem das chaves', () => {
    expect(validateExactVariant(base)).toEqual({
      valid: true,
      reason: 'exact_sku_variant_match',
    });
  });

  it('rejeita SKU ausente ou divergente', () => {
    expect(validateExactVariant({ ...base, announcedSku: null }).reason).toBe(
      'sku_missing',
    );
    expect(
      validateExactVariant({ ...base, announcedSku: 'NB-8-256' }).reason,
    ).toBe('sku_mismatch');
  });

  it('exige EAN anunciado quando o catálogo possui EAN', () => {
    expect(validateExactVariant({ ...base, announcedEan: null }).reason).toBe(
      'ean_missing',
    );
    expect(
      validateExactVariant({ ...base, announcedEan: '0000000000000' }).reason,
    ).toBe('ean_mismatch');
  });

  it('rejeita divergência em qualquer parâmetro de variante', () => {
    expect(
      validateExactVariant({
        ...base,
        announcedVariant: { ...base.announcedVariant, ram_gb: 8 },
      }).reason,
    ).toBe('variant_mismatch');
  });
});
