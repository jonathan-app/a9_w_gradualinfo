/**
 * @fileoverview Testes da rota de preview (`app/api/preview/route.ts`).
 * @module __tests__/unit/preview-route
 * @description Comprova 405 em GET, 403 de origem, 400 de corpo/slug, 401
 *   de token e 303 de sucesso com cookie.
 * @dependencies vitest, next/server, @/app/api/preview/route.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
    previewSecret: 'token-de-teste-preview',
    previewSigningKey: 'chave-de-teste-preview',
    previewUserId: '11111111-1111-4111-8111-111111111111',
    supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake' },
  },
}));
vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));
vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));
vi.mock('@/lib/preview/config', () => ({
  previewCookieOptions: {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
  },
}));
vi.mock('@/lib/preview/session', () => ({
  equalSecret: (a: string, b: string) => a === b,
  issuePreviewGrant: () => 'cookie-fake-value',
  PREVIEW_COOKIE: 'gradualinfo-preview',
  PREVIEW_TTL: 1800,
}));
const createSession = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/preview/durable-object', () => ({
  getPreviewSessionStore: () => ({ createSession }),
}));

import { POST, GET } from '@/app/api/preview/route';

function makeRequest(opts: {
  origin?: string;
  contentType?: string;
  body?: string;
  ip?: string;
}) {
  const headers = new Headers();
  if (opts.origin) headers.set('origin', opts.origin);
  if (opts.contentType) headers.set('content-type', opts.contentType);
  if (opts.ip) headers.set('x-forwarded-for', opts.ip);
  return new NextRequest('https://gradualinfo.com.br/api/preview', {
    method: 'POST',
    headers,
    body: opts.body ?? '',
  });
}

describe('GET', () => {
  it('retorna 405 com Allow POST', () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });
});

describe('POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSession.mockResolvedValue(undefined);
  });

  it('retorna 403 com origem divergente', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://evil.com',
        contentType: 'application/json',
        body: '{}',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('retorna 400 com corpo acima de 4 KiB', async () => {
    const bigBody = 'x'.repeat(5000);
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: bigBody,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 400 com JSON malformado', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: '{invalid',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 400 com content-type não suportado', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'text/plain',
        body: 'token=x',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 400 com slug inválido (open redirect)', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: JSON.stringify({ token: 'x', slug: '../admin' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 400 com token duplicado no formulário', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/x-www-form-urlencoded',
        body: 'token=a&token=b',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retorna 401 com token divergente', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: JSON.stringify({ token: 'errado' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('retorna 303 com cookie no sucesso (JSON)', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'token-de-teste-preview',
          slug: 'meu-artigo',
        }),
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(
      'https://gradualinfo.com.br/artigos/meu-artigo',
    );
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(createSession).toHaveBeenCalled();
  });

  it('redireciona para / sem slug', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: JSON.stringify({ token: 'token-de-teste-preview' }),
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://gradualinfo.com.br/');
  });

  it('funciona com formulário urlencoded', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/x-www-form-urlencoded',
        body: 'token=token-de-teste-preview&slug=artigo-ok',
      }),
    );
    expect(res.status).toBe(303);
  });

  it('aceita slug kebab-case com números', async () => {
    const res = await POST(
      makeRequest({
        origin: 'https://gradualinfo.com.br',
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'token-de-teste-preview',
          slug: 'guia-notebook-2026',
        }),
      }),
    );
    expect(res.status).toBe(303);
  });
});
