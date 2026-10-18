/**
 * @fileoverview Testes unitários para a rota de redirecionamento de afiliados /api/out/[id] (Spec 0017 / Fatia 4).
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  handleOutRedirect,
  validateAffiliateUrl,
} from '@/app/api/out/[id]/route';

describe('validateAffiliateUrl', () => {
  const merchantDomain = 'amazon.com.br';

  it('aceita URL segura HTTPS no domínio exato', () => {
    const res = validateAffiliateUrl(
      'https://amazon.com.br/dp/B012345?tag=gradualinfo',
      merchantDomain,
    );
    expect(res.valid).toBe(true);
    expect(res.safeUrl).toBe(
      'https://amazon.com.br/dp/B012345?tag=gradualinfo',
    );
  });

  it('aceita URL segura HTTPS em subdomínio legítimo do lojista', () => {
    const res = validateAffiliateUrl(
      'https://loja.amazon.com.br/ofertas/especial',
      merchantDomain,
    );
    expect(res.valid).toBe(true);
    expect(res.safeUrl).toBe('https://loja.amazon.com.br/ofertas/especial');
  });

  it('rejeita protocolo inseguro http', () => {
    const res = validateAffiliateUrl(
      'http://amazon.com.br/dp/B012345',
      merchantDomain,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('insecure_protocol_requires_https');
  });

  it('rejeita URLs contendo credenciais embutidas', () => {
    const res = validateAffiliateUrl(
      'https://admin:senha@amazon.com.br/dp/B012345',
      merchantDomain,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('credentials_in_url_forbidden');
  });

  it('rejeita portas de conexão não padrão', () => {
    const res = validateAffiliateUrl(
      'https://amazon.com.br:8443/dp/B012345',
      merchantDomain,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('non_standard_port_forbidden');
  });

  it('rejeita tentativa de Open Redirect via sufixo malicioso (ex: amazon.com.br.atacante.com)', () => {
    const res = validateAffiliateUrl(
      'https://amazon.com.br.atacante.com/phishing',
      merchantDomain,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('merchant_domain_boundary_mismatch');
  });

  it('rejeita tentativa de Open Redirect via domínio hifenizado (ex: amazon-falso.com.br)', () => {
    const res = validateAffiliateUrl(
      'https://amazon-falso.com.br/golpe',
      merchantDomain,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('merchant_domain_boundary_mismatch');
  });
});

describe('handleOutRedirect', () => {
  const validUuid = 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329';

  function mockSupabase(offerData: any, error: any = null) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: offerData, error }),
          }),
        }),
      }),
    };
  }

  it('retorna 400 se o ID não for um UUIDv4 válido', async () => {
    const req = new Request('https://gradualinfo.com.br/api/out/invalid-id');
    const res = await handleOutRedirect(req, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_offer_id');
  });

  it('retorna 404 se a oferta não for encontrada no banco', async () => {
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(null, { message: 'Not found' }) },
    );
    expect(res.status).toBe(404);
  });

  it('retorna 410 Gone com HTML institucional se a oferta estiver esgotada', async () => {
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const offer = {
      id: validUuid,
      status: 'esgotada',
      affiliate_url: 'https://amazon.com.br/dp/B0123',
      merchants: { domain: 'amazon.com.br', is_active: true },
    };

    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(offer) },
    );

    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Esta oferta foi encerrada');
  });

  it('retorna 410 Gone se a oferta estiver pausada', async () => {
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const offer = {
      id: validUuid,
      status: 'pausada',
      affiliate_url: 'https://amazon.com.br/dp/B0123',
      merchants: { domain: 'amazon.com.br', is_active: true },
    };

    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(offer) },
    );

    expect(res.status).toBe(410);
  });

  it('retorna 410 Gone se o lojista parceiro estiver inativo', async () => {
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const offer = {
      id: validUuid,
      status: 'ativa',
      affiliate_url: 'https://amazon.com.br/dp/B0123',
      merchants: { domain: 'amazon.com.br', is_active: false },
    };

    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(offer) },
    );

    expect(res.status).toBe(410);
  });

  it('retorna 403 Forbidden se a URL apontar para um domínio externo adulterado', async () => {
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const offer = {
      id: validUuid,
      status: 'ativa',
      affiliate_url: 'https://atacante-site.com/malware',
      merchants: { domain: 'amazon.com.br', is_active: true },
    };

    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(offer) },
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('forbidden_redirect');
  });

  it('retorna 307 Temporary Redirect com cabeçalhos de segurança para oferta válida', async () => {
    const targetUrl = 'https://amazon.com.br/dp/B0123?tag=afiliado-gradual';
    const req = new Request(`https://gradualinfo.com.br/api/out/${validUuid}`);
    const offer = {
      id: validUuid,
      status: 'ativa',
      affiliate_url: targetUrl,
      merchants: { domain: 'amazon.com.br', is_active: true },
    };

    const res = await handleOutRedirect(
      req,
      { params: Promise.resolve({ id: validUuid }) },
      { supabaseClient: mockSupabase(offer) },
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(targetUrl);
    expect(res.headers.get('cache-control')).toBe(
      'private, no-store, max-age=0',
    );
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(res.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    );
  });
});
