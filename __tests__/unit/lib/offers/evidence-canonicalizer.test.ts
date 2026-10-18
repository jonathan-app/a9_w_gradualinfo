/**
 * @fileoverview Testes unitários para o canonizador determinístico RFC 8785 (JCS) da Spec 0017.
 */

import { describe, expect, it } from 'vitest';
import {
  canonicalizeJson,
  digestEvidence,
  InvalidEvidenceFormatError,
  type CanonicalEvidencePayload,
} from '@/lib/offers/evidence-canonicalizer';

describe('evidence-canonicalizer (RFC 8785 / JCS)', () => {
  it('valida o Vetor 1 de ordenação de chaves e escapes exatos', () => {
    const input = {
      z: 'linha 1\nlinha 2',
      a: 100,
      'chave com espaço': 'valor',
      m: null,
    };

    const digest = digestEvidence(input);
    expect(digest.canonicalJson).toBe(
      '{"a":100,"chave com espaço":"valor","m":null,"z":"linha 1\\nlinha 2"}',
    );
    // 68 caracteres UTF-16, 69 bytes em UTF-8 estrito devido ao "ç" (0xc3 0xa7)
    expect(digest.byteSize).toBe(69);
    expect(digest.sha256).toBe(
      '6726c7fb10e76b5b98acdb09c355885e2e7867ce594f3c3afba7322bb0a2190b',
    );
    expect(digest.storagePath).toBe(
      'evidences/sha256/6726c7fb10e76b5b98acdb09c355885e2e7867ce594f3c3afba7322bb0a2190b.json',
    );
  });

  it('valida o Vetor 2 de payload real da evidência comercial da Spec 0017', () => {
    const payload: CanonicalEvidencePayload = {
      schema_version: '1.0',
      captured_at: '2026-10-14T14:30:00.000Z',
      offer: {
        id: 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329',
        product_id: 'e4d3c2b1-0000-4000-8000-000000000001',
        merchant_id: 'f5e4d3c2-0000-4000-8000-000000000002',
        merchant_domain: 'amazon.com.br',
        advertised_url: 'https://www.amazon.com.br/dp/B0CXYZ1234',
      },
      product_identity: {
        sku: 'G15-5530-A20P',
        ean: '7891234567890',
        specs: {
          processor: 'i7-13650HX',
          ram: '16GB',
          storage: '512GB SSD',
        },
      },
      commercial_terms: {
        price_cents: 549900,
        original_price_cents: 629900,
        currency: 'BRL',
        payment_method: 'a_vista',
        installment_count: 1,
        installment_price_cents: 549900,
        shipping_cost_cents: 0,
        region_code: 'SP',
        coupon_code: null,
      },
      collector: {
        origin: 'admin_aal2',
        actor_id: 'a3qua96@gmail.com',
        collector_version: '1.0.0',
      },
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"status":"in_stock","price":549900}',
      },
    };

    const digest = digestEvidence(payload);
    expect(digest.sha256).toBe(
      '2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a',
    );
    expect(digest.byteSize).toBe(882);
    expect(digest.storagePath).toBe(
      'evidences/sha256/2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a.json',
    );
  });

  it('preserva caracteres UTF-8 nativos (como acentos em pt-BR) sem sequências unicode redundantes', () => {
    const input = {
      promoção: 'Preço Verificado com Atenção à Acentuação',
    };
    const json = canonicalizeJson(input);
    expect(json).toBe(
      '{"promoção":"Preço Verificado com Atenção à Acentuação"}',
    );
  });

  it('normaliza -0 para 0 conforme IEEE-754 e RFC 8785', () => {
    const input = { valor: -0, zero: 0 };
    expect(canonicalizeJson(input)).toBe('{"valor":0,"zero":0}');
  });

  it('rejeita valores proibidos como NaN, Infinity e undefined', () => {
    expect(() => canonicalizeJson({ valor: Number.NaN })).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson({ valor: Number.POSITIVE_INFINITY })).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson({ valor: undefined })).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson(undefined)).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson(() => {})).toThrow(
      InvalidEvidenceFormatError,
    );
  });

  it('ordena recursivamente objetos aninhados e preserva ordem em arrays', () => {
    const complex = {
      b: [3, 2, 1],
      a: {
        z: 1,
        y: {
          b: 2,
          a: 1,
        },
      },
    };
    expect(canonicalizeJson(complex)).toBe(
      '{"a":{"y":{"a":1,"b":2},"z":1},"b":[3,2,1]}',
    );
  });

  it('alteração de ação solicitada (concessao vs renovacao) ou parâmetros que afetam o resultado altera o hash', () => {
    const base: CanonicalEvidencePayload = {
      schema_version: '1.0',
      action: 'concessao',
      captured_at: '2026-10-14T14:30:00.000Z',
      offer: {
        id: 'c1f7b0e1-4829-4d6e-931b-26f58f4a1329',
        product_id: 'e4d3c2b1-0000-4000-8000-000000000001',
        merchant_id: 'f5e4d3c2-0000-4000-8000-000000000002',
        merchant_domain: 'amazon.com.br',
        advertised_url: 'https://www.amazon.com.br/dp/B0CXYZ1234',
      },
      product_identity: {
        sku: 'G15-5530-A20P',
        ean: '7891234567890',
        specs: { processor: 'i7-13650HX' },
      },
      commercial_terms: {
        price_cents: 549900,
        original_price_cents: 629900,
        currency: 'BRL',
        payment_method: 'a_vista',
        installment_count: 1,
        installment_price_cents: 549900,
        shipping_cost_cents: 0,
        region_code: 'SP',
        coupon_code: null,
      },
      collector: {
        origin: 'automated_collector',
        actor_id: 'collector:spider-01',
        collector_version: '1.0.0',
      },
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"price":549900}',
      },
    };

    const hashConcessao = digestEvidence(base).sha256;
    const hashRenovacao = digestEvidence({
      ...base,
      action: 'renovacao',
    }).sha256;
    const hashRegion = digestEvidence({
      ...base,
      commercial_terms: { ...base.commercial_terms, region_code: 'RJ' },
    }).sha256;
    const hashSku = digestEvidence({
      ...base,
      product_identity: { ...base.product_identity, sku: 'G15-5530-A20P-DIFF' },
    }).sha256;

    expect(hashConcessao).not.toBe(hashRenovacao);
    expect(hashConcessao).not.toBe(hashRegion);
    expect(hashConcessao).not.toBe(hashSku);
  });
});
