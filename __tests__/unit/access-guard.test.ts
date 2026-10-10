/**
 * @fileoverview Testes da guarda de admissão Access (guardAdminAccess).
 * @module __tests__/unit/access-guard
 * @description Comprova recusa 503 sem contexto, versão inválida, allowed
 *   falso, host fora da lista, path não protegido, método/path divergente
 *   (403) e sucesso (null).
 * @dependencies vitest, @/lib/admin/access-guard, @opennextjs/cloudflare (mock),
 *   @/lib/env (mock), @/lib/admin/access (mock parcial).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCloudflareContextMock = vi.hoisted(() =>
  vi.fn(() => ({ env: {} as Record<string, unknown> })),
);
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => getCloudflareContextMock(),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({})),
}));
vi.mock('@/lib/env', () => ({
  readAdminAccessConfig: vi.fn(
    (bindings: Record<string, unknown>) =>
      bindings.ADMIN_ACCESS_CONFIG as
        { hosts: string[]; ownerEmail: string } | undefined,
  ),
}));
import type * as AccessModule from '@/lib/admin/access';
vi.mock('@/lib/admin/access', async (importOriginal) => {
  const orig = await importOriginal<typeof AccessModule>();
  return {
    ...orig,
    accessFailureResponse: vi.fn(
      (_req: unknown, status: number) => new Response(null, { status }),
    ),
    classifyAdminPath: vi.fn((pathname: string) =>
      pathname.startsWith('/admin-dashboard') ||
      pathname.startsWith('/api/admin')
        ? 'protected'
        : 'public',
    ),
  };
});

import {
  guardAdminAccess,
  requireAdminAccessPage,
  getAdminAccessLogoutUrl,
} from '@/lib/admin/access-guard';

const VALID_CONTEXT = Object.freeze({
  version: 1,
  allowed: true,
  deadline: Date.now() + 60_000,
  authority: 'gradualinfo.cloudflareaccess.com',
  pathname: '/admin-dashboard',
  method: 'GET',
});

function setupValid() {
  getCloudflareContextMock.mockReturnValue({
    env: {
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: VALID_CONTEXT,
    },
  });
}

function setupEnv(env: Record<string, unknown>) {
  getCloudflareContextMock.mockReturnValue({ env });
}

function makeRequest(pathname = '/admin-dashboard', method = 'GET') {
  return { method, url: `https://gradualinfo.com.br${pathname}` } as Request;
}

describe('guardAdminAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCloudflareContextMock.mockReturnValue({ env: {} });
  });

  it('retorna 503 sem contexto', () => {
    setupEnv({ ADMIN_ACCESS_CONFIG: { hosts: ['x'] } });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 sem config', () => {
    setupEnv({ ADMIN_ACCESS_REQUEST_CONTEXT: VALID_CONTEXT });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com versão diferente de 1', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        version: 2,
      }),
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com allowed falso', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        allowed: false,
      }),
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com contexto não congelado', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: { ...VALID_CONTEXT },
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com deadline não finito', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        deadline: Infinity,
      }),
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com host fora da allowlist', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        authority: 'evil.com',
      }),
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 503 com path não protegido', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        pathname: '/artigos/x',
      }),
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });

  it('retorna 403 quando método diverge', () => {
    setupValid();
    expect(
      guardAdminAccess(makeRequest('/admin-dashboard', 'POST'))?.status,
    ).toBe(403);
  });

  it('retorna 403 quando path diverge', () => {
    setupEnv({
      ADMIN_ACCESS_CONFIG: {
        hosts: ['gradualinfo.cloudflareaccess.com'],
        ownerEmail: 'a3qua96@gmail.com',
      },
      ADMIN_ACCESS_REQUEST_CONTEXT: Object.freeze({
        ...VALID_CONTEXT,
        pathname: '/admin-dashboard/outra',
      }),
    });
    expect(guardAdminAccess(makeRequest('/admin-dashboard'))?.status).toBe(403);
  });

  it('retorna null quando válido e sem request', () => {
    setupValid();
    expect(guardAdminAccess()).toBeNull();
  });

  it('retorna null quando válido com request correspondente', () => {
    setupValid();
    expect(guardAdminAccess(makeRequest())).toBeNull();
  });

  it('retorna 503 quando getCloudflareContext lança', () => {
    setupValid();
    getCloudflareContextMock.mockImplementationOnce(() => {
      throw new Error('no context');
    });
    expect(guardAdminAccess()?.status).toBe(503);
  });
});

describe('requireAdminAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCloudflareContextMock.mockReturnValue({ env: {} });
  });

  it('lança quando guard falha', async () => {
    await expect(requireAdminAccessPage()).rejects.toThrow(
      'Admissão administrativa indisponível.',
    );
  });

  it('resolve quando guard passa', async () => {
    setupValid();
    await expect(requireAdminAccessPage()).resolves.toBeUndefined();
  });
});

describe('getAdminAccessLogoutUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCloudflareContextMock.mockReturnValue({ env: {} });
  });

  it('retorna null quando guard falha', () => {
    expect(getAdminAccessLogoutUrl()).toBeNull();
  });

  it('monta URL de logout do Access', () => {
    setupValid();
    expect(getAdminAccessLogoutUrl()).toBe(
      'https://gradualinfo.cloudflareaccess.com/cdn-cgi/access/logout',
    );
  });
});
