/**
 * @fileoverview Testes das funções puras de admissão Access.
 * @module __tests__/unit/admin-access
 * @description Comprova classifyAdminPath e accessFailureResponse.
 * @dependencies vitest, @/lib/admin/access.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// `env` entrou no mock porque `accessFailureResponse` agora espalha os headers
// de `lib/security-headers`, que recebem isProduction e siteUrl deste módulo.
vi.mock('@/lib/env', () => ({
  env: { isProduction: false, siteUrl: 'http://localhost:3000' },
  readAdminAccessConfig: vi.fn(() => null),
}));
vi.mock('@/lib/admin/rate-limit-protocol', () => ({
  readBoundedJson: vi.fn(),
}));
vi.mock('jose', () => ({
  decodeProtectedHeader: vi.fn(),
  importJWK: vi.fn(),
  jwtVerify: vi.fn(),
}));

import {
  classifyAdminPath,
  accessFailureResponse,
  isTestAccessHarnessAllowed,
} from '@/lib/admin/access';

describe('isTestAccessHarnessAllowed', () => {
  it('permite harness apenas em ambiente local com ADMIN_ACCESS_KEY_PAIR e sem domínio de produção', () => {
    expect(
      isTestAccessHarnessAllowed({
        ADMIN_ACCESS_KEY_PAIR: '{"keys":[]}',
        ADMIN_ACCESS_HOSTS: 'admin.example.test',
        NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
      }),
    ).toBe(true);
  });

  it('bloqueia quando ADMIN_ACCESS_KEY_PAIR está ausente', () => {
    expect(
      isTestAccessHarnessAllowed({
        ADMIN_ACCESS_HOSTS: 'admin.example.test',
      }),
    ).toBe(false);
  });

  it('bloqueia quando bindings.NODE_ENV === production', () => {
    expect(
      isTestAccessHarnessAllowed({
        NODE_ENV: 'production',
        ADMIN_ACCESS_KEY_PAIR: '{"keys":[]}',
        ADMIN_ACCESS_HOSTS: 'admin.example.test',
      }),
    ).toBe(false);
  });

  it('bloqueia quando NEXT_PUBLIC_SITE_URL aponta para gradualinfo.com.br', () => {
    expect(
      isTestAccessHarnessAllowed({
        ADMIN_ACCESS_KEY_PAIR: '{"keys":[]}',
        ADMIN_ACCESS_HOSTS: 'admin.example.test',
        NEXT_PUBLIC_SITE_URL: 'https://gradualinfo.com.br',
      }),
    ).toBe(false);
  });

  it('bloqueia quando ADMIN_ACCESS_HOSTS inclui gradualinfo.com.br', () => {
    expect(
      isTestAccessHarnessAllowed({
        ADMIN_ACCESS_KEY_PAIR: '{"keys":[]}',
        ADMIN_ACCESS_HOSTS: 'gradualinfo.com.br,admin.example.test',
      }),
    ).toBe(false);
  });
});

describe('classifyAdminPath', () => {
  it('classifica /admin-dashboard como protected', () => {
    expect(classifyAdminPath('/admin-dashboard')).toBe('protected');
  });

  it('classifica /admin-dashboard/login como protected', () => {
    expect(classifyAdminPath('/admin-dashboard/login')).toBe('protected');
  });

  it('classifica /api/admin como protected', () => {
    expect(classifyAdminPath('/api/admin')).toBe('protected');
  });

  it('classifica /api/admin/auth/login como protected', () => {
    expect(classifyAdminPath('/api/admin/auth/login')).toBe('protected');
  });

  it('classifica / como public', () => {
    expect(classifyAdminPath('/')).toBe('public');
  });

  it('classifica /artigos/meu-artigo como public', () => {
    expect(classifyAdminPath('/artigos/meu-artigo')).toBe('public');
  });

  it('classifica caminho percent-encoded para admin como ambiguous', () => {
    expect(classifyAdminPath('/%61dmin-dashboard')).toBe('ambiguous');
  });

  it('classifica barra dupla em path protegido como ambiguous', () => {
    expect(classifyAdminPath('/admin-dashboard//x')).toBe('ambiguous');
  });

  it('classifica path com backslash como ambiguous', () => {
    expect(classifyAdminPath('/admin-dashboard\\x')).toBe('ambiguous');
  });

  it('classifica /login como public', () => {
    expect(classifyAdminPath('/login')).toBe('public');
  });
});

describe('accessFailureResponse', () => {
  it('retorna JSON quando Accept é application/json', () => {
    const req = new Request('https://x.com/a', {
      headers: { accept: 'application/json' },
    });
    const res = accessFailureResponse(req, 403);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('retorna HTML por padrão', () => {
    const req = new Request('https://x.com/a', {
      headers: { accept: 'text/html' },
    });
    const res = accessFailureResponse(req, 403);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('inclui Retry-After em 503', () => {
    const res = accessFailureResponse(undefined, 503);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('5');
  });

  it('retorna access_denied em 400', () => {
    const req = new Request('https://x.com/a', {
      headers: { accept: 'application/json' },
    });
    const res = accessFailureResponse(req, 400);
    expect(res.status).toBe(400);
  });

  it('retorna HTML para request undefined', () => {
    const res = accessFailureResponse(undefined, 403);
    expect(res.headers.get('content-type')).toContain('text/html');
  });
});
