/**
 * @fileoverview Testes unitários para access.ts - função classifyAdminPath
 * @module __tests__/unit/lib/admin/access
 * @description Testa a classificação de caminhos administrativos.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    isProduction: true,
    siteUrl: 'https://gradualinfo.com.br',
  },
}));

vi.mock('@/lib/security-headers', () => ({
  securityHeaders: vi.fn(() => ({})),
}));

import { classifyAdminPath } from '@/lib/admin/access';

describe('classifyAdminPath', () => {
  it('classifica caminhos públicos como public', () => {
    expect(classifyAdminPath('/')).toBe('public');
    expect(classifyAdminPath('/artigos/meu-artigo')).toBe('public');
    expect(classifyAdminPath('/busca')).toBe('public');
  });

  it('classifica caminhos administrativos diretos como protected', () => {
    expect(classifyAdminPath('/admin-dashboard')).toBe('protected');
    expect(classifyAdminPath('/api/admin')).toBe('protected');
    expect(classifyAdminPath('/admin-dashboard/')).toBe('protected');
    expect(classifyAdminPath('/api/admin/health')).toBe('protected');
  });

  it('classifica caminhos com decodificação suspeita como ambiguous', () => {
    expect(classifyAdminPath('/%61dmin-dashboard')).toBe('ambiguous');
  });
});
