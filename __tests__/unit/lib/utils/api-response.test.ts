/**
 * @fileoverview Testes unitários para api-response.ts
 * @module __tests__/unit/lib/utils/api-response
 * @description Testa apiErrorResponse, sanitizeRpcErrorMessage e sanitização de mensagens de erro.
 */

import { describe, expect, it } from 'vitest';

import {
  apiErrorResponse,
  sanitizeRpcErrorMessage,
} from '@/lib/utils/api-response';

describe('sanitizeRpcErrorMessage', () => {
  it('retorna mensagem de fallback quando entrada é nula ou indefinida', () => {
    expect(sanitizeRpcErrorMessage(null)).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage(undefined)).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('', 'fallback')).toBe('fallback');
    expect(sanitizeRpcErrorMessage('   ', 'fallback')).toBe('fallback');
  });

  it('retorna mensagem bruta quando não contém padrões internos sensíveis', () => {
    expect(sanitizeRpcErrorMessage('mensagem de erro simples')).toBe(
      'mensagem de erro simples',
    );
  });

  it('retorna mensagem de fallback quando contém stack trace', () => {
    expect(
      sanitizeRpcErrorMessage('Erro\n  at Function.code (file.js:10:5)'),
    ).toBe('Falha no processamento da transação.');
  });

  it('retorna mensagem de fallback quando contém JWT', () => {
    expect(sanitizeRpcErrorMessage('token eyJhbGciOiJIUzI1NiJ9.abc.def')).toBe(
      'Falha no processamento da transação.',
    );
  });

  it('retorna mensagem de fallback quando contém termos de banco de dados', () => {
    expect(sanitizeRpcErrorMessage('relation "users" does not exist')).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('syntax error at or near "SELECT"')).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('permission denied for table')).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('cannot read properties of undefined')).toBe(
      'Falha no processamento da transação.',
    );
  });

  it('retorna mensagem de fallback quando contém segredos', () => {
    expect(sanitizeRpcErrorMessage('sb_secret_123456')).toBe(
      'Falha no processamento da transação.',
    );
    expect(sanitizeRpcErrorMessage('Bearer token123')).toBe(
      'Falha no processamento da transação.',
    );
  });
});

describe('apiErrorResponse', () => {
  it('retorna resposta com status 400 e payload de erro', () => {
    const res = apiErrorResponse(
      400,
      'invalid_parameter',
      'Parâmetro inválido.',
    );
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = res.json() as Promise<{ error: string; message: string }>;
    return body.then((payload) => {
      expect(payload.error).toBe('invalid_parameter');
      expect(payload.message).toBe('Parâmetro inválido.');
    });
  });

  it('suprime details em resposta 5xx (fail-closed)', () => {
    const res = apiErrorResponse(500, 'internal_error', 'Erro interno.', {
      stack: 'trace',
    });
    expect(res.status).toBe(500);
    return res.json().then((payload) => {
      expect(payload.details).toBeUndefined();
      expect(payload.message).not.toContain('trace');
    });
  });

  it('inclui details em resposta 4xx quando são seguros', () => {
    const res = apiErrorResponse(400, 'validation_error', 'Campo inválido.', {
      campo: 'email',
    });
    expect(res.status).toBe(400);
    return res.json().then((payload) => {
      expect(payload.details).toEqual({ campo: 'email' });
    });
  });

  it('sanitiza mensagem de erro 5xx contra vazamento de SQL', () => {
    const res = apiErrorResponse(
      503,
      'unavailable',
      'relation "users" does not exist',
    );
    expect(res.status).toBe(503);
    return res.json().then((payload) => {
      expect(payload.message).toBe('Erro interno no servidor.');
    });
  });
});
