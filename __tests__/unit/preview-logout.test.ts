// @vitest-environment node
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
