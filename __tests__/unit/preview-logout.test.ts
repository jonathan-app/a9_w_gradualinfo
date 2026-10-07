// @vitest-environment node
/**
 * @fileoverview Suíte da rota `POST /api/preview/logout` — falha do provedor não pode deixar
 *   autorização para trás.
 * @module __tests__/unit/preview-logout
 * @description Tanto o `signOut` devolvendo `{ error }` quanto a Promise rejeitada precisam do
 *   mesmo desfecho local: 503 sem cache e cookies de sessão e de preview apagados. Fechamento
 *   de sessão é requisição autenticável, então GET (405) e origem externa (403) nem chegam ao
 *   provedor.
 * @dependencies vitest, next/server (NextRequest), @/app/api/preview/logout/route,
 *   @supabase/ssr e @/lib/audit substituídos por mocks.
 *
 * Roda em ambiente Node (directive acima): a rota é módulo de servidor, não código de browser.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { signOut: mocks.signOut } }),
}));
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://example.invalid',
}));
import { POST, GET } from '@/app/api/preview/logout/route';
describe('logout que falha no provedor', () => {
  beforeEach(() => vi.resetAllMocks());
  // Os dois formatos de falha têm de produzir o mesmo resultado local: cookie apagado com
  // Max-Age=0. Autorização que não se revoga quando o provedor falha vira acesso fantasma —
  // o usuário sai com a sensação de sair e o browser continua autenticado.
  it.each(['returned', 'thrown'])(
    'elimina cookies quando erro é %s',
    async (kind) => {
      if (kind === 'returned')
        mocks.signOut.mockResolvedValue({ error: new Error('failure') });
      else mocks.signOut.mockRejectedValue(new Error('failure'));
      const response = await POST(
        new NextRequest('https://example.invalid/api/preview/logout', {
          method: 'POST',
          headers: {
            origin: 'https://example.invalid',
            cookie: 'sb-local-auth-token=old; gradualinfo-preview=proof',
          },
        }),
      );
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.cookies.get('gradualinfo-preview')?.value).toBe('');
      expect(response.cookies.get('sb-local-auth-token')?.value).toBe('');
      expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    },
  );
  // 405 em GET e 403 em origem que não casa com o site: sem essa guarda, um site externo
  // poderia disparar o logout da vítima (CSRF) por simplesmente apontar um form ou fetch aqui.
  it('nega GET e origem externa', async () => {
    expect(GET().status).toBe(405);
    const response = await POST(
      new NextRequest('https://example.invalid/api/preview/logout', {
        method: 'POST',
        headers: { origin: 'https://evil.invalid' },
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
