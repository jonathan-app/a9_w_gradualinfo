/**
 * @fileoverview Testes unitários para audit-service.ts - funções puras
 * @module __tests__/unit/lib/admin/audit-service-pure
 * @description Testa sanitizeAuditMetadata e sanitizeClientIp.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  AdminRole: undefined,
}));

vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: vi.fn(() => null),
}));

import {
  sanitizeAuditMetadata,
  sanitizeClientIp,
} from '@/lib/admin/audit-service';

describe('sanitizeClientIp', () => {
  it('retorna null para entrada vazia ou nula', () => {
    expect(sanitizeClientIp(undefined)).toBeNull();
    expect(sanitizeClientIp(null)).toBeNull();
    expect(sanitizeClientIp('')).toBeNull();
    expect(sanitizeClientIp('   ')).toBeNull();
  });

  it('trunca IP a 45 caracteres', () => {
    const longIp = 'a'.repeat(50);
    const result = sanitizeClientIp(longIp);
    expect(result).toHaveLength(45);
  });

  it('retorna IP normalizado', () => {
    expect(sanitizeClientIp('  192.168.1.1  ')).toBe('192.168.1.1');
  });
});

describe('sanitizeAuditMetadata', () => {
  it('retorna objeto vazio para entrada invalida', () => {
    expect(sanitizeAuditMetadata(null)).toEqual({});
    expect(sanitizeAuditMetadata(undefined)).toEqual({});
    expect(sanitizeAuditMetadata('string')).toEqual({});
    expect(sanitizeAuditMetadata([1, 2, 3])).toEqual({});
  });

  it('mascara chaves sensiveis', () => {
    const result = sanitizeAuditMetadata({
      password: 'senha123',
      access_token: 'tok123',
      nome: 'João',
    });
    expect(result.password).toBe('[REDACTED]');
    expect(result.access_token).toBe('[REDACTED]');
    expect(result.nome).toBe('João');
  });

  it('limita profundidade a 3 niveis', () => {
    const result = sanitizeAuditMetadata({
      nivel1: { nivel2: { nivel3: { nivel4: { nivel5: 'muito fundo' } } } },
    });
    expect(result.nivel1.nivel2.nivel3.nivel4).toBe('[TRUNCATED_DEPTH]');
  });

  it('limita numero de chaves a 50', () => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < 60; i++) {
      obj[`chave${i}`] = `valor${i}`;
    }
    const result = sanitizeAuditMetadata(obj);
    expect(result._truncated).toBe('key_limit_reached');
  });

  it('serializa metadados validos', () => {
    const result = sanitizeAuditMetadata({
      chave: 'valor',
      numero: 42,
      booleano: true,
    });
    expect(result.chave).toBe('valor');
    expect(result.numero).toBe(42);
    expect(result.booleano).toBe(true);
  });
});
