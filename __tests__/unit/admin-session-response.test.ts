// @vitest-environment node
/**
 * @fileoverview Testes unitários do capturador de cookies SSR para respostas administrativas.
 * @module __tests__/unit/admin-session-response
 * @description Verifica que o finalizador preserva as opções do SDK ao reconstruir respostas,
 *   sem copiar cookies recebidos como se fossem cookies novos de sessão.
 * @dependencies vitest, lib/admin/session-response.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mockSupabase = vi.hoisted(() => ({
  auth: {},
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async (onCookies?: unknown) => {
    if (onCookies) {
      (onCookies as (updates: unknown[]) => void)([
        {
          name: 'sb-auth-token',
          value: 'sdk-token-value',
          options: {
            path: '/admin-dashboard',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 600,
          },
        },
      ]);
    }
    return mockSupabase;
  }),
}));

import { createAdminSessionResponse } from '@/lib/admin/session-response';

describe('createAdminSessionResponse', () => {
  it('aplica cookies do SDK na resposta final', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: true });
    const final = finish(response);

    const cookie = final.cookies.get('sb-auth-token');
    expect(cookie?.value).toBe('sdk-token-value');
  });

  it('preserva opções completas do cookie do SDK', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: true });
    const final = finish(response);

    const setCookieHeader = final.headers.get('set-cookie') || '';
    expect(setCookieHeader).toContain('Path=/admin-dashboard');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('Secure');
    expect(setCookieHeader).toContain('SameSite=strict');
    expect(setCookieHeader).toContain('Max-Age=600');
  });

  it('aplica Cache-Control private no-store na resposta final', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: true });
    const final = finish(response);

    expect(final.headers.get('cache-control')).toBe('private, no-store');
  });

  it('remove cookies quando clear é true', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: false });
    const final = finish(response, true);

    const cookie = final.cookies.get('sb-auth-token');
    expect(cookie?.value).toBe('');
    const setCookieHeader = final.headers.get('set-cookie') || '';
    expect(setCookieHeader).toContain('Max-Age=0');
  });

  it('não copia cookies recebidos como cookies novos', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: true });
    response.cookies.set('received-cookie', 'received-value');
    const final = finish(response);

    expect(final.cookies.get('received-cookie')?.value).toBe('received-value');
    expect(final.cookies.get('sb-auth-token')?.value).toBe('sdk-token-value');
  });

  it('funciona sem callback de captura', async () => {
    const { finish } = await createAdminSessionResponse();
    const response = NextResponse.json({ ok: true });
    const final = finish(response);

    expect(final.cookies.get('sb-auth-token')?.value).toBe('sdk-token-value');
  });
});
