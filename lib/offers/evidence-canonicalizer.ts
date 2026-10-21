/**
 * @fileoverview lib/offers/evidence-canonicalizer.ts — canonização determinística RFC 8785 (JCS)
 * @module lib/offers/evidence-canonicalizer
 * @description Implementa a serialização canônica pura compatível com RFC 8785 (JSON Canonicalization Scheme)
 *   e o cálculo estável de resumo criptográfico SHA-256 para evidências comerciais da Spec 0017 (Fatia 4).
 * @dependencies node:crypto
 */

import { createHash } from 'node:crypto';

export class InvalidEvidenceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEvidenceFormatError';
  }
}

/**
 * Interface canônica do payload da evidência (Schema 1.0).
 */
export interface CanonicalEvidencePayload {
  schema_version: '1.0';
  action?: 'concessao' | 'renovacao';
  captured_at: string; // ISO 8601 UTC
  offer: {
    id: string;
    product_id: string;
    merchant_id: string;
    merchant_domain: string;
    advertised_url: string;
  };
  product_identity: {
    sku: string;
    ean: string | null;
    specs: Record<string, unknown>;
  };
  commercial_terms: {
    price_cents: number;
    original_price_cents: number | null;
    currency: 'BRL';
    payment_method: 'a_vista' | 'parcelado' | 'pix' | 'cartao';
    installment_count: number;
    installment_price_cents: number;
    shipping_cost_cents: number;
    region_code: string | null;
    coupon_code: string | null;
  };
  collector: {
    origin: 'admin_aal2' | 'signed_webhook' | 'automated_collector';
    actor_id: string;
    collector_version: string;
  };
  raw_proof: {
    proof_type: 'api_response_json' | 'selector_text_extract';
    content: string;
  };
}

/**
 * Escapa uma string estritamente conforme a RFC 8785 (Seção 3.2.2.2).
 * Apenas aspas duplas (\"), barra invertida (\\) e caracteres de controle (U+0000 até U+001F)
 * são escapados. Caracteres Unicode normais (como acentuação portuguesa) permanecem nativos em UTF-8.
 *
 * @param str - String a ser escapada.
 * @returns Representação JSON canônica da string incluindo as aspas delimitadoras.
 */
function serializeString(str: string): string {
  for (let index = 0; index < str.length; index += 1) {
    const codeUnit = str.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = str.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index += 1;
        continue;
      }
      throw new InvalidEvidenceFormatError(
        'String contém surrogate UTF-16 isolado, proibido pela RFC 8785.',
      );
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new InvalidEvidenceFormatError(
        'String contém surrogate UTF-16 isolado, proibido pela RFC 8785.',
      );
    }
  }
  // ECMAScript JSON.stringify atende rigorosamente à especificação de escape RFC 8785
  return JSON.stringify(str);
}

/**
 * Formata um número conforme a especificação ES6 / IEEE-754 / RFC 8785 (Seção 3.2.2.3).
 * Garante que -0 seja normalizado para 0, e rejeita NaN ou Infinity.
 *
 * @param num - Número a ser formatado.
 * @returns Representação textual canônica do número.
 */
function serializeNumber(num: number): string {
  if (!Number.isFinite(num)) {
    throw new InvalidEvidenceFormatError(
      `Número não finito detectado no payload canônico: ${num}`,
    );
  }
  if (Object.is(num, -0)) {
    return '0';
  }
  return JSON.stringify(num);
}

/**
 * Serializa deterministicamente qualquer valor conforme RFC 8785 (JCS).
 *
 * @param value - Valor arbitrário (objeto, array, primitivo).
 * @returns String JSON canônica sem espaços em branco fora de strings e chaves ordenadas por UTF-16 code units.
 */
export function canonicalizeJson(value: unknown): string {
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    throw new InvalidEvidenceFormatError(
      `Tipo de dado proibido na canonização RFC 8785: ${typeof value}`,
    );
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return serializeNumber(value);
  }

  if (typeof value === 'string') {
    return serializeString(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new InvalidEvidenceFormatError(
          'Arrays esparsos são proibidos na canonização RFC 8785.',
        );
      }
    }
    const serializedItems = value.map((item) => canonicalizeJson(item));
    return `[${serializedItems.join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // RFC 8785 Seção 3.2.3: Chaves ordenadas lexicograficamente pela sequência de code units UTF-16
    const sortedKeys = Object.keys(obj).sort();
    const serializedPairs = sortedKeys.map((key) => {
      const propValue = obj[key];
      if (propValue === undefined) {
        throw new InvalidEvidenceFormatError(
          `Propriedade com valor undefined encontrada na chave: ${key}. Campos vazios devem ser explicitamente nulos.`,
        );
      }
      return `${serializeString(key)}:${canonicalizeJson(propValue)}`;
    });
    return `{${serializedPairs.join(',')}}`;
  }

  throw new InvalidEvidenceFormatError(
    `Tipo não serializável na RFC 8785: ${typeof value}`,
  );
}

/**
 * Resultado do cálculo criptográfico da evidência canônica.
 */
export interface CanonicalEvidenceDigest {
  canonicalJson: string;
  canonicalBytes: Uint8Array;
  byteSize: number;
  sha256: string;
  storagePath: string;
}

/**
 * Canoniza uma evidência e calcula seu resumo SHA-256 e bytes UTF-8 estritos.
 *
 * @param payload - Objeto com os dados estruturados da evidência.
 * @returns Resumo criptográfico determinístico e caminho de storage padronizado.
 */
export function digestEvidence(payload: unknown): CanonicalEvidenceDigest {
  const canonicalJson = canonicalizeJson(payload);
  const canonicalBytes = Buffer.from(canonicalJson, 'utf8');
  const sha256 = createHash('sha256').update(canonicalBytes).digest('hex');
  const byteSize = canonicalBytes.length;
  const storagePath = `evidences/sha256/${sha256}.json`;

  return {
    canonicalJson,
    canonicalBytes,
    byteSize,
    sha256,
    storagePath,
  };
}
