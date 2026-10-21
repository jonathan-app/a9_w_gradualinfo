/**
 * @fileoverview Testes unitários para auth.ts - função roleSatisfies
 * @module __tests__/unit/lib/admin/auth
 * @description Testa a hierarquia cumulativa de papéis administrativos.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: { adminUserId: '00000000-0000-0000-0000-000000000001' },
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: vi.fn(),
}));

import { roleSatisfies } from '@/lib/admin/auth';

describe('roleSatisfies', () => {
  it('admin satisfaz qualquer papel exigido', () => {
    expect(roleSatisfies('admin', 'admin')).toBe(true);
    expect(roleSatisfies('admin', 'editor')).toBe(true);
    expect(roleSatisfies('admin', 'revisor')).toBe(true);
  });

  it('editor satisfaz editor e revisor, mas não admin', () => {
    expect(roleSatisfies('editor', 'admin')).toBe(false);
    expect(roleSatisfies('editor', 'editor')).toBe(true);
    expect(roleSatisfies('editor', 'revisor')).toBe(true);
  });

  it('revisor satisfaz apenas revisor', () => {
    expect(roleSatisfies('revisor', 'admin')).toBe(false);
    expect(roleSatisfies('revisor', 'editor')).toBe(false);
    expect(roleSatisfies('revisor', 'revisor')).toBe(true);
  });
});
