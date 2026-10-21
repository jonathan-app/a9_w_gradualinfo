/**
 * @fileoverview Testes unitários para durable-object.ts (store em memória)
 * @module __tests__/unit/lib/preview/durable-object-memory
 * @description Testa InMemoryPreviewSessionStore: criação, validação, revogação e falha simulada.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { InMemoryPreviewSessionStore } from '@/lib/preview/durable-object';

describe('InMemoryPreviewSessionStore', () => {
  let store: InMemoryPreviewSessionStore;

  beforeEach(() => {
    store = new InMemoryPreviewSessionStore();
  });

  it('cria sessão e valida como ativa', async () => {
    const now = Math.floor(Date.now() / 1000);
    await store.createSession({
      session_id: 'sess-1',
      issued_at: now,
      expires_at: now + 1800,
    });
    const result = await store.validateSession('sess-1');
    expect(result.valid).toBe(true);
    expect(result.revoked).toBe(false);
    expect(result.expired).toBe(false);
  });

  it('retorna sessão inexistente como inválida', async () => {
    const result = await store.validateSession('sess-inexistente');
    expect(result.valid).toBe(false);
    expect(result.revoked).toBe(false);
    expect(result.expired).toBe(false);
  });

  it('detecta sessão expirada', async () => {
    const now = Math.floor(Date.now() / 1000);
    await store.createSession({
      session_id: 'sess-2',
      issued_at: now - 3600,
      expires_at: now - 100,
    });
    const result = await store.validateSession('sess-2', now * 1000);
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('revoga sessão ativa', async () => {
    const now = Math.floor(Date.now() / 1000);
    await store.createSession({
      session_id: 'sess-3',
      issued_at: now,
      expires_at: now + 1800,
    });
    const revoked = await store.revokeSession('sess-3');
    expect(revoked).toBe(true);
    const result = await store.validateSession('sess-3');
    expect(result.valid).toBe(false);
    expect(result.revoked).toBe(true);
  });

  it('cria registro de revogação para sessão inexistente', async () => {
    const now = Math.floor(Date.now() / 1000);
    const revoked = await store.revokeSession('sess-4', now * 1000);
    expect(revoked).toBe(true);
    const result = await store.validateSession('sess-4');
    expect(result.revoked).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('lança erro em createSession quando simulateFailure está ativo', async () => {
    store.simulateFailure = true;
    await expect(
      store.createSession({
        session_id: 'sess-5',
        issued_at: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }),
    ).rejects.toThrow('Falha simulada de I/O no armazenamento de sessão.');
  });

  it('lança erro em validateSession quando simulateFailure está ativo', async () => {
    store.simulateFailure = true;
    await expect(store.validateSession('sess-6')).rejects.toThrow(
      'Falha simulada de conectividade com o armazenamento de sessão.',
    );
  });

  it('lança erro em revokeSession quando simulateFailure está ativo', async () => {
    store.simulateFailure = true;
    await expect(store.revokeSession('sess-7')).rejects.toThrow(
      'Falha simulada de I/O na revogação de sessão.',
    );
  });

  it('clear reseta o store e desativa simulateFailure', async () => {
    const now = Math.floor(Date.now() / 1000);
    await store.createSession({
      session_id: 'sess-8',
      issued_at: now,
      expires_at: now + 1800,
    });
    store.simulateFailure = true;
    store.clear();
    expect(store.simulateFailure).toBe(false);
    const result = await store.validateSession('sess-8');
    expect(result.valid).toBe(false);
  });
});
