/**
 * @fileoverview Fronteira Worker e isolamento de contextos administrativos.
 * @module __tests__/unit/admin-access-worker
 * @description Prova ordem de despacho, remoção de asserção e preservação de env.
 * @dependencies vitest, lib/admin/access-worker.
 */
import { describe, it, vi, expect, beforeEach } from 'vitest';
import type * as AccessModule from '@/lib/admin/access';
const admission = vi.hoisted(() => vi.fn());
vi.mock('@/lib/admin/access', async (importOriginal) => ({
  ...(await importOriginal<typeof AccessModule>()),
  admitAdminAccess: admission,
}));
import { dispatchWithAdminAccess } from '@/lib/admin/access-worker';
const internal = Object.freeze({
  version: 1,
  allowed: true,
  authority: 'admin.example.test',
  method: 'GET',
  pathname: '/admin-dashboard',
  deadline: 2000,
});
beforeEach(() => admission.mockReset());
describe('wrapper Worker', () => {
  it('não envia identidade nem cookies Access ao Next em rota pública', async () => {
    const dispatch = vi.fn(async (request: Request) => {
      expect(request.headers.has('cf-access-jwt-assertion')).toBe(false);
      expect(request.headers.has('cf-access-authenticated-user-email')).toBe(
        false,
      );
      expect(request.headers.get('cookie')?.trim()).toBe(
        'supabase-session=synthetic',
      );
      return new Response('public');
    });
    await dispatchWithAdminAccess(
      new Request('https://public.example.test/', {
        headers: {
          'cf-access-jwt-assertion': 'synthetic',
          'cf-access-authenticated-user-email': 'owner@example.test',
          cookie:
            'CF_Authorization=synthetic; CF_Binding=synthetic; supabase-session=synthetic',
        },
      }),
      {},
      dispatch,
    );
    expect(admission).not.toHaveBeenCalled();
  });
  it('não despacha recusa nem deixa OpenNext tocar Supabase', async () => {
    admission.mockResolvedValue(new Response(null, { status: 403 }));
    const dispatch = vi.fn();
    const result = await dispatchWithAdminAccess(
      new Request('https://admin.example.test/admin-dashboard'),
      {},
      dispatch,
    );
    expect(result.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('bloqueia variante codificada antes de admitir ou servir asset', async () => {
    const dispatch = vi.fn();
    const result = await dispatchWithAdminAccess(
      new Request('https://admin.example.test/%61dmin-dashboard/asset.svg'),
      {},
      dispatch,
    );
    expect(result.status).toBe(400);
    expect(admission).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('publica contexto somente na cópia env e remove asserção encaminhada', async () => {
    admission.mockResolvedValue(internal);
    const original = {
      ADMIN_ACCESS_REQUEST_CONTEXT: 'synthetic-forged',
      ASSETS: {},
    };
    const dispatch = vi.fn(
      async (request: Request, env: Record<string, unknown>) => {
        expect(request.headers.has('cf-access-jwt-assertion')).toBe(false);
        expect(request.headers.has('x-forwarded-host')).toBe(false);
        expect(env.ADMIN_ACCESS_REQUEST_CONTEXT).toBe(internal);
        return new Response('private');
      },
    );
    const result = await dispatchWithAdminAccess(
      new Request('https://admin.example.test/admin-dashboard', {
        headers: {
          'cf-access-jwt-assertion': 'synthetic',
          'x-forwarded-host': 'other.example.test',
        },
      }),
      original,
      dispatch,
    );
    expect(original.ADMIN_ACCESS_REQUEST_CONTEXT).toBe('synthetic-forged');
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(dispatch).toHaveBeenCalledOnce();
  });
  it('público não herda contexto administrativo de binding', async () => {
    const dispatch = vi.fn(
      async (_request: Request, env: Record<string, unknown>) => {
        expect(env.ADMIN_ACCESS_REQUEST_CONTEXT).toBeUndefined();
        return new Response('public');
      },
    );
    expect(
      (
        await dispatchWithAdminAccess(
          new Request('https://public.example.test/artigos/publico'),
          { ADMIN_ACCESS_REQUEST_CONTEXT: internal },
          dispatch,
        )
      ).status,
    ).toBe(200);
    expect(admission).not.toHaveBeenCalled();
  });
});
