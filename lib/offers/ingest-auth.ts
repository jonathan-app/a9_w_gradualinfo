/**
 * @fileoverview lib/offers/ingest-auth.ts: autenticação HMAC de coletores externos
 * @module lib/offers/ingest-auth
 * @description Implementa assinatura HMAC-SHA256 e validação defensiva em tempo constante
 *   para a rota de ingestão dedicada de coletores automatizados (Spec 0021 / AC-08).
 * @dependencies node:crypto
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyIngestSignatureParams {
  method: string;
  path: string;
  collectorId: string;
  timestampStr: string;
  nonce: string;
  rawBodyText: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  maxClockSkewSeconds?: number;
}

export interface IngestAuthResult {
  valid: boolean;
  reason?:
    | 'missing_collector_headers'
    | 'invalid_timestamp_format'
    | 'timestamp_out_of_window'
    | 'invalid_signature_format'
    | 'invalid_signature'
    | 'secret_missing';
}

/**
 * Constrói a string canônica para cálculo de assinatura HMAC conforme Spec 0021.
 * Formato: METHOD\nPATH\nCOLLECTOR_ID\nTIMESTAMP\nNONCE\nSHA256(RAW_BODY)
 */
export function buildIngestStringToSign(
  method: string,
  path: string,
  collectorId: string,
  timestamp: string | number,
  nonce: string,
  rawBodyHash: string,
): string {
  return [
    method.toUpperCase(),
    path,
    collectorId.trim(),
    String(timestamp).trim(),
    nonce.trim(),
    rawBodyHash.trim(),
  ].join('\n');
}

/**
 * Computa o hash SHA-256 do corpo textual bruto da requisição.
 */
export function computeRawBodyHash(rawBodyText: string): string {
  return createHash('sha256').update(rawBodyText, 'utf8').digest('hex');
}

/**
 * Computa a assinatura HMAC-SHA256 da string canônica com o segredo informado.
 */
export function computeIngestSignature(
  secret: string,
  stringToSign: string,
): string {
  return createHmac('sha256', secret)
    .update(stringToSign, 'utf8')
    .digest('hex');
}

/**
 * Valida a assinatura HMAC de uma requisição de coletor em tempo constante.
 * Não consome nem toca nonces: validação estritamente prévia.
 */
export function verifyIngestSignature(
  params: VerifyIngestSignatureParams,
): IngestAuthResult {
  const {
    method,
    path,
    collectorId,
    timestampStr,
    nonce,
    rawBodyText,
    signatureHeader,
    secret,
    nowSeconds = Math.floor(Date.now() / 1000),
    maxClockSkewSeconds = 300,
  } = params;

  if (
    !collectorId ||
    !timestampStr ||
    !nonce ||
    !signatureHeader ||
    collectorId.trim().length === 0 ||
    nonce.trim().length === 0
  ) {
    return { valid: false, reason: 'missing_collector_headers' };
  }

  const timestamp = Number.parseInt(timestampStr, 10);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return { valid: false, reason: 'invalid_timestamp_format' };
  }

  if (Math.abs(nowSeconds - timestamp) > maxClockSkewSeconds) {
    return { valid: false, reason: 'timestamp_out_of_window' };
  }

  if (!secret || secret.trim().length === 0) {
    return { valid: false, reason: 'secret_missing' };
  }

  const cleanSig = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7).trim()
    : signatureHeader.trim();

  if (cleanSig.length !== 64 || !/^[a-f0-9]{64}$/i.test(cleanSig)) {
    return { valid: false, reason: 'invalid_signature_format' };
  }

  const rawBodyHash = computeRawBodyHash(rawBodyText);
  const stringToSign = buildIngestStringToSign(
    method,
    path,
    collectorId,
    timestamp,
    nonce,
    rawBodyHash,
  );
  const expectedSig = computeIngestSignature(secret, stringToSign);

  const computedBuf = Buffer.from(expectedSig.toLowerCase(), 'utf8');
  const providedBuf = Buffer.from(cleanSig.toLowerCase(), 'utf8');

  if (
    computedBuf.length !== providedBuf.length ||
    !timingSafeEqual(computedBuf, providedBuf)
  ) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true };
}
