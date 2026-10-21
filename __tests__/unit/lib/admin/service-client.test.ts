/**
 * @fileoverview Testes unitários para service-client.ts
 * @module __tests__/unit/lib/admin/service-client
 * @description Testa getAdminServiceClient com chave de serviço configurada.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    supabase: {
      url: 'http://localhost:54321',
      serviceRoleKey: 'test-service-key',
    },
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

import { getAdminServiceClient } from '@/lib/admin/service-client';

describe('getAdminServiceClient', () => {
  it('retorna cliente quando serviceRoleKey esta configurada', () => {
    const client = getAdminServiceClient();
    expect(client).toBeDefined();
  });
});
