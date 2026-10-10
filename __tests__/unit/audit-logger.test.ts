/**
 * @fileoverview Contrato da trilha estruturada de auditoria.
 * @module __tests__/unit/audit-logger
 * @description Verifica JSON legível e continuidade da operação quando o destino falha.
 * @dependencies vitest, @/lib/audit.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audit } from '@/lib/audit';

afterEach(() => vi.restoreAllMocks());

describe('trilha de auditoria', () => {
  it('emite uma linha JSON com nível, origem e contexto do evento', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => {});
    audit({ type: 'preview_login', ok: true });
    expect(output).toHaveBeenCalledTimes(1);
    expect(JSON.parse(output.mock.calls[0]![0] as string)).toEqual({
      level: 'info',
      scope: 'audit',
      event: { type: 'preview_login', ok: true },
    });
  });

  it('preserva a operação quando o destino do log lança erro', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('Destino indisponível');
    });
    expect(() => audit({ type: 'preview_logout', ok: true })).not.toThrow();
  });
});
