-- supabase/tests/database/offers_ingest_idempotencia.test.sql
-- Spec 0021 / AC-08: Testes pgTAP de ingestão de coletores, anti-replay e idempotência transacional no PostgreSQL.
BEGIN;

SELECT plan(25);

-- 1. Estruturas e tabelas da migração
SELECT has_table('public', 'offers_ingest_nonces', 'tabela offers_ingest_nonces existe');
SELECT has_table('public', 'offer_operation_keys', 'tabela offer_operation_keys existe');

-- 2. RLS ativo nas duas tabelas
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.offers_ingest_nonces'::regclass), 'RLS ativa em offers_ingest_nonces');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.offer_operation_keys'::regclass), 'RLS ativa em offer_operation_keys');

-- 3. Privilégios restritos (anon e authenticated sem acesso)
SELECT ok(NOT has_table_privilege('anon', 'public.offers_ingest_nonces', 'SELECT'), 'anon não lê offers_ingest_nonces');
SELECT ok(NOT has_table_privilege('authenticated', 'public.offers_ingest_nonces', 'SELECT'), 'authenticated não lê offers_ingest_nonces');
SELECT ok(NOT has_table_privilege('anon', 'public.offer_operation_keys', 'SELECT'), 'anon não lê offer_operation_keys');
SELECT ok(NOT has_table_privilege('authenticated', 'public.offer_operation_keys', 'SELECT'), 'authenticated não lê offer_operation_keys');

-- 4. Funções evaluate_and_set_verified_price (13 e 12 parâmetros)
SELECT has_function('public', 'evaluate_and_set_verified_price', ARRAY[
  'uuid','text','text','text','jsonb','text','text','text','integer','text','text','text','text'
], 'função evaluate_and_set_verified_price com 13 parâmetros existe');

SELECT has_function('public', 'evaluate_and_set_verified_price', ARRAY[
  'uuid','text','text','text','jsonb','text','text','text','integer','text','text','text'
], 'overload evaluate_and_set_verified_price com 12 parâmetros existe');

SELECT is((SELECT prosecdef FROM pg_proc WHERE oid =
  'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text,text)'::regprocedure),
  true, 'evaluate_and_set_verified_price (13 args) é SECURITY DEFINER');

SELECT is((SELECT proowner::regrole::text FROM pg_proc WHERE oid =
  'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text,text)'::regprocedure),
  'postgres', 'evaluate_and_set_verified_price (13 args) pertence a postgres');

-- 5. Anti-replay de nonce compartilhado sob unicidade
INSERT INTO public.offers_ingest_nonces (collector_id, nonce)
VALUES ('collector-pgtap-01', 'nonce-pgtap-alpha');

SELECT throws_ok(
  $$ INSERT INTO public.offers_ingest_nonces (collector_id, nonce)
     VALUES ('collector-pgtap-01', 'nonce-pgtap-alpha') $$,
  '23505', NULL, 'mesmo nonce para o mesmo coletor é rejeitado com violação de unicidade (23505)'
);

-- Inserção com outro coletor e mesmo nonce deve ser permitida (chave composta)
INSERT INTO public.offers_ingest_nonces (collector_id, nonce)
VALUES ('collector-pgtap-02', 'nonce-pgtap-alpha');
SELECT ok(EXISTS (
  SELECT 1 FROM public.offers_ingest_nonces WHERE collector_id = 'collector-pgtap-02' AND nonce = 'nonce-pgtap-alpha'
), 'mesmo nonce com outro coletor é aceito');

-- 6. Fixtures para teste de idempotência transacional da RPC
INSERT INTO public.merchants (id, name, slug, domain)
VALUES ('11111111-1111-4111-8111-111111111111', 'Lojista Idempotência', 'lojista-idem', 'idem.example.com');

INSERT INTO public.products (id, slug, title, brand, category, sku, specs_json)
VALUES ('22222222-2222-4222-8222-222222222222', 'produto-idem', 'Produto Idempotência', 'Marca Idem', 'Tech', 'SKU-IDEM-001', '{"ram": "16GB"}'::jsonb);

INSERT INTO public.offers (
  id, product_id, merchant_id, title, url, affiliate_url, price_cents,
  original_price_cents, payment_method, installment_count, installment_price_cents, shipping_cost_cents,
  badge_status
)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Notebook Idem',
  'https://idem.example.com/p1',
  'https://idem.example.com/p1?aff=1',
  250000,
  300000,
  'a_vista',
  1,
  250000,
  0,
  'unverified'
);

-- Primeira execução: nova chave de operação 'op-test-pgtap-001'
SELECT * FROM public.evaluate_and_set_verified_price(
  '33333333-3333-4333-8333-333333333333'::uuid,
  'concessao',
  'SKU-IDEM-001',
  null,
  '{"ram": "16GB"}'::jsonb,
  null,
  'collector:collector-pgtap-01',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  1024,
  'application/json',
  'evidence/2026/10/aa.json',
  'primeira execucao',
  'op-test-pgtap-001'
);

SELECT is((
  SELECT reused_existing FROM public.evaluate_and_set_verified_price(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'concessao',
    'SKU-IDEM-001',
    null,
    '{"ram": "16GB"}'::jsonb,
    null,
    'collector:collector-pgtap-01',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    1024,
    'application/json',
    'evidence/2026/10/aa.json',
    'segunda execucao (idempotente)',
    'op-test-pgtap-001'
  )
), true, 'segunda execução com mesma chave e mesmo payload retorna reused_existing = true');

SELECT is(
  (SELECT count(*)::integer FROM public.offer_operation_keys WHERE operation_key = 'op-test-pgtap-001'),
  1,
  'exatamente um registro de operação gravado em offer_operation_keys'
);

SELECT is(
  (SELECT count(*)::integer FROM public.price_audit_logs WHERE offer_id = '33333333-3333-4333-8333-333333333333'),
  1,
  'reexecução idempotente não duplicou log em price_audit_logs'
);

-- Terceira execução com MESMA chave de operação mas HASH de evidência divergente (deve disparar erro 23505)
SELECT throws_ok(
  $$ SELECT * FROM public.evaluate_and_set_verified_price(
       '33333333-3333-4333-8333-333333333333'::uuid,
       'concessao',
       'SKU-IDEM-001',
       null,
       '{"ram": "16GB"}'::jsonb,
       null,
       'collector:collector-pgtap-01',
       'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
       2048,
       'application/json',
       'evidence/2026/10/bb.json',
       'execucao conflitante',
       'op-test-pgtap-001'
     ) $$,
  '23505',
  NULL,
  'mesma operation_key com payload/hash divergente lança conflito 23505 (operation_key_payload_conflict)'
);

-- Execução sem operation_key explícita gera chave determinística padrão offer_id:evidence_hash
SELECT * FROM public.evaluate_and_set_verified_price(
  '33333333-3333-4333-8333-333333333333'::uuid,
  'concessao',
  'SKU-IDEM-001',
  null,
  '{"ram": "16GB"}'::jsonb,
  null,
  'collector:collector-pgtap-01',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  512,
  'application/json',
  'evidence/2026/10/cc.json',
  'execucao sem chave'
);

SELECT ok(EXISTS (
  SELECT 1 FROM public.offer_operation_keys
   WHERE operation_key = '33333333-3333-4333-8333-333333333333:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
), 'quando operation_key for nula, chave determinística offer_id:evidence_hash é registrada');

-- 7. Lacuna 6 / SEC-03: Bloqueio de mutação direta em nonces/operation_keys e expurgo seguro
SELECT ok(NOT has_table_privilege('service_role', 'public.offers_ingest_nonces', 'UPDATE'), 'service_role não tem UPDATE em offers_ingest_nonces');
SELECT ok(NOT has_table_privilege('service_role', 'public.offers_ingest_nonces', 'DELETE'), 'service_role não tem DELETE direto em offers_ingest_nonces');
SELECT ok(NOT has_table_privilege('service_role', 'public.offer_operation_keys', 'UPDATE'), 'service_role não tem UPDATE em offer_operation_keys');
SELECT ok(NOT has_table_privilege('service_role', 'public.offer_operation_keys', 'DELETE'), 'service_role não tem DELETE em offer_operation_keys');

SELECT throws_ok(
  $$ SELECT public.purge_expired_offers_ingest_nonces(interval '5 minutes') $$,
  '22023',
  'retention_below_minimum_replay_window',
  'expurgo de nonces rejeita janela inferior a 10 minutos'
);

SELECT ok(
  to_regprocedure('public.purge_expired_offers_ingest_nonces(integer)') IS NULL,
  'expurgo de nonces não mantém sobrecarga integer sem validação'
);

SELECT * FROM finish();
ROLLBACK;
