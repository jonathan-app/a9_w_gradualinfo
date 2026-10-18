/**
 * @fileoverview Utilitário de correspondência aproximada com tolerância a digitação.
 * @module lib/utils/fuzzy-match
 * @description Implementa cálculo de distância Levenshtein Damerau com tolerância proporcional ao tamanho do termo.
 * @dependencies nenhuma (módulo TypeScript puro).
 */

/**
 * Calcula a distância de Levenshtein Damerau entre duas cadeias de caracteres.
 * Considera inserções, exclusões, substituições e transposições de caracteres adjacentes.
 *
 * @param a Primeira sequência de texto.
 * @param b Segunda sequência de texto.
 * @returns Quantidade mínima de edições para transformar a em b.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const d: number[][] = Array.from({ length: la + 1 }, () =>
    new Array<number>(lb + 1).fill(0),
  );

  for (let i = 0; i <= la; i++) d[i]![0] = i;
  for (let j = 0; j <= lb; j++) d[0]![j] = j;

  for (let i = 1; i <= la; i++) {
    const ca = a[i - 1]!;
    for (let j = 1; j <= lb; j++) {
      const cb = b[j - 1]!;
      const cost = ca === cb ? 0 : 1;
      let min = Math.min(
        d[i - 1]![j]! + 1, // exclusão
        d[i]![j - 1]! + 1, // inserção
        d[i - 1]![j - 1]! + cost, // substituição
      );

      // Transposição adjacente
      if (i > 1 && j > 1 && ca === b[j - 2] && a[i - 2] === cb) {
        min = Math.min(min, d[i - 2]![j - 2]! + 1);
      }

      d[i]![j] = min;
    }
  }

  return d[la]![lb]!;
}

/**
 * Retorna a distância máxima de edição tolerada com base no tamanho do termo pesquisado.
 * Conforme busca/AC-03:
 * - Até 4 caracteres: 0 (exige correspondência estrita ou prefixo)
 * - De 5 a 8 caracteres: 1 edição
 * - Acima de 8 caracteres: 2 edições
 *
 * @param length Extensão do termo pesquisado.
 * @returns Número máximo de edições permitidas.
 */
export function maxAllowedDistance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

/**
 * Extrai palavras únicas normalizadas de um texto.
 *
 * @param normalizedText Texto já normalizado em minúsculas e sem diacríticos.
 * @returns Vetor de palavras únicas contendo apenas caracteres alfanuméricos.
 */
export function extractUniqueWords(normalizedText: string): string[] {
  const matches = normalizedText.match(/[a-z0-9]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export interface MatchEvaluation {
  matched: boolean;
  exact: boolean;
}

/**
 * Avalia se um termo de busca corresponde a uma palavra alvo com ou sem tolerância a erro de digitação.
 *
 * @param word Palavra existente no documento.
 * @param term Termo pesquisado pelo leitor.
 * @returns Resultado indicando se houve correspondência e se foi exata ou aproximada.
 */
export function matchTermInWord(word: string, term: string): MatchEvaluation {
  if (word === term || word.startsWith(term)) {
    return { matched: true, exact: true };
  }

  const maxDist = maxAllowedDistance(term.length);
  if (maxDist === 0) {
    return { matched: false, exact: false };
  }

  if (Math.abs(word.length - term.length) > maxDist) {
    return { matched: false, exact: false };
  }

  const dist = damerauLevenshtein(word, term);
  if (dist <= maxDist) {
    return { matched: true, exact: false };
  }

  return { matched: false, exact: false };
}

/**
 * Avalia a correspondência de um termo contra uma coleção de palavras de um campo.
 *
 * @param words Lista de palavras do campo.
 * @param term Termo procurado.
 * @returns Avaliação com prioridade para exato caso alguma palavra coincida exatamente.
 */
export function matchTermInWordList(
  words: string[],
  term: string,
): MatchEvaluation {
  let matchedApprox = false;

  for (const word of words) {
    const res = matchTermInWord(word, term);
    if (res.matched) {
      if (res.exact) return { matched: true, exact: true };
      matchedApprox = true;
    }
  }

  return { matched: matchedApprox, exact: false };
}
