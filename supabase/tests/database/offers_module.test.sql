-- supabase/tests/database/offers_module.test.sql
-- Spec 0017: testes de catálogo e invariantes SQL. Executar apenas após
-- `pnpm supabase:reset` em Supabase local descartável.
BEGIN;

SELECT plan(28);

-- Schema, constraints, RLS e privilégios estruturais.
SELECT has_table('public', 'merchants', 'tabela merchants existe');
SELECT has_table('public', 'products', 'tabela products existe');
SELECT has_table('public', 'offers', 'tabela offers existe');
SELECT has_table('public', 'price_history', 'tabela price_history existe');
SELECT has_table('public', 'price_audit_logs', 'tabela price_audit_logs existe');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.merchants'::regclass), 'RLS ativa em merchants');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.products'::regclass), 'RLS ativa em products');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.offers'::regclass), 'RLS ativa em offers');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.price_history'::regclass), 'RLS ativa em price_history');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.price_audit_logs'::regclass), 'RLS ativa em price_audit_logs');

SELECT ok(NOT has_table_privilege('anon', 'public.price_audit_logs', 'SELECT'), 'anon não tem SELECT em logs');
SELECT ok(NOT has_table_privilege('authenticated', 'public.price_audit_logs', 'SELECT'), 'authenticated não tem SELECT em logs');
SELECT ok(NOT has_table_privilege('service_role', 'public.price_audit_logs', 'UPDATE'), 'service_role não tem UPDATE em logs');
SELECT ok(NOT has_table_privilege('service_role', 'public.price_audit_logs', 'DELETE'), 'service_role não tem DELETE em logs');
SELECT ok(NOT has_table_privilege('service_role', 'public.price_audit_logs', 'TRUNCATE'), 'service_role não tem TRUNCATE em logs');

SELECT ok(EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'idx_price_history_daily_trunc'
), 'índice de agregação diária UTC existe');

SELECT ok((SELECT prosecdef FROM pg_proc WHERE oid =
  'public.calculate_offer_median(uuid,uuid,text)'::regprocedure),
  'calculate_offer_median é SECURITY DEFINER');
SELECT is((SELECT proowner::regrole::text FROM pg_proc WHERE oid =
  'public.calculate_offer_median(uuid,uuid,text)'::regprocedure),
  'postgres', 'calculate_offer_median pertence a postgres');
SELECT ok(NOT has_function_privilege('anon',
  'public.calculate_offer_median(uuid,uuid,text)', 'EXECUTE'),
  'anon não pode executar calculate_offer_median');
SELECT ok(NOT has_function_privilege('authenticated',
  'public.calculate_offer_median(uuid,uuid,text)', 'EXECUTE'),
  'authenticated não pode executar calculate_offer_median');

-- Fixtures temporárias dentro da transação de teste.
INSERT INTO public.merchants (id, name, slug, domain)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Loja Teste', 'loja-teste', 'loja.example');
INSERT INTO public.products (id, slug, title, brand, category)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'produto-teste', 'Produto Teste', 'Marca', 'Hardware');

SELECT throws_ok(
  $$ INSERT INTO public.offers (product_id, merchant_id, title, url, affiliate_url, price_cents)
     VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
             'Preço inválido', 'https://loja.example/p', 'https://loja.example/p', 0) $$,
  '23514', NULL, 'price_cents zero é rejeitado'
);

INSERT INTO public.offers (
  id, product_id, merchant_id, title, url, affiliate_url, price_cents,
  badge_status, badge_verified_at, badge_expires_at
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Oferta teste', 'https://loja.example/p', 'https://loja.example/p', 10000,
  'verified', now() - interval '25 hours', now() - interval '1 hour'
);

SELECT is((SELECT effective_badge_status::text FROM public.active_offers_view
  WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'expired', 'view rebaixa selo expirado em tempo de consulta');
SELECT is((SELECT is_badge_verified FROM public.active_offers_view
  WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  false, 'view nunca marca selo expirado como verificado');

-- Cinco dias UTC, com duas coletas no primeiro dia. A menor do dia é a
-- observação canônica; fontes manuais e amostras anômalas não entram.
INSERT INTO public.price_history
  (product_id, merchant_id, price_cents, payment_method, captured_at, source_type, is_anomalous)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9000,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day','api_partner',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',8500,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day' + interval '2 hours','verified_audit',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9200,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '2 days','api_partner',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9400,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '3 days','api_partner',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9600,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '4 days','api_partner',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',9800,'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '5 days','api_partner',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',100,'a_vista', now() - interval '1 hour','manual',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',100,'a_vista', now() - interval '30 minutes','api_partner',true);

SELECT is(public.calculate_offer_median(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'a_vista'
), 9400, 'mediana ignora duplicata diária, fonte manual e anomalia');

SELECT is(public.calculate_offer_median(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'parcelado'
), NULL, 'mediana retorna NULL sem cinco dias da mesma tríade');

-- FK RESTRICT impede apagar oferta que tenha um log de auditoria.
INSERT INTO public.price_audit_logs (
  id, offer_id, action, rule_applied, rule_result, evaluated_price_cents,
  origin, origin_actor_id, evidence_hash, evidence_byte_size,
  evidence_content_type, evidence_storage_path
) VALUES (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'concessao', 'teste', 'aprovado', 10000, 'admin_aal2', 'local-test',
  repeat('a', 64), 1, 'application/json', repeat('a', 64) || '.json'
);

SELECT throws_ok(
  $$ UPDATE public.price_audit_logs SET notes = 'mutado'
     WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' $$,
  '55000', NULL, 'trigger bloqueia UPDATE em log de auditoria'
);

SELECT throws_ok(
  $$ DELETE FROM public.price_audit_logs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' $$,
  '55000', NULL, 'trigger bloqueia DELETE em log de auditoria'
);
SELECT throws_ok(
  $$ DELETE FROM public.offers WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  '23503', NULL, 'ON DELETE RESTRICT preserva oferta referenciada por auditoria'
);

SELECT * FROM finish();
ROLLBACK;
