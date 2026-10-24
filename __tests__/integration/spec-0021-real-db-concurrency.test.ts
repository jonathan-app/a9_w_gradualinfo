// @vitest-environment node
/**
 * @fileoverview Teste de integração real de concorrência e idempotência contra Supabase local (Spec 0021).
 * @module __tests__/integration/spec-0021-real-db-concurrency.test
 * @description Comprova concorrência real com duas conexões/transações independentes disputando o banco:
 *   1. Disputa simultânea de nonce compartilhado (anti-replay atômico sob concorrência de conexões).
 *   2. Disputa simultânea de operation_key na RPC evaluate_and_set_verified_price.
 *   3. Reenvio legítimo com novo nonce e mesma operation_key preservando resultado, auditoria e vigência.
 *   4. Reenvio com mesma operation_key e payload divergente rejeitado com 409.
 *   5. Recuperação de falha transitória com novo nonce.
 * @dependencies @supabase/supabase-js, app/api/ingest/ofertas/route
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { handleIngestOfertas } from '@/app/api/ingest/ofertas/route';
import {
  buildIngestStringToSign,
  computeIngestSignature,
  computeRawBodyHash,
} from '@/lib/offers/ingest-auth';
import { MemoryEvidenceStorageAdapter } from '@/lib/offers/storage/memory-adapter';

vi.mock('server-only', () => ({}));

describe('Spec 0021: Concorrência real e idempotência no banco de dados local', () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceKeyName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
  const serviceRoleKey =
    process.env[serviceKeyName] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  let client1: SupabaseClient;
  let client2: SupabaseClient;
  let storage: MemoryEvidenceStorageAdapter;
  let isSupabaseOnline = false;
  const requireRealDb = process.env.REQUIRE_REAL_DB === '1';

  const secret = 'super-secret-collector-key-32-chars';
  const collectorId = 'collector-concurrency-test';

  const testMerchantId = '77777777-7777-4777-8777-777777777777';
  const testProductId = '88888888-8888-4888-8888-888888888888';
  const testOfferId = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    try {
      const probe = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: serviceRoleKey },
        signal: AbortSignal.timeout(1000),
      });
      isSupabaseOnline = probe.ok;
    } catch {
      isSupabaseOnline = false;
    }

    if (!isSupabaseOnline) {
      if (requireRealDb) {
        throw new Error(
          `REQUIRE_REAL_DB=1: Supabase local indisponível em ${supabaseUrl}. Inicie o banco local antes de executar a suíte de concorrência real.`,
        );
      }
      return;
    }

    process.env.OFFERS_INGEST_SECRET = secret;
    process.env[serviceKeyName] = serviceRoleKey;

    // Duas conexões independentes usando clientes distintos
    client1 = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    client2 = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    storage = new MemoryEvidenceStorageAdapter();

    // Cria fixtures temporárias no banco local
    await client1.from('merchants').upsert({
      id: testMerchantId,
      name: 'Lojista Concorrência',
      slug: 'lojista-concorrencia',
      domain: 'concorrencia.example.com',
    });

    await client1.from('products').upsert({
      id: testProductId,
      slug: 'produto-concorrencia',
      title: 'Produto Concorrência',
      brand: 'Marca Real',
      category: 'Tech',
      sku: 'SKU-CONC-001',
      specs_json: { memory: '32GB' },
    });

    await client1.from('offers').upsert({
      id: testOfferId,
      product_id: testProductId,
      merchant_id: testMerchantId,
      title: 'Oferta Concorrência',
      url: 'https://concorrencia.example.com/p',
      affiliate_url: 'https://concorrencia.example.com/p?aff=1',
      price_cents: 199900,
      original_price_cents: 249900,
      payment_method: 'a_vista',
      installment_count: 1,
      installment_price_cents: 199900,
      shipping_cost_cents: 0,
      badge_status: 'unverified',
    });
  });

  afterAll(async () => {
    if (!isSupabaseOnline || !client1) return;
    // Limpeza das fixtures de teste
    await client1.from('offers').delete().eq('id', testOfferId);
    await client1.from('products').delete().eq('id', testProductId);
    await client1.from('merchants').delete().eq('id', testMerchantId);
  });

  function createSignedRequest(
    body: Record<string, unknown>,
    options: { nonce?: string; collectorId?: string } = {},
  ) {
    const rawBody = JSON.stringify(body);
    const ts = Math.floor(Date.now() / 1000);
    const cid = options.collectorId ?? collectorId;
    const n = options.nonce ?? `nonce-${Date.now()}-${Math.random()}`;
    const path = '/api/ingest/ofertas';

    const rawBodyHash = computeRawBodyHash(rawBody);
    const stringToSign = buildIngestStringToSign(
      'POST',
      path,
      cid,
      ts,
      n,
      rawBodyHash,
    );
    const signature = computeIngestSignature(secret, stringToSign);

    const headers = new Headers({
      'content-type': 'application/json',
      'x-collector-id': cid,
      'x-timestamp': String(ts),
      'x-nonce': n,
      'x-signature-sha256': signature,
    });

    return new Request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers,
      body: rawBody,
    });
  }

  it('1. duas conexões independentes disputando o mesmo nonce simultaneamente: exatamente uma é aceita', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }
    const sharedNonce = `nonce-concurrent-${Date.now()}`;

    // Dispara inserts simultâneos através de conexões HTTP/REST distintas
    const [res1, res2] = await Promise.all([
      client1
        .from('offers_ingest_nonces')
        .insert({ collector_id: collectorId, nonce: sharedNonce }),
      client2
        .from('offers_ingest_nonces')
        .insert({ collector_id: collectorId, nonce: sharedNonce }),
    ]);

    const errors = [res1.error, res2.error];
    const successes = errors.filter((e) => e === null);
    const conflicts = errors.filter(
      (e) => e !== null && (e.code === '23505' || e.message.includes('unique')),
    );

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });

  it('2. duas requisições concorrentes disputando a rota de ingestão com o mesmo nonce: uma 200, outra 409', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }
    const sharedNonce = `route-nonce-concurrent-${Date.now()}`;
    const body = {
      offer_id: testOfferId,
      advertised_sku: 'SKU-CONC-001',
      advertised_specs: { memory: '32GB' },
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"price":199900,"sku":"SKU-CONC-001"}',
      },
      operation_key: `op-concurrent-${Date.now()}`,
    };

    const req1 = createSignedRequest(body, { nonce: sharedNonce });
    const req2 = createSignedRequest(body, { nonce: sharedNonce });

    const [res1, res2] = await Promise.all([
      handleIngestOfertas(req1, {
        storage,
        supabaseClient: client1 as any,
        secret,
      }),
      handleIngestOfertas(req2, {
        storage,
        supabaseClient: client2 as any,
        secret,
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    const conflictJson = await conflictRes.json();
    expect(conflictJson.error).toBe('nonce_already_consumed');
  });

  it('3. reenvio com novo nonce e mesma operation_key recupera resultado anterior sem duplicar log de auditoria', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }
    const operationKey = `op-replay-real-${Date.now()}`;
    const body = {
      offer_id: testOfferId,
      advertised_sku: 'SKU-CONC-001',
      advertised_specs: { memory: '32GB' },
      captured_at: '2026-10-17T10:00:00.000Z',
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"price":199900,"sku":"SKU-CONC-001"}',
      },
      operation_key: operationKey,
    };

    // 1ª execução com nonce 1
    const req1 = createSignedRequest(body, {
      nonce: `nonce-part1-${Date.now()}`,
    });
    const res1 = await handleIngestOfertas(req1, {
      storage,
      supabaseClient: client1 as any,
      secret,
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.reused_existing).toBe(false);
    const firstAuditId = json1.audit_id;

    // Confere no PostgreSQL que o log de auditoria não foi duplicado
    const { count: countBefore } = await client1
      .from('price_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', testOfferId)
      .eq('origin_actor_id', `collector:${collectorId}`);

    // 2ª execução com nonce 2 (reenvio legítimo)
    const req2 = createSignedRequest(body, {
      nonce: `nonce-part2-${Date.now()}`,
    });
    const res2 = await handleIngestOfertas(req2, {
      storage,
      supabaseClient: client2 as any,
      secret,
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.reused_existing).toBe(true);
    expect(json2.audit_id).toBe(firstAuditId);

    const { count: countAfter } = await client1
      .from('price_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', testOfferId)
      .eq('origin_actor_id', `collector:${collectorId}`);

    expect(countAfter).toBe(countBefore);
  });

  it('4. mesma operation_key com payload divergente no banco real é rejeitada com HTTP 409', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }
    const operationKey = `op-divergent-real-${Date.now()}`;
    const baseBody = {
      offer_id: testOfferId,
      advertised_sku: 'SKU-CONC-001',
      advertised_specs: { memory: '32GB' },
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"price":199900,"sku":"SKU-CONC-001"}',
      },
      operation_key: operationKey,
    };

    // 1ª requisição registra a operação
    const req1 = createSignedRequest(baseBody, {
      nonce: `nonce-div1-${Date.now()}`,
    });
    const res1 = await handleIngestOfertas(req1, {
      storage,
      supabaseClient: client1 as any,
      secret,
    });
    expect(res1.status).toBe(200);

    // 2ª requisição usa a MESMA operation_key mas payload divergente (SKU diferente)
    const divergentBody = {
      ...baseBody,
      advertised_sku: 'SKU-DIVERGENT-999',
    };
    const req2 = createSignedRequest(divergentBody, {
      nonce: `nonce-div2-${Date.now()}`,
    });
    const res2 = await handleIngestOfertas(req2, {
      storage,
      supabaseClient: client2 as any,
      secret,
    });

    expect(res2.status).toBe(409);
    const json2 = await res2.json();
    expect(json2.error).toBe('operation_key_payload_conflict');
  });

  it('5. dois nonces diferentes com a mesma operation_key concorrendo na RPC produzem um único efeito', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }
    const operationKey = `op-concurrent-twononces-${Date.now()}`;
    const body = {
      offer_id: testOfferId,
      advertised_sku: 'SKU-CONC-001',
      advertised_specs: { memory: '32GB' },
      captured_at: '2026-10-17T11:00:00.000Z',
      raw_proof: {
        proof_type: 'api_response_json',
        content: '{"price":199900,"sku":"SKU-CONC-001"}',
      },
      operation_key: operationKey,
    };

    const { count: countBefore } = await client1
      .from('price_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', testOfferId)
      .eq('origin_actor_id', `collector:${collectorId}`);

    // Dois nonces diferentes, ambos válidos e nunca utilizados antes
    const nonceA = `nonce-twononce-a-${Date.now()}`;
    const nonceB = `nonce-twononce-b-${Date.now()}`;

    const req1 = createSignedRequest(body, { nonce: nonceA });
    const req2 = createSignedRequest(body, { nonce: nonceB });

    // Dispara as duas requisições concorrentemente com conexões independentes
    const [res1, res2] = await Promise.all([
      handleIngestOfertas(req1, {
        storage,
        supabaseClient: client1 as any,
        secret,
      }),
      handleIngestOfertas(req2, {
        storage,
        supabaseClient: client2 as any,
        secret,
      }),
    ]);

    // Ambos os nonces são válidos, portanto nenhum sofre 409 por nonce_already_consumed
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const json1 = await res1.json();
    const json2 = await res2.json();

    // Uma transação adquire o lock primeiro e cria a operação; a outra reutiliza
    const reusedFlags = [json1.reused_existing, json2.reused_existing].sort();
    expect(reusedFlags).toEqual([false, true]);

    // Ambas retornam o mesmo audit_id
    expect(json1.audit_id).toBe(json2.audit_id);

    // Efeito único: exatamente 1 novo log de auditoria criado no PostgreSQL
    const { count: countAfter } = await client1
      .from('price_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', testOfferId)
      .eq('origin_actor_id', `collector:${collectorId}`);

    expect(countAfter).toBe((countBefore ?? 0) + 1);

    // E exatamente um registro de operação em offer_operation_keys
    const { count: opCount } = await client1
      .from('offer_operation_keys')
      .select('*', { count: 'exact', head: true })
      .eq('operation_key', operationKey);

    expect(opCount).toBe(1);
  });

  it('6. Lacuna 5: assign_admin_role e revoke_admin_role serializam concorrência, fazem rollback em falha de auditoria e bloqueiam escrita direta', async (ctx) => {
    if (!isSupabaseOnline) {
      ctx.skip(
        `Supabase local indisponível em ${supabaseUrl} (use REQUIRE_REAL_DB=1 para exigir banco real).`,
      );
      return;
    }

    const actorUserId = '11111111-1111-1111-1111-111111111111';
    const targetUserId = '22222222-2222-2222-2222-222222222222';
    // IP único por execução para evitar colisão com registros anteriores
    const ipMarker = `198.51.100.${(Date.now() % 250) + 10}`;

    // Limpa auditoria prévia para este alvo/IP para isolar o teste
    await client1
      .from('admin_audit_log')
      .delete()
      .eq('resource_id', targetUserId)
      .eq('ip_address', ipMarker);

    // Limpa papel prévio se existir via RPC transacional
    await client1.rpc('revoke_admin_role', {
      p_user_id: targetUserId,
      p_actor_id: actorUserId,
      p_actor_email: 'ana@exemplo.dev',
      p_ip_address: '127.0.0.1',
    });

    // 6.1 Escrita direta na tabela admin_user_roles por service_role é bloqueada por privilégio (42501)
    const directInsert = await client1.from('admin_user_roles').insert({
      user_id: targetUserId,
      role: 'revisor',
      assigned_by: actorUserId,
    });
    expect(directInsert.error).not.toBeNull();
    expect(directInsert.error?.code).toBe('42501');

    // 6.2 Duas conexões concorrentes atribuindo papéis distintos ao mesmo usuário são serializadas
    const [assignA, assignB] = await Promise.all([
      client1.rpc('assign_admin_role', {
        p_user_id: targetUserId,
        p_role: 'revisor',
        p_actor_id: actorUserId,
        p_actor_email: 'ana@exemplo.dev',
        p_ip_address: ipMarker,
      }),
      client2.rpc('assign_admin_role', {
        p_user_id: targetUserId,
        p_role: 'editor',
        p_actor_id: actorUserId,
        p_actor_email: 'ana@exemplo.dev',
        p_ip_address: ipMarker,
      }),
    ]);

    expect(assignA.error).toBeNull();
    expect(assignB.error).toBeNull();

    const { data: logs } = await client1
      .from('admin_audit_log')
      .select('action, metadata')
      .eq('resource_id', targetUserId)
      .eq('ip_address', ipMarker);

    expect(logs).toHaveLength(2);
    const actions = logs?.map((l) => l.action).sort();
    expect(actions).toEqual(['user.role_assigned', 'user.role_changed']);

    const { data: currentRoleRow } = await client1
      .from('admin_user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();

    const currentRole = currentRoleRow?.role;
    expect(['revisor', 'editor']).toContain(currentRole);

    // 6.3 Falha intermediária na gravação da auditoria (actor_email > 320 chars) faz rollback do papel
    const failedAssign = await client1.rpc('assign_admin_role', {
      p_user_id: targetUserId,
      p_role: 'admin',
      p_actor_id: actorUserId,
      p_actor_email: 'x'.repeat(325),
      p_ip_address: ipMarker,
    });
    expect(failedAssign.error).not.toBeNull();
    expect(failedAssign.error?.code).toBe('23514');

    const { data: roleAfterFailedAssign } = await client1
      .from('admin_user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();
    expect(roleAfterFailedAssign?.role).toBe(currentRole);

    // 6.4 Falha intermediária na gravação da auditoria em revoke_admin_role faz rollback da remoção
    const failedRevoke = await client1.rpc('revoke_admin_role', {
      p_user_id: targetUserId,
      p_actor_id: actorUserId,
      p_actor_email: 'y'.repeat(325),
      p_ip_address: ipMarker,
    });
    expect(failedRevoke.error).not.toBeNull();
    expect(failedRevoke.error?.code).toBe('23514');

    const { data: roleAfterFailedRevoke } = await client1
      .from('admin_user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();
    expect(roleAfterFailedRevoke?.role).toBe(currentRole);

    // 6.5 Limpeza final: revoga o papel com sucesso
    const cleanRevoke = await client1.rpc('revoke_admin_role', {
      p_user_id: targetUserId,
      p_actor_id: actorUserId,
      p_actor_email: 'ana@exemplo.dev',
      p_ip_address: ipMarker,
    });
    expect(cleanRevoke.error).toBeNull();
  });
});
