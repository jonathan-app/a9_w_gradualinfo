/**
 * @fileoverview Testes unitários para roles.ts
 * @module __tests__/unit/lib/admin/roles
 * @description Testa assignAdminRole e revokeAdminRole com cliente mockado.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/admin/auth', () => ({
  AdminRole: undefined,
}));

vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: vi.fn(() => null),
}));

vi.mock('@/lib/admin/audit-service', () => ({
  sanitizeClientIp: vi.fn((ip) => ip || null),
}));

import {
  assignAdminRole,
  revokeAdminRole,
  RoleMutationError,
} from '@/lib/admin/roles';

describe('assignAdminRole', () => {
  it('lança RoleMutationError quando usuário não existe (P0002)', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({
        error: { code: 'P0002', message: 'admin_user_not_found' },
      })),
    } as any);
    await expect(
      assignAdminRole({
        userId: 'user-1',
        role: 'editor',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      }),
    ).rejects.toBeInstanceOf(RoleMutationError);
  });

  it('lança RoleMutationError com código USER_NOT_FOUND', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({
        error: { code: 'P0002', message: 'admin_user_not_found' },
      })),
    } as any);
    try {
      await assignAdminRole({
        userId: 'user-1',
        role: 'editor',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(RoleMutationError);
      expect((err as RoleMutationError).code).toBe('USER_NOT_FOUND');
    }
  });

  it('lança RoleMutationError genérico para outros erros de banco', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({
        error: { code: '50000', message: 'erro inesperado' },
      })),
    } as any);
    try {
      await assignAdminRole({
        userId: 'user-1',
        role: 'editor',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(RoleMutationError);
      expect((err as RoleMutationError).code).toBe('50000');
    }
  });

  it('resolvido com sucesso quando RPC não retorna erro', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({ error: null })),
    } as any);
    await expect(
      assignAdminRole({
        userId: 'user-1',
        role: 'editor',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('revokeAdminRole', () => {
  it('lança RoleMutationError com código ROLE_NOT_FOUND', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({
        error: { code: 'P0002', message: 'admin_role_not_found' },
      })),
    } as any);
    try {
      await revokeAdminRole({
        userId: 'user-1',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(RoleMutationError);
      expect((err as RoleMutationError).code).toBe('ROLE_NOT_FOUND');
    }
  });

  it('resolvido com sucesso quando RPC não retorna erro', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockReturnValue({
      rpc: vi.fn(async () => ({ error: null })),
    } as any);
    await expect(
      revokeAdminRole({
        userId: 'user-1',
        actorId: 'actor-1',
        ipAddress: '1.2.3.4',
      }),
    ).resolves.toBeUndefined();
  });
});

// cliente privilegiado ausente: falha fechada antes de qualquer chamada ao banco.
describe('configuração administrativa ausente', () => {
  it('assignAdminRole lança CONFIG_MISSING quando o cliente não é construído', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockImplementation(() => {
      throw new Error('sem service role');
    });
    try {
      await assignAdminRole({
        userId: 'user-1',
        role: 'editor',
        actorId: 'actor-1',
      });
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(RoleMutationError);
      expect((err as RoleMutationError).code).toBe('CONFIG_MISSING');
    }
  });

  it('revokeAdminRole lança CONFIG_MISSING quando o cliente não é construído', async () => {
    const { getAdminServiceClient } =
      await import('@/lib/admin/service-client');
    vi.mocked(getAdminServiceClient).mockImplementation(() => {
      throw new Error('sem service role');
    });
    try {
      await revokeAdminRole({ userId: 'user-1', actorId: 'actor-1' });
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(RoleMutationError);
      expect((err as RoleMutationError).code).toBe('CONFIG_MISSING');
    }
  });
});
