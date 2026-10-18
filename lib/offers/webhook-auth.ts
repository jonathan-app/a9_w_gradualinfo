/**
 * @fileoverview lib/offers/webhook-auth.ts — autenticação e anti-replay para webhooks de coletores
 * @module lib/offers/webhook-auth
 * @description Implementa a verificação de assinatura HMAC-SHA256, janela temporal de 300s e
 *   cache de nonces para mitigar ataques de replay na ingestão automatizada de ofertas (Spec 0017 / Fatia 4).
 * @dependencies node:crypto
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cache em memória de nonces para mitigação de replay em ambiente monoprocesso / testes locais.
 * Dívida técnica consciente: em ambiente distribuído multi-edge de produção,
 * este cache deve ser substituído por Cloudflare KV, Durable Objects ou tabela no PostgreSQL.
 */
export class MemoryNonceCache {
  private readonly nonces = new Map<string, number>();
  private lastSweepSeconds = 0;
  private readonly maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Consome um nonce atômico. Retorna true se era inédito e foi registrado;
   * retorna false se já existia (ataque de repetição/replay).
   *
   * @param nonce - Identificador único da requisição.
   * @param expiresAtSeconds - Timestamp de expiração do registro.
   * @param nowSeconds - Timestamp de referência atual (default: agora).
   */
  public consume(
    nonce: string,
    expiresAtSeconds: number,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): boolean {
    // Limpeza automática periódica (a cada 60s ou quando atingir o teto)
    if (
      nowSeconds - this.lastSweepSeconds > 60 ||
      this.nonces.size >= this.maxEntries
    ) {
      this.sweep(nowSeconds);
      this.lastSweepSeconds = nowSeconds;
    }

    const existing = this.nonces.get(nonce);

    if (existing && existing > nowSeconds) {
      return false; // Replay detectado
    }

    // Se ainda atingir o teto após o sweep, remove a chave mais antiga (FIFO)
    if (this.nonces.size >= this.maxEntries) {
      const oldestKey = this.nonces.keys().next().value;
      if (oldestKey) {
        this.nonces.delete(oldestKey);
      }
    }

    this.nonces.set(nonce, expiresAtSeconds);
    return true;
  }

  /**
   * Remove nonces cujo período de retenção já expirou.
   */
  public sweep(nowSeconds = Math.floor(Date.now() / 1000)): void {
    for (const [nonce, exp] of this.nonces.entries()) {
      if (exp <= nowSeconds) {
        this.nonces.delete(nonce);
      }
    }
  }

  /**
   * Limpa todo o cache (para testes limpos).
   */
  public clear(): void {
    this.nonces.clear();
    this.lastSweepSeconds = 0;
  }

  /**
   * Quantidade de nonces atualmente retidos.
   */
  public size(): number {
    return this.nonces.size;
  }
}

let globalNonceCacheInstance: MemoryNonceCache | null = null;

export function getGlobalNonceCache(): MemoryNonceCache {
  if (!globalNonceCacheInstance) {
    globalNonceCacheInstance = new MemoryNonceCache();
  }
  return globalNonceCacheInstance;
}

export function resetGlobalNonceCache(): void {
  if (globalNonceCacheInstance) {
    globalNonceCacheInstance.clear();
  }
}

export interface WebhookAuthResult {
  valid: boolean;
  reason?:
    | 'missing_webhook_headers'
    | 'invalid_timestamp_format'
    | 'webhook_timestamp_out_of_window'
    | 'webhook_nonce_replay_detected'
    | 'invalid_webhook_signature'
    | 'webhook_secret_missing';
  actorId?: string;
}

export interface VerifyWebhookOptions {
  secret?: string;
  nonceCache?: MemoryNonceCache;
  nowSeconds?: number;
  maxClockSkewSeconds?: number;
}

/**
 * Valida a autenticidade, integridade e frescor de uma requisição de webhook.
 *
 * @param request - Requisição HTTP recebida.
 * @param rawBodyText - Corpo textual bruto exato recebido na requisição.
 * @param options - Configurações opcionais de injeção de dependências e tempo.
 * @returns Resultado da validação com status e identificador do ator.
 */
export async function verifyWebhookSignature(
  request: Request,
  rawBodyText: string,
  options: VerifyWebhookOptions = {},
): Promise<WebhookAuthResult> {
  const signatureHeader = request.headers.get('x-gradualinfo-signature');
  const timestampHeader = request.headers.get('x-gradualinfo-timestamp');
  const nonceHeader = request.headers.get('x-gradualinfo-nonce');

  if (!signatureHeader || !timestampHeader || !nonceHeader) {
    return { valid: false, reason: 'missing_webhook_headers' };
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return { valid: false, reason: 'invalid_timestamp_format' };
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxClockSkew = options.maxClockSkewSeconds ?? 300; // 5 minutos padrão

  if (Math.abs(now - timestamp) > maxClockSkew) {
    return { valid: false, reason: 'webhook_timestamp_out_of_window' };
  }

  const secret = options.secret ?? process.env.OFFERS_WEBHOOK_SECRET;
  if (!secret || secret.trim().length === 0) {
    return { valid: false, reason: 'webhook_secret_missing' };
  }

  // Verifica e consome o nonce no cache anti-replay
  const cache = options.nonceCache ?? getGlobalNonceCache();
  const nonceExpiresAt = timestamp + maxClockSkew + 60; // 1 minuto de margem após a janela
  const isNonceFresh = cache.consume(nonceHeader, nonceExpiresAt, now);

  if (!isNonceFresh) {
    return { valid: false, reason: 'webhook_nonce_replay_detected' };
  }

  // Computa a assinatura HMAC esperada sobre o padrão: "v1:<timestamp>:<nonce>:<rawBody>"
  const expectedPayload = `v1:${timestamp}:${nonceHeader}:${rawBodyText}`;
  const computedHex = createHmac('sha256', secret)
    .update(expectedPayload, 'utf8')
    .digest('hex');

  // O header segue o padrão "v1=<hex_sha256>" ou simplesmente o hex direto
  const cleanSignature = signatureHeader.startsWith('v1=')
    ? signatureHeader.slice(3).trim()
    : signatureHeader.trim();

  if (cleanSignature.length !== 64 || !/^[a-f0-9]{64}$/i.test(cleanSignature)) {
    return { valid: false, reason: 'invalid_webhook_signature' };
  }

  // Comparação segura em tempo constante contra timing attacks
  const computedBuf = Buffer.from(computedHex.toLowerCase(), 'utf8');
  const providedBuf = Buffer.from(cleanSignature.toLowerCase(), 'utf8');

  if (
    computedBuf.length !== providedBuf.length ||
    !timingSafeEqual(computedBuf, providedBuf)
  ) {
    return { valid: false, reason: 'invalid_webhook_signature' };
  }

  return {
    valid: true,
    actorId: `signed_webhook:${nonceHeader.slice(0, 8)}`,
  };
}
