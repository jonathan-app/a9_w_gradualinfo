/**
 * @fileoverview Testes unitários para fuzzy-match.ts
 * @module __tests__/unit/lib/utils/fuzzy-match
 * @description Testa damerauLevenshtein, maxAllowedDistance, extractUniqueWords,
 *   matchTermInWord e matchTermInWordList.
 */

import { describe, expect, it } from 'vitest';

import {
  damerauLevenshtein,
  extractUniqueWords,
  matchTermInWord,
  matchTermInWordList,
  maxAllowedDistance,
} from '@/lib/utils/fuzzy-match';

describe('damerauLevenshtein', () => {
  it('retorna 0 para strings iguais', () => {
    expect(damerauLevenshtein('', '')).toBe(0);
    expect(damerauLevenshtein('abc', 'abc')).toBe(0);
  });

  it('retorna comprimento quando uma string esta vazia', () => {
    expect(damerauLevenshtein('', 'abc')).toBe(3);
    expect(damerauLevenshtein('abc', '')).toBe(3);
  });

  it('calcula distancia de substituicao', () => {
    expect(damerauLevenshtein('gato', 'cato')).toBe(1);
  });

  it('calcula distancia de insercao', () => {
    expect(damerauLevenshtein('ato', 'gato')).toBe(1);
  });

  it('calcula distancia de exclusao', () => {
    expect(damerauLevenshtein('gato', 'ato')).toBe(1);
  });

  it('calcula transposicao adjacente', () => {
    expect(damerauLevenshtein('ab', 'ba')).toBe(1);
  });
});

describe('maxAllowedDistance', () => {
  it('retorna 0 para ate 4 caracteres', () => {
    expect(maxAllowedDistance(1)).toBe(0);
    expect(maxAllowedDistance(4)).toBe(0);
  });

  it('retorna 1 para 5 a 8 caracteres', () => {
    expect(maxAllowedDistance(5)).toBe(1);
    expect(maxAllowedDistance(8)).toBe(1);
  });

  it('retorna 2 para acima de 8 caracteres', () => {
    expect(maxAllowedDistance(9)).toBe(2);
    expect(maxAllowedDistance(20)).toBe(2);
  });
});

describe('extractUniqueWords', () => {
  it('retorna array vazio para texto sem palavras', () => {
    expect(extractUniqueWords('!!!')).toEqual([]);
  });

  it('extrai palavras unicas', () => {
    expect(extractUniqueWords('casa carro casa')).toEqual(['casa', 'carro']);
  });

  it('ignora caracteres nao alfanumericos', () => {
    expect(extractUniqueWords('casa, carro! moto.')).toEqual([
      'casa',
      'carro',
      'moto',
    ]);
  });
});

describe('matchTermInWord', () => {
  it('retorna exato para palavra igual', () => {
    expect(matchTermInWord('casa', 'casa')).toEqual({
      matched: true,
      exact: true,
    });
  });

  it('retorna exato para prefixo', () => {
    expect(matchTermInWord('casamento', 'casa')).toEqual({
      matched: true,
      exact: true,
    });
  });

  it('retorna aproximado para distancia dentro do limite', () => {
    expect(matchTermInWord('casas', 'casas')).toEqual({
      matched: true,
      exact: true,
    });
    expect(matchTermInWord('casa', 'casas')).toEqual({
      matched: true,
      exact: false,
    });
  });

  it('retorna nao correspondido para termo curto sem prefixo', () => {
    expect(matchTermInWord('xyz', 'casas')).toEqual({
      matched: false,
      exact: false,
    });
  });
});

describe('matchTermInWordList', () => {
  it('retorna exato quando alguma palavra coincide exatamente', () => {
    expect(matchTermInWordList(['casa', 'carro'], 'casa')).toEqual({
      matched: true,
      exact: true,
    });
  });

  it('retorna aproximado quando nenhuma e exata mas alguma esta proxima', () => {
    expect(matchTermInWordList(['casa', 'carro'], 'casas')).toEqual({
      matched: true,
      exact: false,
    });
  });

  it('retorna nao correspondido quando nenhuma palavra corresponde', () => {
    expect(matchTermInWordList(['xyz', 'abc'], 'casa')).toEqual({
      matched: false,
      exact: false,
    });
  });

  it('retorna array vazio para lista vazia', () => {
    expect(matchTermInWordList([], 'casa')).toEqual({
      matched: false,
      exact: false,
    });
  });
});
