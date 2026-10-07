import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  initials,
  serializeJsonLd,
} from '@/lib/utils/format';

/**
 * __tests__/unit/lib/format.test.ts
 *
 * Estas funções são puras e recebem locale por parâmetro justamente para
 * poderem ser testadas sem mock de módulo. O teste fixa o comportamento que o
 * usuário vê — inclusive quando a entrada é inesperada.
 */
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
  it('mantém o dia editorial de São Paulo na virada da data UTC', () => {
    const value = '2026-10-05T01:30:00.000Z';
    expect(
      formatDate(value, { locale: 'en-US', timeZone: 'America/Sao_Paulo' }),
    ).toBe('Oct 4, 2026');
    expect(formatDate(value, { locale: 'en-US', timeZone: 'UTC' })).toBe(
      'Oct 5, 2026',
    );
  });

  it('preserva o fuso do ambiente quando timeZone é omitido', () => {
    const value = new Date('2026-10-05T01:30:00.000Z');
    const expected = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
    }).format(value);
    expect(formatDate(value)).toBe(expected);
    expect(formatDate(value, { timeZone: undefined })).toBe(expected);
  });

  it('aplica o fuso explícito a Date, string e timestamp', () => {
    const iso = '2026-10-05T01:30:00.000Z';
    const date = new Date(iso);
    const options = { locale: 'en-US', timeZone: 'America/Sao_Paulo' };
    expect(formatDate(date, options)).toBe('Oct 4, 2026');
    expect(formatDate(iso, options)).toBe('Oct 4, 2026');
    expect(formatDate(date.getTime(), options)).toBe('Oct 4, 2026');
  });

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

describe('serializeJsonLd', () => {
  it('escapa caracteres críticos e tags de fechamento de script', () => {
    const payload = {
      title: '</script><script>alert("xss")</script>',
      bio: 'Guia <programador> & "estudante"',
    };
    const serialized = serializeJsonLd(payload);

    // Não deve conter a tag de fechamento literal </script> nem < ou > puros
    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u003cscript\\u003e');
    expect(serialized).toContain('\\u0026');

    // Ao fazer JSON.parse, o dado original deve ser recuperado com perfeição
    const parsed = JSON.parse(serialized);
    expect(parsed.title).toBe('</script><script>alert("xss")</script>');
    expect(parsed.bio).toBe('Guia <programador> & "estudante"');
  });

  it('escapa o payload de teste específico </script><script>alert(1)</script> mantendo JSON válido', () => {
    const payload = {
      headline: '</script><script>alert(1)</script>',
    };
    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toBe(
      '{"headline":"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e"}',
    );

    const parsed = JSON.parse(serialized);
    expect(parsed.headline).toBe('</script><script>alert(1)</script>');
  });
});
