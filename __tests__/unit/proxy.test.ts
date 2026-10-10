/**
 * @fileoverview Testes do proxy (rotina de middleware do Next 16).
 * @module __tests__/unit/proxy
 * @description Comprova que o proxy aplica guard admin, renova sessão e
 *   aplica headers de cache apenas em rotas protegidas.
 * @dependencies vitest, proxy, @/lib/admin/access-guard (mock),
 *   @/lib/admin/access (mock), @/lib/supabase/middleware (mock).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const guardAdminAccess = vi.hoisted(() =>
  vi.fn<() => Response | null>(() => null),
);
const classifyAdminPath = vi.hoisted(() =>
  vi.fn<(p: string) => string>(() => 'public'),
);
const updateSession = vi.hoisted(
  () =>
    vi.fn(async () => ({
      headers: { set: vi.fn() },
    })) as unknown as () => Promise<Response>,
);

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess,
}));
vi.mock('@/lib/admin/access', () => ({
  classifyAdminPath,
}));
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession,
}));

import { proxy } from '@/proxy';

function makeRequest(pathname: string, method = 'GET'): NextRequest {
  return {
    nextUrl: { pathname },
    method,
    url: `https://gradualinfo.com.br${pathname}`,
  } as unknown as NextRequest;
}

function makeResponse() {
  const set = vi.fn();
  return { headers: { set } } as unknown as Response;
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classifyAdminPath.mockReturnValue('public');
    guardAdminAccess.mockReturnValue(null);
  });

  it('retorna null do guard em rota pública e chama updateSession', async () => {
    const res = makeResponse();
    updateSession.mockResolvedValueOnce(res);
    const request = makeRequest('/');
    const response = await proxy(request);
    expect(guardAdminAccess).not.toHaveBeenCalled();
    expect(updateSession).toHaveBeenCalledWith(request);
    expect(response).toBe(res);
  });

  it('retorna falha do guard sem chamar updateSession', async () => {
    const failure = new Response(null, { status: 503 });
    guardAdminAccess.mockReturnValueOnce(failure);
    classifyAdminPath.mockReturnValueOnce('protected');
    const request = makeRequest('/admin-dashboard');
    const response = await proxy(request);
    expect(response).toBe(failure);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('aplica headers de cache em rota protegida após sessão', async () => {
    const set = vi.fn();
    const res = { headers: { set } } as unknown as Response;
    updateSession.mockResolvedValueOnce(res);
    classifyAdminPath.mockReturnValue('protected');
    guardAdminAccess.mockReturnValue(null);
    const request = makeRequest('/admin-dashboard');
    await proxy(request);
    expect(set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(set).toHaveBeenCalledWith('X-Robots-Tag', 'noindex, nofollow');
  });

  it('não aplica headers de cache em rota pública', async () => {
    const set = vi.fn();
    const res = { headers: { set } } as unknown as Response;
    updateSession.mockResolvedValueOnce(res);
    classifyAdminPath.mockReturnValue('public');
    const request = makeRequest('/');
    await proxy(request);
    expect(set).not.toHaveBeenCalled();
  });
});

describe('config.matcher', () => {
  it('exporta matcher com rota protegida e catch-all', async () => {
    const mod = await import('@/proxy');
    expect(mod.config.matcher).toContain('/admin-dashboard/:path*');
    expect(mod.config.matcher).toContain('/api/admin/:path*');
    expect(mod.config.matcher.some((m: string) => m.includes('!'))).toBe(true);
  });
});
