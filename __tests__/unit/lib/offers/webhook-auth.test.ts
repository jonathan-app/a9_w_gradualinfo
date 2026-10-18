/**
 * @fileoverview Testes unitários para autenticação de webhooks HMAC e proteção anti-replay (Spec 0017 / Fatia 4).
 */

import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MemoryNonceCache,
  resetGlobalNonceCache,
  verifyWebhookSignature,
} from '@/lib/offers/webhook-auth';

describe('webhook-auth (HMAC-SHA256 e Anti-Replay)', () => {
  const secret = 'super-secret-collector-token-12345';
  const sampleBody = JSON.stringify({ offer_id: 'sample', price_cents: 9990 });
  let nonceCache: MemoryNonceCache;

  beforeEach(() => {
    resetGlobalNonceCache();
    nonceCache = new MemoryNonceCache();
  });

  function createSignedRequest(
    body: string,
    options: {
      timestamp?: number;
      nonce?: string;
      secretKey?: string;
      customSignature?: string;
    } = {},
  ): Request {
    const ts = options.timestamp ?? Math.floor(Date.now() / 1000);
    const nonce = options.nonce ?? 'c4a921d2-0000-4000-8000-000000000001';
    const key = options.secretKey ?? secret;

    const signature =
      options.customSignature ??
      `v1=${createHmac('sha256', key)
        .update(`v1:${ts}:${nonce}:${body}`, 'utf8')
        .digest('hex')}`;

    return new Request(
      'https://gradualinfo.com.br/api/admin/ofertas/123/avaliar-selo',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gradualinfo-signature': signature,
          'x-gradualinfo-timestamp': String(ts),
          'x-gradualinfo-nonce': nonce,
        },
        body,
      },
    );
  }

  it('autentica com sucesso requisição com assinatura HMAC válida e nonce fresco', async () => {
    const req = createSignedRequest(sampleBody);
    const result = await verifyWebhookSignature(req, sampleBody, {
      secret,
      nonceCache,
    });

    expect(result.valid).toBe(true);
    expect(result.actorId).toBe('signed_webhook:c4a921d2');
  });

  it('rejeita com missing_webhook_headers se qualquer cabeçalho obrigatório faltar', async () => {
    const req = new Request('https://gradualinfo.com.br/api', {
      method: 'POST',
      body: sampleBody,
    });
    const result = await verifyWebhookSignature(req, sampleBody, { secret });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_webhook_headers');
  });

  it('rejeita timestamp defasado além da janela de 300 segundos', async () => {
    const now = 1_700_000_000;
    const oldTimestamp = now - 301; // 301s no passado

    const req = createSignedRequest(sampleBody, { timestamp: oldTimestamp });
    const result = await verifyWebhookSignature(req, sampleBody, {
      secret,
      nowSeconds: now,
      nonceCache,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('webhook_timestamp_out_of_window');
  });

  it('rejeita com replay_detected quando o mesmo nonce é reutilizado dentro da janela', async () => {
    const now = 1_700_000_000;
    const nonce = 'replayed-nonce-uuid-1234';

    const req1 = createSignedRequest(sampleBody, { timestamp: now, nonce });
    const res1 = await verifyWebhookSignature(req1, sampleBody, {
      secret,
      nowSeconds: now,
      nonceCache,
    });
    expect(res1.valid).toBe(true);

    // Segunda tentativa idêntica com o mesmo nonce
    const req2 = createSignedRequest(sampleBody, { timestamp: now, nonce });
    const res2 = await verifyWebhookSignature(req2, sampleBody, {
      secret,
      nowSeconds: now,
      nonceCache,
    });
    expect(res2.valid).toBe(false);
    expect(res2.reason).toBe('webhook_nonce_replay_detected');
  });

  it('rejeita assinatura adulterada ou computada com segredo incorreto', async () => {
    const reqWrongSecret = createSignedRequest(sampleBody, {
      secretKey: 'wrong-key-attacker',
      nonce: 'nonce-for-wrong-secret',
    });
    const resultWrongSecret = await verifyWebhookSignature(
      reqWrongSecret,
      sampleBody,
      {
        secret,
        nonceCache,
      },
    );
    expect(resultWrongSecret.valid).toBe(false);
    expect(resultWrongSecret.reason).toBe('invalid_webhook_signature');

    const reqTamperedSignature = createSignedRequest(sampleBody, {
      nonce: 'nonce-for-tampered-signature',
      customSignature:
        'v1=0000000000000000000000000000000000000000000000000000000000000000',
    });
    const resultTampered = await verifyWebhookSignature(
      reqTamperedSignature,
      sampleBody,
      {
        secret,
        nonceCache,
      },
    );
    expect(resultTampered.valid).toBe(false);
    expect(resultTampered.reason).toBe('invalid_webhook_signature');
  });

  it('varre e limpa nonces expirados no MemoryNonceCache', () => {
    const cache = new MemoryNonceCache();
    cache.consume('nonce-1', 100);
    cache.consume('nonce-2', 200);

    expect(cache.size()).toBe(2);

    // Sweep em t = 150 remove nonce-1 (exp = 100 <= 150) e mantém nonce-2 (exp = 200)
    cache.sweep(150);
    expect(cache.size()).toBe(1);

    cache.sweep(250);
    expect(cache.size()).toBe(0);
  });

  it('executa auto-sweep automático em consume() quando o intervalo de 60s é ultrapassado', () => {
    const cache = new MemoryNonceCache();
    cache.consume('nonce-a', 100, 10);
    cache.consume('nonce-b', 150, 20);
    expect(cache.size()).toBe(2);

    // Nova chamada em t=85 (> 60s após t=10): deve acionar sweep automático em t=85, expurgando nonce-a (< 100)
    // Se t=110, nonce-a (100) expirou
    cache.consume('nonce-c', 300, 110);
    // nonce-a expirou (100 <= 110), nonce-b (150 > 110) e nonce-c (300 > 110) permanecem
    expect(cache.size()).toBe(2);
  });

  it('descarta chaves mais antigas quando atinge maxEntries para impedir memory leak', () => {
    const cache = new MemoryNonceCache(3);
    cache.consume('n1', 1000, 10);
    cache.consume('n2', 1000, 10);
    cache.consume('n3', 1000, 10);
    expect(cache.size()).toBe(3);

    // Inserir 4ª entrada com teto 3 deve remover a mais antiga (n1)
    cache.consume('n4', 1000, 10);
    expect(cache.size()).toBe(3);

    // n1 foi descartada, logo n1 pode ser consumida novamente
    const canReconsumeN1 = cache.consume('n1', 1000, 10);
    expect(canReconsumeN1).toBe(true);
  });
});
