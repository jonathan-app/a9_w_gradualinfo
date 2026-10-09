// @vitest-environment node
/**
 * @fileoverview __tests__/unit/admin-e2e-guard.test.ts — teste de blindagem do mock E2E em produção
 * @module __tests__/unit/admin-e2e-guard.test
 * @description Garante que o mecanismo de simulação `__e2e_session_role` presente em
 *   `lib/supabase/server.ts` NUNCA funcione quando `NODE_ENV === 'production'`.
 *   Qualquer requisição em deploy de produção deve ignorar o cookie categoricamente.
 * @dependencies vitest, lib/supabase/server, next/headers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockCookiesStore = {
  get: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: async () => mockCookiesStore,
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '11111111-1111-4111-8111-111111111111',
    adminEmail: 'admin@gradualinfo.dev',
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    },
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: null, nextLevel: null },
          error: null,
        }),
        listFactors: vi
          .fn()
          .mockResolvedValue({ data: { all: [] }, error: null }),
      },
    },
  })),
}));

describe('Blindagem de Segurança: Mock __e2e_session_role', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalE2eTest = process.env.E2E_TEST;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.E2E_TEST = originalE2eTest;
  });

  it('ignora categoricamente o cookie __e2e_session_role em produção SEM o opt-in E2E_TEST=1', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.E2E_TEST;
    mockCookiesStore.get.mockReturnValue({ value: 'admin_aal2' });

    const { createClient } = await import('@/lib/supabase/server');
    const client = await createClient();

    // Em produção, sem o opt-in explícito, o cliente retornado NÃO é o objeto
    // mockado com o adminUserId fixo — fail-closed sobre qualquer simulação.
    const userRes = await client.auth.getUser();
    expect(userRes.data.user).toBeNull();
  });

  it('ignora categoricamente o cookie __e2e_session_role em produção MESMO com E2E_TEST=1', async () => {
    process.env.NODE_ENV = 'production';
    process.env.E2E_TEST = '1';
    mockCookiesStore.get.mockReturnValue({ value: 'admin_aal2' });

    const { createClient } = await import('@/lib/supabase/server');
    const client = await createClient();

    // Em produção, o mock NUNCA é ativado — fail-closed total.
    const userRes = await client.auth.getUser();
    expect(userRes.data.user).toBeNull();
  });

  it('permite a simulação em ambiente não-produtivo quando o cookie está presente', async () => {
    process.env.NODE_ENV = 'test';
    mockCookiesStore.get.mockReturnValue({ value: 'admin_aal2' });

    const { createClient } = await import('@/lib/supabase/server');
    const client = await createClient();

    const userRes = await client.auth.getUser();
    expect(userRes.data.user?.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(userRes.data.user?.email).toBe('admin@gradualinfo.dev');
  });
});
