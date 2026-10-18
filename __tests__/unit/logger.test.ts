/**
 * @fileoverview Testes unitários do logger estruturado.
 * @module __tests__/unit/logger
 * @description Verifica saída JSON com nível e escopo, e ausência de exceção quando o
 *   destino do log falha.
 * @dependencies vitest, lib/logger.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';

afterEach(() => vi.restoreAllMocks());

describe('logger estruturado', () => {
  it('emite linha JSON com nível, escopo e evento', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test-scope', { action: 'test', detail: 'value' });

    expect(output).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(output.mock.calls[0]![0] as string);
    expect(parsed.level).toBe('info');
    expect(parsed.scope).toBe('test-scope');
    expect(parsed.event).toEqual({ action: 'test', detail: 'value' });
  });

  it('não lança exceção quando console.info falha', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('Console indisponível');
    });
    expect(() => logger.info('scope', { key: 'value' })).not.toThrow();
  });

  it('serializa objetos aninhados no evento', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('nested', { user: { id: '123', roles: ['admin'] } });

    const parsed = JSON.parse(output.mock.calls[0]![0] as string);
    expect(parsed.event.user.id).toBe('123');
    expect(parsed.event.user.roles).toEqual(['admin']);
  });
});
