/**
 * @fileoverview Testes unitários para o classificador determinístico de outliers da Spec 0017.
 * @module __tests__/unit/lib/offers/outlier-classifier.test
 */

import { describe, expect, it } from 'vitest';
import { classifyPriceObservation } from '@/lib/offers/outlier-classifier';

describe('classifyPriceObservation - Spec 0017 Regra 3', () => {
  describe('Série com histórico insuficiente (< 5 coletas consolidadas)', () => {
    it('retorna isAnomalous = false quando a mediana é null', () => {
      const res = classifyPriceObservation({
        medianCents: null,
        priceCents: 1000,
      });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('insufficient_history');
    });

    it('retorna isAnomalous = false quando a mediana é 0 ou negativa', () => {
      const res = classifyPriceObservation({
        medianCents: 0,
        priceCents: 1000,
      });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('insufficient_history');
    });
  });

  describe('Preços iguais ou superiores à mediana', () => {
    it('não classifica como anômalo quando o preço é igual à mediana', () => {
      const res = classifyPriceObservation({
        medianCents: 10000,
        priceCents: 10000,
      });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('price_above_or_equal_median');
    });

    it('não classifica como anômalo quando o preço é superior à mediana', () => {
      const res = classifyPriceObservation({
        medianCents: 10000,
        priceCents: 12000,
      });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('price_above_or_equal_median');
    });
  });

  describe('Produtos de ticket normal (mediana >= R$ 50,00 / 5000 centavos)', () => {
    const medianCents = 10000; // R$ 100,00

    it('permite desconto normal de 20% (R$ 80,00)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 8000 });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('normal_discount');
      expect(res.relativeDropRatio).toBeCloseTo(0.2);
    });

    it('permite desconto exato de 50% (R$ 50,00) como limite inclusivo tolerado', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 5000 });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('normal_discount');
      expect(res.relativeDropRatio).toBe(0.5);
    });

    it('permite desconto de 49.99% (R$ 50,01)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 5001 });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('normal_discount');
    });

    it('classifica como anômalo desconto estritamente superior a 50% (R$ 49,99 = 50.01% de queda)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 4999 });
      expect(res.isAnomalous).toBe(true);
      expect(res.reason).toBe('relative_drop_exceeded');
      expect(res.dropCents).toBe(5001);
    });

    it('classifica como anômalo queda drástica de 90% (R$ 10,00)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 1000 });
      expect(res.isAnomalous).toBe(true);
      expect(res.reason).toBe('relative_drop_exceeded');
    });
  });

  describe('Salvaguarda para produtos de baixo valor (mediana < R$ 50,00 / 5000 centavos)', () => {
    const medianCents = 4000; // R$ 40,00

    it('protege produto quando queda relativa é > 50% mas desvio absoluto é <= R$ 25,00 (R$ 18,00 anunciado, delta R$ 22,00)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 1800 });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('low_value_safeguard');
      expect(res.dropCents).toBe(2200);
      expect(res.relativeDropRatio).toBe(0.55);
    });

    it('tolera desvio absoluto de exatamente R$ 25,00 (R$ 15,00 anunciado, delta R$ 25,00)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 1500 });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('low_value_safeguard');
      expect(res.dropCents).toBe(2500);
      expect(res.relativeDropRatio).toBe(0.625);
    });

    it('classifica como anômalo quando desvio relativo > 50% E desvio absoluto > R$ 25,00 (R$ 14,00 anunciado, delta R$ 26,00)', () => {
      const res = classifyPriceObservation({ medianCents, priceCents: 1400 });
      expect(res.isAnomalous).toBe(true);
      expect(res.reason).toBe('relative_drop_exceeded');
      expect(res.dropCents).toBe(2600);
      expect(res.relativeDropRatio).toBe(0.65);
    });

    it('protege produto com tíquete muito baixo (R$ 20,00) onde mesmo 80% de queda é menor que R$ 25,00', () => {
      const res = classifyPriceObservation({
        medianCents: 2000,
        priceCents: 400,
      });
      expect(res.isAnomalous).toBe(false);
      expect(res.reason).toBe('low_value_safeguard');
      expect(res.dropCents).toBe(1600);
    });
  });
});
