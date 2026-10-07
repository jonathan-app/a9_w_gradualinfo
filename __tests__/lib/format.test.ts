/**
 * @fileoverview Suíte das funções de formatação de `lib/utils/format`.
 * @module __tests__/lib/format
 * @description Fixa o que o usuário vê: separador de milhar por locale, escala de centavos do
 *   formato monetário e iniciais de nome — inclusive quando a entrada é inesperada.
 * @dependencies vitest, @/lib/utils/format.
 *
 * As funções são puras e recebem locale por parâmetro justamente para poderem ser testadas
 * sem mock de módulo.
 */
import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  initials,
} from '@/lib/utils/format';
describe('formatNumber', () => {
  it('usa separador de milhar do locale', () => {
    // 1234 em pt-BR é "1.234"; o ponto é separador de milhar, não decimal.
    expect(formatNumber(1234, { locale: 'pt-BR' })).toBe('1.234');
    expect(formatNumber(1234, { locale: 'en-US' })).toBe('1,234');
  });
});

describe('formatCurrency', () => {
  it('trabalha em centavos e devolve reais', () => {
    // 12990 centavos são R$ 129,90 — não R$ 12.990,00. Confundir as duas
    // escalas é o erro clássico em preço.
    const resultado = formatCurrency(12990, { locale: 'pt-BR' });
    expect(resultado).toContain('129,90');
  });
});

describe('formatDate', () => {
  it('formata uma data ISO', () => {
    expect(formatDate('2026-01-15T12:00:00.000Z', { locale: 'pt-BR' })).toMatch(
      /2026/,
    );
  });

  it('aceita Date, string e timestamp', () => {
    const data = new Date('2026-01-15T12:00:00.000Z');
    expect(formatDate(data, { locale: 'pt-BR' })).toBe(
      formatDate(data.getTime(), { locale: 'pt-BR' }),
    );
  });
});

describe('initials', () => {
  it('usa o primeiro e o último nome', () => {
    expect(initials('Ana Maria Silva')).toBe('AS');
  });

  it('lida com espaço sobrando', () => {
    expect(initials('  Bruno  Costa ')).toBe('BC');
  });

  it('não quebra com nome vazio', () => {
    expect(initials('')).toBe('');
  });
});
