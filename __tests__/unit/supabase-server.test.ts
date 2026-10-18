/**
 * @fileoverview Testes do cliente Supabase do servidor (createClient, createPublicClient).
 * @module __tests__/unit/supabase-server
 * @description Comprota criação de cliente público, propagação de cookies,
 *   callback onCookies e o caminho de simulação E2E por cookie (dev only).
 * @dependencies vitest, @/lib/supabase/server, @supabase/ssr (mock),
 *   @supabase/supabase-js (mock), next/headers (mock), @/lib/env (mock).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockCreateServerClient = vi.hoisted(() => vi.fn());
const mockCreateSupabaseClient = vi.hoisted(() =>
  vi.fn(() => ({ auth: {}, from: vi.fn() })),
);
const mockCookies = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    getAll: vi.fn(() =>
      [...store.entries()].map(([name, value]) => ({ name, value })),
    ),
    get: vi.fn((name: string) =>
      store.has(name) ? { name, value: store.get(name)! } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
    __set: (name: string, value: string) => store.set(name, value),
    __clear: () => store.clear(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateSupabaseClient,
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookies),
}));
vi.mock('@/lib/env', () => ({
  env: {
    supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake-anon' },
    adminUserId: '11111111-1111-4111-8111-111111111111',
    adminEmail: 'a3qua96@gmail.com',
    siteUrl: 'https://gradualinfo.com.br',
  },
}));

import { createClient, createPublicClient } from '@/lib/supabase/server';

describe('createClient (sem cookie E2E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.__clear();
    mockCreateServerClient.mockReturnValue({
      auth: { mfa: {} },
      from: vi.fn(),
    });
    process.env.NODE_ENV = 'test';
  });

  it('cria cliente com getAll e setAll encaixados no cookie store', async () => {
    await createClient();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://xyz.supabase.co',
      'fake-anon',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it('getAll devolve cookies do store', async () => {
    mockCookies.__set('sess', 'abc');
    await createClient();
    const opts = mockCreateServerClient.mock.calls[0]?.[2];
    expect(opts.cookies.getAll()).toEqual([{ name: 'sess', value: 'abc' }]);
  });

  it('setAll chama onCookies e ignora erro de cookie readonly', async () => {
    const onCookies = vi.fn();
    mockCookies.set.mockImplementation(() => {
      throw new Error('readonly');
    });
    await createClient(onCookies);
    const opts = mockCreateServerClient.mock.calls[0]?.[2];
    opts.cookies.setAll([{ name: 'x', value: 'y', options: {} }]);
    expect(onCookies).toHaveBeenCalledWith([
      { name: 'x', value: 'y', options: {} },
    ]);
  });
});

describe('createClient (cookie E2E em dev)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.__clear();
    mockCreateServerClient.mockReturnValue({
      auth: { mfa: {} },
      from: vi.fn(),
    });
    process.env.NODE_ENV = 'development';
    process.env.E2E_TEST = '1';
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.E2E_TEST;
  });

  it('ignora o cookie em dev quando E2E_TEST não está ativo', async () => {
    delete process.env.E2E_TEST;
    mockCookies.__set('__e2e_session_role', 'admin_no_mfa');
    const client = await createClient();
    // Sem E2E_TEST=1, createServerClient padrão é chamado
    expect(mockCreateServerClient).toHaveBeenCalled();
    expect(client.auth.getUser).toBeUndefined();
  });

  it('admin_no_mfa devolve user mock e AAL1 sem fatores', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_no_mfa');
    const client = await createClient();
    const user = await client.auth.getUser();
    expect(user.data.user?.email).toBe('a3qua96@gmail.com');
    const aal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal.data.currentLevel).toBe('aal1');
  });

  it('admin_aal2 devolve AAL2 com fatores', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_aal2');
    const client = await createClient();
    const aal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal.data.currentLevel).toBe('aal2');
  });

  it('admin_aal1 aceita code 123456 no challengeAndVerify', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_aal1');
    const client = await createClient();
    const result = await client.auth.mfa.challengeAndVerify({
      code: '123456',
    });
    expect(result.error).toBeNull();
  });

  it('admin_aal1 rejeita code diferente', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_aal1');
    const client = await createClient();
    const result = await client.auth.mfa.challengeAndVerify({
      code: '000000',
    });
    expect(result.error?.message).toBe('Invalid code');
  });

  it('other_user devolve email de invasor', async () => {
    mockCookies.__set('__e2e_session_role', 'other_user');
    const client = await createClient();
    const user = await client.auth.getUser();
    expect(user.data.user?.email).toBe('invasor@externo.com');
  });

  it('enroll devolve erro quando já enrolado (admin_aal2)', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_aal2');
    const client = await createClient();
    const result = await client.auth.mfa.enroll();
    expect(result.error?.message).toBe('Already enrolled');
  });

  it('signOut deleta o cookie E2E', async () => {
    mockCookies.__set('__e2e_session_role', 'admin_no_mfa');
    const client = await createClient();
    await client.auth.signOut();
    expect(mockCookies.delete).toHaveBeenCalledWith('__e2e_session_role');
  });
});

describe('createPublicClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria cliente anônimo sem sessão', () => {
    createPublicClient();
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      'https://xyz.supabase.co',
      'fake-anon',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  });
});
