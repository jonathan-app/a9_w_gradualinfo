/**
 * @fileoverview Testes unitários para security-headers.ts
 * @module __tests__/unit/lib/security-headers
 * @description Testa contentSecurityPolicy e securityHeaders com diferentes opções.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { contentSecurityPolicy, securityHeaders } from '@/lib/security-headers';

describe('contentSecurityPolicy', () => {
  it('inclui unsafe-eval em desenvolvimento', () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("'unsafe-eval'");
  });

  it('não inclui unsafe-eval em produção', () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('inclui diretivas obrigatórias', () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});

describe('securityHeaders', () => {
  it('retorna headers básicos', () => {
    const headers = securityHeaders({
      isProduction: false,
      siteUrl: 'http://localhost:3000',
    });
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
  });

  it('inclui CSP com unsafe-eval em desenvolvimento', () => {
    const headers = securityHeaders({
      isProduction: false,
      siteUrl: 'http://localhost:3000',
    });
    expect(headers['Content-Security-Policy']).toContain("'unsafe-eval'");
  });

  it('não inclui HSTS em desenvolvimento', () => {
    const headers = securityHeaders({
      isProduction: false,
      siteUrl: 'http://localhost:3000',
    });
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('inclui HSTS em produção com HTTPS', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'https://example.com',
    });
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('não inclui HSTS em produção com localhost', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'http://localhost:3000',
    });
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('não inclui HSTS quando siteUrl é inválido', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'não-é-uma-url',
    });
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('usa valores padrão quando não informado', () => {
    const headers = securityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
