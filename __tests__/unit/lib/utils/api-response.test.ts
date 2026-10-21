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

  it('suprime details arbitrários, objetos Error e stack traces em respostas 5xx (fail-closed)', async () => {
    const rawError = new Error(
      'relation "admin_user_roles" does not exist\n    at Object.query (/app/lib/db.ts:42:11)',
    );
    const res500 = apiErrorResponse(500, 'internal_error', rawError.message, {
      stack: rawError.stack,
      sql: 'SELECT * FROM admin_user_roles',
      table: 'admin_user_roles',
      unexpectedField: 'internal_state',
    });

    expect(res500.status).toBe(500);
    expect(res500.headers.get('cache-control')).toBe('private, no-store');
    const json500 = await res500.json();
    expect(json500).toEqual({
      error: 'internal_error',
      message: 'Erro interno no servidor.',
    });
    expect(json500.details).toBeUndefined();
    expect(JSON.stringify(json500)).not.toContain('admin_user_roles');
    expect(JSON.stringify(json500)).not.toContain('/app/lib/db.ts');
  });

  it('preserva mensagens humanas seguras em respostas 5xx sem vazar details', async () => {
    const res503 = apiErrorResponse(
      503,
      'storage_unavailable',
      'Storage de evidências temporariamente indisponível.',
      { internalBucket: 'gradualinfo-worm-prod', cause: new Error('timeout') },
    );

    expect(res503.status).toBe(503);
    const json503 = await res503.json();
    expect(json503).toEqual({
      error: 'storage_unavailable',
      message: 'Storage de evidências temporariamente indisponível.',
    });
    expect(json503.details).toBeUndefined();
  });

  it('bloqueia instâncias de Error ou objetos com chaves internas (stack, sql, secret) mesmo em 4xx', async () => {
    const resErrInstance = apiErrorResponse(
      400,
      'bad_request',
      'Parâmetro inválido.',
      new Error('internal stack leak'),
    );
    const jsonErr = await resErrInstance.json();
    expect(jsonErr.details).toBeUndefined();

    const resUnsafeKey = apiErrorResponse(
      422,
      'validation_error',
      'Erro de validação.',
      { field: 'id', stack: 'Error: boom\n    at route.ts:10:5' },
    );
    const jsonUnsafe = await resUnsafeKey.json();
    expect(jsonUnsafe.details).toBeUndefined();
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

  it('mascara mensagens que vazam detalhes internos do banco de dados, stack traces ou tokens', async () => {
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

    const rlsLeak =
      'new row violates row-level security policy for table "admin_audit_log"';
    expect(sanitizeRpcErrorMessage(rlsLeak)).toBe(
      'Falha no processamento da transação.',
    );

    const stackLeak =
      'TypeError: Cannot read properties of undefined (reading "id")\n    at handleIngestOfertas (/app/route.ts:100:12)';
    expect(sanitizeRpcErrorMessage(stackLeak)).toBe(
      'Falha no processamento da transação.',
    );

    const tokenLeak =
      'Auth failed for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    expect(sanitizeRpcErrorMessage(tokenLeak)).toBe(
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
