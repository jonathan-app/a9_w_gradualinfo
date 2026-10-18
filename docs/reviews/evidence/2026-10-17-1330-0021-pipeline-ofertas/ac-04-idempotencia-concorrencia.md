# Evidência AC-04: Idempotência transacional, concorrência e conflito 409

**AC**: ofertas-pipeline/AC-04  
**Status**: PASS (concorrência real e idempotência comprovadas no banco local)  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4, Supabase local 127.0.0.1:54321  

## O que foi verificado (PASS)

1. **`supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql`**:
   - Tabela `public.offer_operation_keys` com `operation_key` como chave primária.
   - RPC `evaluate_and_set_verified_price` com duplo bloqueio: consulta inicial com `FOR SHARE`, lock de serialização na linha da oferta com `SELECT id FROM public.offers WHERE id = p_offer_id FOR UPDATE`, e re-verificação imediata (`SELECT ... FROM public.offer_operation_keys ... FOR SHARE`) pós-lock para garantir que transações concorrentes simultâneas com nonces distintos reaproveitem a operação sem duplicar auditoria nem vigência.
   - Detecção de payload divergente via `IF v_existing_op.evidence_hash <> p_evidence_hash THEN RAISE EXCEPTION 'operation_key_payload_conflict' USING ERRCODE = '23505';` mapeada para HTTP 409.
2. **Concorrência real no banco de dados (`__tests__/integration/spec-0021-real-db-concurrency.test.ts`)**:
   - Concorrência de nonces compartilhados: duas conexões simultâneas disputando o mesmo nonce (uma 200, outra 409 `nonce_already_consumed`).
   - **Concorrência de nonces distintos com a mesma `operation_key`**: dois nonces válidos e inéditos enviados simultaneamente via `Promise.all` em duas conexões independentes do PostgreSQL (`client1` e `client2`). Ambos retornam HTTP 200, um com `reused_existing: false` e outro com `reused_existing: true`, com exatamente um único registro gravado em `price_audit_logs` e um em `offer_operation_keys`.
   - Reenvio sequencial legítimo com novo nonce e mesma `operation_key`: preserva `audit_id`, não duplica log e não renova vigência.
   - Mesma `operation_key` com payload divergente (SKU/especificação alterada): rejeição estrita com HTTP 409 `operation_key_payload_conflict`.
3. **Inclusão de todos os parâmetros que alteram a operação no hash canônico**:
   - `CanonicalEvidencePayload` em `lib/offers/evidence-canonicalizer.ts` incorpora `action` (`concessao` vs `renovacao`), `advertised_sku`, `advertised_ean`, `specs`, `region_code`, `raw_proof`, além de todos os dados comerciais e temporais.
   - Teste unitário em `__tests__/unit/lib/offers/evidence-canonicalizer.test.ts` comprova que alternar `action`, `region_code` ou `sku` modifica deterministicamente o SHA-256 da evidência, forçando conflito 409 em caso de divergência de qualquer parâmetro mutante da operação.
4. **Esclarecimento de integração HTTP**:
   - Os testes de integração cobrem a execução do handler de rota `handleIngestOfertas` consumindo objetos nativos `Request` e disparando conexões de rede reais contra o PostgreSQL do Supabase local.
   - Requisições pelo entrypoint HTTP de rede ativo do Worker Cloudflare/OpenNext exigem a execução do daemon (`opennextjs-cloudflare preview` ou `wrangler dev`), sendo cobertas em suíte E2E sob ambiente completo.

## Código relevante

- `supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql`
- `supabase/tests/database/offers_ingest_idempotencia.test.sql`
- `__tests__/integration/spec-0021-real-db-concurrency.test.ts`
- `lib/offers/evidence-canonicalizer.ts`
- `__tests__/unit/lib/offers/evidence-canonicalizer.test.ts`

