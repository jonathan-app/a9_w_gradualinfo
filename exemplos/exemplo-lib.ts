/**
 * @fileoverview exemplos/exemplo-lib.ts — funções puras com JSDoc de contrato.
 *
 * Por que este arquivo existe: mostra o nível de documentação esperado para
 * funções exportadas com contrato não-trivial. Funções triviais (getter de
 * uma linha) NÃO precisam disto.
 */

/**
 * Calcula o tempo de leitura estimado de um texto em minutos.
 * Base: 200 palavras/min (média pt-BR). Cada imagem adiciona 12s.
 *
 * @param texto - Conteúdo em string. Vazio/null levanta erro (contrato).
 * @param imagens - Quantidade de imagens (padrão 0).
 * @returns Número inteiro de minutos, mínimo 1.
 * @throws {Error} Se texto for vazio ou nulo.
 *
 * @example
 * tempoDeLeitura('400 palavras', 2) // 3 (2 min de texto + 1 min de imagens)
 */
export function tempoDeLeitura(texto: string, imagens = 0): number {
  if (!texto || texto.trim().length === 0) {
    throw new Error('tempoDeLeitura: texto não pode ser vazio');
  }
  const palavras = texto.split(/\s+/).length;
  const minutos = Math.ceil(palavras / 200);
  const minutosImagens = Math.ceil((imagens * 12) / 60);
  return Math.max(1, minutos + minutosImagens);
}

/**
 * Formata bytes em formato humano (B/KB/MB/GB).
 * Estratégia: divisão sucessiva por 1024 até < 1024; usa 1 casa decimal.
 * Não arredonda para cima — arredondar 1023 bytes para "1 KB" mente sobre o tamanho.
 *
 * @param bytes - Número de bytes. Negativo é tratado como 0.
 * @returns String formatada, ex.: "1.5 MB".
 *
 * @example
 * formatarBytes(1536) // "1.5 KB"
 */
export function formatarBytes(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let valor = Math.max(0, bytes);
  let indice = 0;
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }
  return `${valor.toFixed(1).replace('.0', '')} ${unidades[indice]}`;
}
