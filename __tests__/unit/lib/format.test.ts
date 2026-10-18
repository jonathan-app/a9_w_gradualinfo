/**
 * @fileoverview Suíte das funções de formatação e de serialização de `lib/utils/format`.
 * @module __tests__/unit/lib/format
 * @description Fixa o que o usuário vê — separador por locale, escala de centavos, fuso de São
 *   Paulo na virada da data UTC e iniciais — e a fronteira de segurança do JSON-LD: escape de
 *   `</script>` é o que impede que um título hostil feche a tag e execute no leitor.
 * @dependencies vitest, @/lib/utils/format.
 *
 * As funções são puras e recebem locale por parâmetro justamente para poderem ser testadas
 * sem mock de módulo. O teste fixa o comportamento que o usuário vê — inclusive quando a
 * entrada é inesperada.
 */
import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDate,
  initials,
  serializeJsonLd,
  slugify,
  buildStableEditoriaIdMap,
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

// O JSON-LD é emitido como texto dentro de uma tag <script>: sem escape, um conteúdo com
// `</script>` fecha a tag na hora e o resto do payload vira script executável no leitor.
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

describe('formatRelativeDate', () => {
  it('formata segundos relativos recentes', () => {
    const now = Date.now();
    expect(formatRelativeDate(now)).toBe('agora');
    expect(formatRelativeDate(now - 10000)).toBe('há 10 segundos');
  });

  it('formata minutos relativos', () => {
    const now = Date.now();
    expect(formatRelativeDate(now - 5 * 60 * 1000)).toBe('há 5 minutos');
    expect(formatRelativeDate(now + 15 * 60 * 1000)).toBe('em 15 minutos');
  });

  it('formata horas relativas', () => {
    const now = Date.now();
    expect(formatRelativeDate(now - 2 * 60 * 60 * 1000)).toBe('há 2 horas');
  });

  it('formata dias relativos', () => {
    const now = Date.now();
    expect(formatRelativeDate(now - 24 * 60 * 60 * 1000)).toBe('ontem');
    expect(formatRelativeDate(now - 3 * 24 * 60 * 60 * 1000)).toBe('há 3 dias');
    expect(formatRelativeDate(now + 48 * 60 * 60 * 1000)).toBe(
      'depois de amanhã',
    );
  });

  it('formata semanas, meses e anos relativos', () => {
    const now = Date.now();
    expect(formatRelativeDate(now - 14 * 24 * 60 * 60 * 1000)).toBe(
      'há 2 semanas',
    );
    expect(formatRelativeDate(now - 60 * 24 * 60 * 60 * 1000)).toBe(
      'há 2 meses',
    );
    expect(formatRelativeDate(now - 400 * 24 * 60 * 60 * 1000)).toBe(
      'ano passado',
    );
  });

  it('suporta locale customizado como en-US', () => {
    const now = Date.now();
    expect(formatRelativeDate(now - 10 * 60 * 1000, { locale: 'en-US' })).toBe(
      '10 minutes ago',
    );
  });
});

describe('slugify', () => {
  it('remove acentos, converte maiúsculas e troca espaços por traços', () => {
    expect(slugify('Inteligência Artificial')).toBe('inteligencia-artificial');
    expect(slugify('Performance & SEO')).toBe('performance-seo');
    expect(slugify('Segurança da Informação')).toBe('seguranca-da-informacao');
  });

  it('lida com símbolos e texto vazio com fallback seguro', () => {
    expect(slugify('')).toBe('editoria');
    expect(slugify('   ---   ')).toBe('editoria');
    expect(slugify('C++')).toBe('c');
  });
});

describe('buildStableEditoriaIdMap', () => {
  it('gera identificadores estáveis com prefixo home-editoria-', () => {
    const map = buildStableEditoriaIdMap(['Tecnologia', 'Ciência']);
    expect(map.get('Tecnologia')).toBe('home-editoria-tecnologia');
    expect(map.get('Ciência')).toBe('home-editoria-ciencia');
  });

  it('é imune à ordem das editorias passadas', () => {
    const map1 = buildStableEditoriaIdMap(['Segurança', 'IA', 'Performance']);
    const map2 = buildStableEditoriaIdMap(['Performance', 'Segurança', 'IA']);

    expect(map1.get('Segurança')).toBe(map2.get('Segurança'));
    expect(map1.get('IA')).toBe(map2.get('IA'));
    expect(map1.get('Performance')).toBe(map2.get('Performance'));
  });

  it('resolve colisões de slug de forma estável e determinística', () => {
    // "Tech!" e "Tech?" colidem gerando mesmo slug base
    const map = buildStableEditoriaIdMap(['Tech!', 'Tech?']);
    const idExclamacao = map.get('Tech!');
    const idInterrogacao = map.get('Tech?');

    expect(idExclamacao).toMatch(/^home-editoria-tech-/);
    expect(idInterrogacao).toMatch(/^home-editoria-tech-/);
    expect(idExclamacao).not.toBe(idInterrogacao);

    // Ordem invertida na entrada não pode alterar a atribuição
    const mapInvertido = buildStableEditoriaIdMap(['Tech?', 'Tech!']);
    expect(mapInvertido.get('Tech!')).toBe(idExclamacao);
    expect(mapInvertido.get('Tech?')).toBe(idInterrogacao);
  });

  it('preserva os IDs de editorias existentes quando uma nova editoria é adicionada', () => {
    const original = buildStableEditoriaIdMap(['Dev', 'Design']);
    const expandido = buildStableEditoriaIdMap(['Dev', 'Design', 'Produto']);

    expect(expandido.get('Dev')).toBe(original.get('Dev'));
    expect(expandido.get('Design')).toBe(original.get('Design'));
    expect(expandido.get('Produto')).toBe('home-editoria-produto');
  });

  it('garante estabilidade dos IDs existentes sob inserção de nova editoria com slug colidente', () => {
    // "Tech B" e "Tech B?" colidem no slug "tech-b"
    const inicial = buildStableEditoriaIdMap(['Tech B', 'Tech B?']);
    const idTechB = inicial.get('Tech B');
    const idTechBInterrogacao = inicial.get('Tech B?');

    // Inserindo "Tech B!" que colide no mesmo slug e antecede "Tech B?" em pt-BR
    const expandido = buildStableEditoriaIdMap([
      'Tech B',
      'Tech B!',
      'Tech B?',
    ]);

    // Estabilidade estrita: nenhum ID preexistente pode sofrer alteração ou deslocamento
    expect(expandido.get('Tech B')).toBe(idTechB);
    expect(expandido.get('Tech B?')).toBe(idTechBInterrogacao);
    expect(expandido.get('Tech B!')).toBeDefined();
    expect(expandido.get('Tech B!')).not.toBe(idTechB);
    expect(expandido.get('Tech B!')).not.toBe(idTechBInterrogacao);
  });

  it('preserva ID original ao adicionar variante colidente a editoria única', () => {
    // Editoria única sem colisão inicial
    const original = buildStableEditoriaIdMap(['Tech']);
    const idTech = original.get('Tech');

    // Adiciona variante que colide no mesmo slug base
    const comVariante = buildStableEditoriaIdMap(['Tech', 'Tech?']);

    // ID original deve permanecer igual
    expect(comVariante.get('Tech')).toBe(idTech);
    expect(comVariante.get('Tech')).toBe('home-editoria-tech');

    // Variante deve receber ID único com sufixo
    expect(comVariante.get('Tech?')).toBeDefined();
    expect(comVariante.get('Tech?')).not.toBe(idTech);
    expect(comVariante.get('Tech?')).toMatch(/^home-editoria-tech-/);

    // Ordem invertida na entrada não altera atribuição
    const ordemInvertida = buildStableEditoriaIdMap(['Tech?', 'Tech']);
    expect(ordemInvertida.get('Tech')).toBe(idTech);
    expect(ordemInvertida.get('Tech?')).toBe(comVariante.get('Tech?'));
  });

  it('preserva ID ao adicionar variante quando editoria estava sozinha', () => {
    const first = buildStableEditoriaIdMap(['Segurança']);
    const idOriginal = first.get('Segurança');
    const second = buildStableEditoriaIdMap([
      'Segurança',
      'Segurança da Informação',
    ]);
    expect(second.get('Segurança')).toBe(idOriginal);
    expect(second.get('Segurança da Informação')).toBeDefined();
    expect(second.get('Segurança da Informação')).not.toBe(idOriginal);
  });

  it('preserva ID ao adicionar variante quando editoria estava sozinha', () => {
    const first = buildStableEditoriaIdMap(['Segurança']);
    const idOriginal = first.get('Segurança');
    const second = buildStableEditoriaIdMap([
      'Segurança',
      'Segurança da Informação',
    ]);
    expect(second.get('Segurança')).toBe(idOriginal);
    expect(second.get('Segurança da Informação')).toBeDefined();
    expect(second.get('Segurança da Informação')).not.toBe(idOriginal);
  });
});
