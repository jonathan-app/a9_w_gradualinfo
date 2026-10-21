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
  it('reproduz o exemplo normativo de serialização e ordenação das seções 3.2.2 e 3.2.3', () => {
    const input = JSON.parse(
      String.raw`{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],"string":"\u20ac$\u000F\u000aA'\u0042\u0022\u005c\\\"\/","literals":[null,true,false]}`,
    );

    expect(canonicalizeJson(input)).toBe(
      String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`,
    );
  });

  it('reproduz o vetor normativo de ordenação UTF-16 da seção 3.2.3', () => {
    const input = {
      '€': 'Euro Sign',
      '\r': 'Carriage Return',
      דּ: 'Hebrew Letter Dalet With Dagesh',
      '1': 'One',
      '😀': 'Emoji: Grinning Face',
      '\u0080': 'Control',
      ö: 'Latin Small Letter O With Diaeresis',
    };

    expect(canonicalizeJson(input)).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
  });

  it.each([
    ['0000000000000000', '0'],
    ['8000000000000000', '0'],
    ['0000000000000001', '5e-324'],
    ['8000000000000001', '-5e-324'],
    ['7fefffffffffffff', '1.7976931348623157e+308'],
    ['ffefffffffffffff', '-1.7976931348623157e+308'],
    ['4340000000000000', '9007199254740992'],
    ['c340000000000000', '-9007199254740992'],
    ['4430000000000000', '295147905179352830000'],
    ['44b52d02c7e14af5', '9.999999999999997e+22'],
    ['44b52d02c7e14af6', '1e+23'],
    ['44b52d02c7e14af7', '1.0000000000000001e+23'],
    ['444b1ae4d6e2ef4e', '999999999999999700000'],
    ['444b1ae4d6e2ef4f', '999999999999999900000'],
    ['444b1ae4d6e2ef50', '1e+21'],
    ['3eb0c6f7a0b5ed8c', '9.999999999999997e-7'],
    ['3eb0c6f7a0b5ed8d', '0.000001'],
    ['41b3de4355555553', '333333333.3333332'],
    ['41b3de4355555554', '333333333.33333325'],
    ['41b3de4355555555', '333333333.3333333'],
    ['41b3de4355555556', '333333333.3333334'],
    ['41b3de4355555557', '333333333.33333343'],
    ['becbf647612f3696', '-0.0000033333333333333333'],
    ['43143ff3c1cb0959', '1424953923781206.2'],
  ])('reproduz o vetor numérico %s do Apêndice B', (hex, expected) => {
    const bytes = Uint8Array.from(hex.match(/../g)!, (byte) =>
      Number.parseInt(byte, 16),
    );
    const value = new DataView(bytes.buffer).getFloat64(0, false);

    expect(canonicalizeJson(value)).toBe(expected);
  });

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
    expect(() => canonicalizeJson(1n)).toThrow(InvalidEvidenceFormatError);
  });

  it('rejeita surrogates UTF-16 isolados em valores e nomes de propriedade', () => {
    expect(() => canonicalizeJson('\ud800')).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson('\udfff')).toThrow(
      InvalidEvidenceFormatError,
    );
    expect(() => canonicalizeJson({ ['chave\ud800']: true })).toThrow(
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

  it('rejeita arrays esparsos (lacunas de índice)', () => {
    const sparse = new Array(2);
    sparse[1] = 1;
    expect(() => canonicalizeJson(sparse)).toThrow(InvalidEvidenceFormatError);
    expect(() => canonicalizeJson(sparse)).toThrow(
      'Arrays esparsos são proibidos',
    );
  });

  it('rejeita arrays com lacuna intermediária', () => {
    const arr = [1, 2];
    arr[4] = 5; // Cria lacuna nos índices 2 e 3
    expect(() => canonicalizeJson(arr)).toThrow(InvalidEvidenceFormatError);
    expect(() => canonicalizeJson(arr)).toThrow(
      'Arrays esparsos são proibidos',
    );
  });

  it('aceita arrays densos com null explícito', () => {
    const arr = [1, null, 3];
    expect(canonicalizeJson(arr)).toBe('[1,null,3]');
  });

  it('aceita arrays densos válidos sem alterar canonicalização', () => {
    const arr = [3, 2, 1];
    expect(canonicalizeJson(arr)).toBe('[3,2,1]');
    const nested = { a: [1, 2], b: [4, 5] };
    expect(canonicalizeJson(nested)).toBe('{"a":[1,2],"b":[4,5]}');
  });
});
