/**
 * @fileoverview Helper padronizado para respostas de erro em JSON nas rotas de API.
 * @module lib/utils/api-response
 * @description Padroniza o envelope de erro HTTP no formato { error, message, details? }
 *   com cabeçalhos apropriados, evitando vazamento de dados internos e divergência de formato.
 * @dependencies next/server
 */

import { NextResponse } from 'next/server';

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Cria uma resposta HTTP padronizada de erro em formato JSON.
 *
 * @param status - Código de status HTTP (ex: 400, 401, 403, 409, 413, 422, 500, 503).
 * @param error - Código ou identificador de máquina do erro (ex: 'payload_too_large', 'evaluation_failed').
 * @param message - Mensagem amigável legível por humanos.
 * @param details - Detalhes adicionais opcionais (ex: campos de validação).
 * @returns Instância de NextResponse configurada com status e payload.
 */
export function apiErrorResponse(
  status: number,
  error: string,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorPayload> {
  const payload: ApiErrorPayload = {
    error,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * Sanitiza mensagens de erro retornadas por RPC do banco de dados (PostgreSQL/Supabase).
 * Bloqueia termos típicos de vazamento de esquema, nomes de tabelas ou restrições internas,
 * retornando mensagem genérica segura para exibição ao cliente.
 *
 * @param rawMessage - Mensagem bruta vinda do driver do banco.
 * @param fallbackMessage - Mensagem amigável de contingência.
 * @returns Mensagem sanitizada segura.
 */
export function sanitizeRpcErrorMessage(
  rawMessage: string | undefined | null,
  fallbackMessage = 'Falha no processamento da transação.',
): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return fallbackMessage;
  }

  const trimmed = rawMessage.trim();
  const lower = trimmed.toLowerCase();

  const hasSqlLeaks =
    lower.includes('relation') ||
    lower.includes('table') ||
    lower.includes('constraint') ||
    lower.includes('syntax error') ||
    lower.includes('violates') ||
    lower.includes('column') ||
    lower.includes('schema') ||
    lower.includes('database') ||
    lower.includes('postgresql') ||
    lower.includes('select ') ||
    lower.includes('insert ') ||
    lower.includes('update ') ||
    lower.includes('delete ') ||
    lower.includes('foreign key') ||
    lower.includes('unique constraint');

  if (hasSqlLeaks) {
    return fallbackMessage;
  }

  return trimmed;
}
