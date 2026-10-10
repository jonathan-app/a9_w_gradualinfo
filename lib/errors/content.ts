/**
 * @fileoverview Erro tipado para indisponibilidade da fonte de conteúdo editorial.
 * @module lib/errors/content
 * @description Define a classe de erro utilizada quando o Sanity (ou base de dados)
 *   está inacessível, fora do ar ou com timeout, permitindo que a camada de proxy
 *   e a renderização tratem a falha de infraestrutura de forma padronizada.
 * @dependencies nenhuma.
 */

/**
 * Erro de infraestrutura da fonte de conteúdo (Sanity ou Supabase).
 *
 * Distinto de erros de autorização ou armazenamento de sessão, permitindo
 * que o proxy devolva 503 real e a Home renderize o bloco honesto de indisponibilidade.
 */
export class ContentUnavailableError extends Error {
  /**
   * Inicializa o erro com mensagem padrão sem vazar detalhes internos ao cliente.
   */
  constructor(message = 'Fonte de conteúdo indisponível.') {
    super(message);
    this.name = 'ContentUnavailableError';
  }
}
