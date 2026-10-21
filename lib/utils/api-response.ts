/**
 * @fileoverview Helper padronizado para respostas de erro em JSON nas rotas de API.
 * @module lib/utils/api-response
 * @description Padroniza o envelope de erro HTTP no formato { error, message, details? }
 *   com cabeçalhos apropriados e política fail-closed para respostas 5xx, evitando
 *   vazamento de mensagens de banco, stack traces, tokens, objetos Error ou details não tipados.
 * @dependencies next/server
 */

import { NextResponse } from 'next/server';

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: unknown;
}

const DEFAULT_5XX_FALLBACK_MESSAGE = 'Erro interno no servidor.';

const UNSAFE_DETAIL_KEYS = new Set([
  'stack',
  'cause',
  'sql',
  'sqlstate',
  'query',
  'parameters',
  'internalquery',
  'internalposition',
  'routine',
  'schema',
  'table',
  'column',
  'constraint',
  'detail',
  'hint',
  'file',
  'line',
  'token',
  'secret',
  'password',
  'authorization',
  'apikey',
  'service_role',
]);

const INTERNAL_LEAK_SUBSTRINGS = [
  'relation',
  'table',
  'constraint',
  'syntax error',
  'violates',
  'column',
  'schema',
  'database',
  'postgresql',
  'postgres://',
  'postgresql://',
  'select ',
  'insert ',
  'update ',
  'delete ',
  'foreign key',
  'unique constraint',
  'duplicate key',
  'null value in',
  'permission denied',
  'does not exist',
  'deadlock detected',
  'could not serialize',
  'statement timeout',
  'row-level security',
  'pgrst',
  'sqlstate',
  'econnrefused',
  'etimedout',
  'enotfound',
  'typeerror:',
  'referenceerror:',
  'rangeerror:',
  'syntaxerror:',
  'cannot read properties of',
  'is not a function',
  'bearer ',
  'sb_secret_',
  'service_role',
  'supabase_service_role_key',
  'offers_ingest_secret',
  'offers_webhook_secret',
  'preview_secret',
];

/**
 * Verifica se uma mensagem textual contém indícios de vazamento de banco de dados,
 * stack trace, erro de runtime ou segredos internos.
 *
 * @param rawMessage - Texto a inspecionar.
 * @returns `true` quando há padrão interno sensível que não deve ser exposto.
 */
function hasInternalErrorLeak(rawMessage: string): boolean {
  const lower = rawMessage.toLowerCase();
  if (
    /\n\s*at\s+/.test(rawMessage) ||
    /eyJ[A-Za-z0-9_-]{10,}\./.test(rawMessage)
  ) {
    return true;
  }
  return INTERNAL_LEAK_SUBSTRINGS.some((term) => lower.includes(term));
}

/**
 * Valida de forma fail-closed se um valor `details` é seguro para serialização em respostas 4xx.
 * Respostas 5xx nunca serializam `details`.
 *
 * @param value - Valor candidato a `details`.
 * @param depth - Profundidade atual de inspeção recursiva.
 * @returns `true` apenas para estruturas de dados seguras sem objetos Error, stack ou chaves internas.
 */
function isSafeClientDetailsValue(value: unknown, depth = 0): boolean {
  if (depth > 4 || value === null || value === undefined) {
    return false;
  }
  if (value instanceof Error) {
    return false;
  }
  const valueType = typeof value;
  if (valueType === 'boolean' || valueType === 'number') {
    return Number.isFinite(value as number) || valueType === 'boolean';
  }
  if (valueType === 'string') {
    return !hasInternalErrorLeak(value as string);
  }
  if (Array.isArray(value)) {
    return value.every((item) => isSafeClientDetailsValue(item, depth + 1));
  }
  if (valueType === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return false;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    for (const [key, entryValue] of entries) {
      if (UNSAFE_DETAIL_KEYS.has(key.toLowerCase())) {
        return false;
      }
      if (
        entryValue !== undefined &&
        entryValue !== null &&
        !isSafeClientDetailsValue(entryValue, depth + 1)
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Cria uma resposta HTTP padronizada de erro em formato JSON.
 * Para status 5xx (>= 500), aplica política fail-closed: suprime qualquer `details`
 * e sanitiza `message` contra vazamento de SQL, stack traces, exceções ou segredos.
 *
 * @param status - Código de status HTTP (ex: 400, 401, 403, 409, 413, 422, 500, 503).
 * @param error - Código ou identificador de máquina do erro (ex: 'payload_too_large', 'evaluation_failed').
 * @param message - Mensagem amigável legível por humanos.
 * @param details - Detalhes adicionais opcionais estruturados (permitidos apenas em status < 500 quando seguros).
 * @returns Instância de NextResponse configurada com status e payload sanitizado.
 */
export function apiErrorResponse(
  status: number,
  error: string,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorPayload> {
  const isServerError = status >= 500;
  const safeMessage = isServerError
    ? sanitizeRpcErrorMessage(message, DEFAULT_5XX_FALLBACK_MESSAGE)
    : message;

  const includeDetails =
    !isServerError &&
    details !== undefined &&
    isSafeClientDetailsValue(details);

  const payload: ApiErrorPayload = {
    error,
    message: safeMessage,
    ...(includeDetails ? { details } : {}),
  };

  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * Sanitiza mensagens de erro retornadas por RPC do banco de dados (PostgreSQL/Supabase)
 * ou exceções internas. Bloqueia termos de esquema, tabelas, restrições, stack traces
 * e segredos, retornando mensagem genérica segura para exibição ao cliente.
 *
 * @param rawMessage - Mensagem bruta vinda do driver do banco ou exceção.
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
  if (!trimmed || hasInternalErrorLeak(trimmed)) {
    return fallbackMessage;
  }

  return trimmed;
}
