/**
 * @fileoverview Testes unitários para apiErrorResponse em lib/utils/api-response.ts
 * @module __tests__/unit/lib/utils/api-response.test
 */

import { describe, it, expect } from 'vitest';
import { apiErrorResponse } from '@/lib/utils/api-response';

describe('apiErrorResponse', () => {
  it('gera resposta JSON com status e payload corretos', async () => {
    const res = apiErrorResponse(400, 'bad_request', 'Parâmetro inválido.');
    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('private, no-store');

    const json = await res.json();
    expect(json).toEqual({
      error: 'bad_request',
      message: 'Parâmetro inválido.',
    });
  });

  it('inclui detalhes opcionais quando fornecidos', async () => {
    const details = [{ field: 'email', reason: 'invalid_format' }];
    const res = apiErrorResponse(
      422,
      'validation_error',
      'Erro de validação.',
      details,
    );
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json).toEqual({
      error: 'validation_error',
      message: 'Erro de validação.',
      details,
    });
  });
});

describe('sanitizeRpcErrorMessage', () => {
  it('preserva mensagens legítimas de negócio sem termos SQL', async () => {
    const { sanitizeRpcErrorMessage } =
      await import('@/lib/utils/api-response');
    expect(sanitizeRpcErrorMessage('coupon_scope_mismatch')).toBe(
      'coupon_scope_mismatch',
    );
    expect(
      sanitizeRpcErrorMessage('operation_key_payload_conflict: operation op-1'),
    ).toBe('operation_key_payload_conflict: operation op-1');
  });

  it('mascara mensagens que vazam detalhes internos do banco de dados', async () => {
    const { sanitizeRpcErrorMessage } =
      await import('@/lib/utils/api-response');
    const leakedMessage =
      'duplicate key value violates unique constraint "offers_pkey" on table "offers"';
    expect(sanitizeRpcErrorMessage(leakedMessage)).toBe(
      'Falha no processamento da transação.',
    );

    const syntaxLeak = 'syntax error at or near "SELECT"';
    expect(sanitizeRpcErrorMessage(syntaxLeak)).toBe(
      'Falha no processamento da transação.',
    );
  });

  it('retorna fallback quando mensagem for nula, vazia ou indefinida', async () => {
    const { sanitizeRpcErrorMessage } =
      await import('@/lib/utils/api-response');
    expect(sanitizeRpcErrorMessage(null)).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('')).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage(undefined, 'Erro customizado')).toBe(
      'Erro customizado',
    );
  });
});
