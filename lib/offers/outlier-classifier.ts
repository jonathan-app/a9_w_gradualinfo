/**
 * @fileoverview Classificador determinístico de anomalias de preço (outliers) da Spec 0017.
 * @module lib/offers/outlier-classifier
 * @description Implementa as regras comerciais da Regra 3 da Spec 0017 para detecção
 * de quedas desproporcionais e salvaguarda absoluta de produtos de baixo valor.
 * @dependencies Nenhuma (funções puras).
 */

/**
 * Parâmetros de entrada para avaliação de anomalia estatística de preço.
 */
export interface OutlierClassificationInput {
  /** Mediana histórica dos 30 dias prévios na mesma tríade (em centavos), ou null se < 5 dias distintos. */
  medianCents: number | null;
  /** Preço anunciado ou observado da oferta/coleta (em centavos). */
  priceCents: number;
}

/**
 * Resultado detalhado da classificação de anomalia.
 */
export interface OutlierClassificationResult {
  /** Flag booleana indicando se a observação é anômala e deve ser excluída da mediana. */
  isAnomalous: boolean;
  /** Valor absoluto da queda em relação à mediana prévia (em centavos). */
  dropCents: number;
  /** Razão relativa da queda em relação à mediana prévia (0.0 a 1.0). */
  relativeDropRatio: number;
  /** Motivo da decisão de classificação para auditoria e transparência. */
  reason:
    | 'insufficient_history'
    | 'price_above_or_equal_median'
    | 'low_value_safeguard'
    | 'relative_drop_exceeded'
    | 'normal_discount';
}

/**
 * Classifica deterministicamente se uma observação de preço é anômala conforme a Spec 0017 Regra 3.
 *
 * Regras aplicadas:
 * 1. Sem histórico consolidado (< 5 amostras diárias UTC): não classifica como anômalo.
 * 2. Preço >= mediana prévia: não é anomalia de queda.
 * 3. Itens de baixo valor (mediana prévia < R$ 50,00 / 5000 centavos):
 *    Exige cumulativamente queda relativa > 50% E desvio absoluto > R$ 25,00 (2500 centavos).
 * 4. Itens normais (mediana prévia >= R$ 50,00):
 *    Corte estrito para queda relativa > 50% (exatamente 50% é lícito e tolerado).
 *
 * @param input Dados da mediana prévia e preço anunciado em centavos
 * @returns Objeto com o diagnóstico e justificativa da classificação
 */
export function classifyPriceObservation(
  input: OutlierClassificationInput,
): OutlierClassificationResult {
  const { medianCents, priceCents } = input;

  // 1. Histórico insuficiente para determinação estatística
  if (medianCents === null || medianCents <= 0) {
    return {
      isAnomalous: false,
      dropCents: 0,
      relativeDropRatio: 0,
      reason: 'insufficient_history',
    };
  }

  // 2. Preço igual ou superior à mediana não caracteriza anomalia de queda
  if (priceCents >= medianCents) {
    return {
      isAnomalous: false,
      dropCents: 0,
      relativeDropRatio: 0,
      reason: 'price_above_or_equal_median',
    };
  }

  const dropCents = medianCents - priceCents;
  const relativeDropRatio = dropCents / medianCents;

  // 3. Salvaguarda de produtos de baixo valor (mediana < R$ 50,00 / 5000 centavos)
  //    Condição dupla e cumulativa: desvio relativo > 50% E desvio absoluto > R$ 25,00 (2500 centavos)
  if (medianCents < 5000) {
    const exceedsRelative = dropCents * 2 > medianCents; // Queda > 50%
    const exceedsAbsolute = dropCents > 2500; // Queda > R$ 25,00

    if (exceedsRelative && exceedsAbsolute) {
      return {
        isAnomalous: true,
        dropCents,
        relativeDropRatio,
        reason: 'relative_drop_exceeded',
      };
    }

    return {
      isAnomalous: false,
      dropCents,
      relativeDropRatio,
      reason: 'low_value_safeguard',
    };
  }

  // 4. Produtos de valor normal (mediana >= R$ 50,00)
  //    Corte estrito para desvio relativo superior a 50% (50% exato não é anômalo)
  if (dropCents * 2 > medianCents) {
    return {
      isAnomalous: true,
      dropCents,
      relativeDropRatio,
      reason: 'relative_drop_exceeded',
    };
  }

  return {
    isAnomalous: false,
    dropCents,
    relativeDropRatio,
    reason: 'normal_discount',
  };
}
