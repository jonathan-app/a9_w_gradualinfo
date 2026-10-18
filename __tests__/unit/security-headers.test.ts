// @vitest-environment node
/**
 * @fileoverview Suíte unitária de `lib/security-headers`.
 * @module __tests__/unit/security-headers
 * @description Os headers de security agora têm fonte única, compartilhada pelo
 *   `next.config.ts` e pelas respostas montadas à mão (503 da home, 404 de
 *   artigo bloqueado, recusa do Access). Esta suíte trava o contrato dessa
 *   função: quais headers existem, como a CSP varia entre produção e
 *   desenvolvimento, quando o HSTS aparece e o que acontece com siteUrl
 *   inválido. Função pura, sem `process.env`: cada caso passa os parâmetros.
 * @dependencies lib/security-headers (securityHeaders, contentSecurityPolicy).
 *
 * Roda em ambiente Node (directive acima): não há DOM nem browser em jogo.
 */
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from '@/lib/security-headers';

describe('securityHeaders', () => {
  it('traz o conjunto base em qualquer ambiente', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'https://x.dev',
    });

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
  });

  it('emite HSTS em produção com host https real', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'https://gradualinfo.com.br',
    });

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
  });

  it('nao emite HSTS fora de produção', () => {
    const headers = securityHeaders({
      isProduction: false,
      siteUrl: 'https://gradualinfo.com.br',
    });

    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('nao emite HSTS em localhost nem em http', () => {
    expect(
      securityHeaders({ isProduction: true, siteUrl: 'http://localhost:3000' })[
        'Strict-Transport-Security'
      ],
    ).toBeUndefined();
    expect(
      securityHeaders({
        isProduction: true,
        siteUrl: 'http://gradualinfo.com.br',
      })['Strict-Transport-Security'],
    ).toBeUndefined();
  });

  it('segue sem HSTS quando siteUrl nao e URL valida', () => {
    const headers = securityHeaders({
      isProduction: true,
      siteUrl: 'nao-e-url',
    });

    expect(headers['Strict-Transport-Security']).toBeUndefined();
    expect(headers['Content-Security-Policy']).toBeDefined();
  });
});

describe('contentSecurityPolicy', () => {
  it('some com unsafe-eval em producao', () => {
    const policy = contentSecurityPolicy(true);

    expect(policy).not.toContain('unsafe-eval');
    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://");
  });

  it('mantem unsafe-eval fora de producao, para o dev server do React', () => {
    const policy = contentSecurityPolicy(false);

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it('libera as origens do beacon do Cloudflare Web Analytics', () => {
    const policy = contentSecurityPolicy(true);

    expect(policy).toContain('https://static.cloudflareinsights.com');
    expect(policy).toContain('https://cloudflareinsights.com');
  });

  it('nao declara form-action, pela regressao do Chromium no login local', () => {
    const policy = contentSecurityPolicy(true);

    expect(policy).not.toContain('form-action');
    expect(policy).toContain("frame-ancestors 'none'");
  });
});
