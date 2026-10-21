/**
 * @fileoverview Testes unitários para format.ts
 * @module __tests__/unit/lib/utils/format
 * @description Testa formatNumber, formatCurrency, formatDate,
 *   formatRelativeDate, initials, serializeJsonLd, slugify,
 *   buildStableEditoriaIdMap.
 */

import { describe, expect, it } from 'vitest';

import {
  buildStableEditoriaIdMap,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDate,
  initials,
  serializeJsonLd,
  slugify,
} from '@/lib/utils/format';

describe('formatNumber', () => {
  it('formata numero com separador de milhar', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});

describe('formatCurrency', () => {
  it('formata moeda em reais', () => {
    expect(formatCurrency(1500)).toBe('R$ 15,00');
  });
});

describe('formatDate', () => {
  it('formata data em portugues', () => {
    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toContain('2026');
  });
});

describe('formatRelativeDate', () => {
  it('retorna segundos para momento atual', () => {
    const result = formatRelativeDate(new Date());
    expect(result).toBe('agora');
  });
});

describe('initials', () => {
  it('retorna iniciais de nome completo', () => {
    expect(initials('Ana Silva')).toBe('AS');
  });

  it('retorna inicial unica para nome simples', () => {
    expect(initials('Ana')).toBe('AA');
  });

  it('retorna string vazia para nome vazio', () => {
    expect(initials('')).toBe('');
  });
});

describe('serializeJsonLd', () => {
  it('escapa caracteres perigosos', () => {
    const result = serializeJsonLd({ text: '</script><alert>' });
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c');
  });
});

describe('slugify', () => {
  it('converte texto para slug', () => {
    expect(slugify('Editoria de Tecnologia')).toBe('editoria-de-tecnologia');
  });

  it('remove acentos', () => {
    expect(slugify('Ção')).toBe('cao');
  });

  it('retorna editoria para string vazia', () => {
    expect(slugify('')).toBe('editoria');
  });
});

describe('buildStableEditoriaIdMap', () => {
  it('cria map com ids determinísticos', () => {
    const result = buildStableEditoriaIdMap(['Tecnologia', 'Casa']);
    expect(result.get('Tecnologia')).toBe('home-editoria-tecnologia');
    expect(result.get('Casa')).toBe('home-editoria-casa');
  });

  it('remove duplicatas', () => {
    const result = buildStableEditoriaIdMap(['Tecnologia', 'Tecnologia']);
    expect(result.size).toBe(1);
  });

  it('ordena alfabeticamente', () => {
    const result = buildStableEditoriaIdMap(['Zoo', 'Abc']);
    const keys = Array.from(result.keys());
    expect(keys).toEqual(['Abc', 'Zoo']);
  });
});
