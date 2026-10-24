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
    headers: new Headers(),
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

  it('aplica CSP com nonce na pagina administrativa e encaminha o nonce ao render', async () => {
    const set = vi.fn();
    const res = { headers: { set } } as unknown as Response;
    updateSession.mockResolvedValueOnce(res);
    classifyAdminPath.mockReturnValueOnce('protected');
    const request = makeRequest('/admin-dashboard/usuarios');

    await proxy(request);

    const nonce = request.headers.get('x-nonce');
    expect(nonce).toBeTruthy();
    expect(request.headers.get('content-security-policy')).toContain(
      `'nonce-${nonce}'`,
    );
    expect(set).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining(`'nonce-${nonce}'`),
    );
  });

  it('nao aplica nonce na home, que continua ISR com a politica estatica', async () => {
    const set = vi.fn();
    const res = { headers: { set } } as unknown as Response;
    updateSession.mockResolvedValueOnce(res);
    const request = makeRequest('/');

    await proxy(request);

    expect(request.headers.get('x-nonce')).toBeNull();
    expect(set).not.toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.anything(),
    );
  });
});

describe('needsScriptNonce', () => {
  it('liga para o painel e seus filhos, inclusive o login', async () => {
    const { needsScriptNonce } = await import('@/proxy');
    expect(needsScriptNonce('/admin-dashboard')).toBe(true);
    expect(needsScriptNonce('/admin-dashboard/login')).toBe(true);
    expect(needsScriptNonce('/admin-dashboard/usuarios')).toBe(true);
  });

  it('nao liga para home, artigos nem APIs administrativas', async () => {
    const { needsScriptNonce } = await import('@/proxy');
    expect(needsScriptNonce('/')).toBe(false);
    expect(needsScriptNonce('/artigos/exemplo')).toBe(false);
    expect(needsScriptNonce('/api/admin/usuarios/papeis')).toBe(false);
    expect(needsScriptNonce('/admin-dashboardx')).toBe(false);
  });
});

describe('config.matcher', () => {
  it('exporta matcher com rota protegida e catch-all', async () => {
    const mod = await import('@/proxy');
    expect(mod.config.matcher).toContain('/admin-dashboard/:path*');
    expect(mod.config.matcher).toContain('/api/admin/:path*');
    expect(mod.config.matcher.some((m: string) => m.includes('!'))).toBe(true);
  });

  it('inclui sitemap.xml no matcher para probe de disponibilidade do Sanity (spec 0006 seção 3.C)', async () => {
    const mod = await import('@/proxy');
    expect(mod.config.matcher).toContain('/sitemap.xml');
  });
});
