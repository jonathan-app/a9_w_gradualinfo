-- Spec 0017 / Fatia 3. Executar apenas em Supabase local descartável.
BEGIN;
SELECT plan(16);

SELECT has_table('public', 'offer_coupon_catalog', 'catálogo de cupons existe');
SELECT has_column('public', 'products', 'sku', 'products possui SKU canônico');
SELECT has_column('public', 'products', 'variant_key', 'products possui chave de variante');
SELECT has_function('public', 'evaluate_and_set_verified_price', ARRAY[
  'uuid','text','text','text','jsonb','text','text','text','integer','text','text','text'
], 'pipeline transacional existe');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.offer_coupon_catalog'::regclass), 'RLS ativa em cupons');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.offer_coupon_catalog'::regclass), 'FORCE RLS ativa em cupons');
SELECT ok(NOT has_table_privilege('anon', 'public.offer_coupon_catalog', 'SELECT'), 'anon não lê catálogo de cupons');
SELECT ok(NOT has_table_privilege('authenticated', 'public.offer_coupon_catalog', 'SELECT'), 'authenticated não lê catálogo de cupons');
SELECT ok(NOT has_function_privilege('anon', 'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text)', 'EXECUTE'), 'anon não executa pipeline');
SELECT ok(NOT has_function_privilege('authenticated', 'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text)', 'EXECUTE'), 'authenticated não executa pipeline');
SELECT is((SELECT prosecdef FROM pg_proc WHERE oid = 'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text)'::regprocedure), true, 'pipeline é SECURITY DEFINER');
SELECT is((SELECT proowner::regrole::text FROM pg_proc WHERE oid = 'public.evaluate_and_set_verified_price(uuid,text,text,text,jsonb,text,text,text,integer,text,text,text)'::regprocedure), 'postgres', 'pipeline pertence a postgres');
SELECT ok(EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_offer_coupon_code_ci'), 'código de cupom é único sem diferenciar maiúsculas');

INSERT INTO public.offer_coupon_catalog (code, eligibility, discount_type, discount_value, restriction_reason)
VALUES ('FIRSTORDER', 'restricted', 'fixed_cents', 500, 'somente novos clientes');
SELECT throws_ok(
  $$ INSERT INTO public.offer_coupon_catalog (code, eligibility, discount_type, discount_value, restriction_reason)
     VALUES ('BADPERCENT', 'universal', 'percent_bps', 10001, NULL) $$,
  '23514', NULL, 'percentual acima de 100% é rejeitado'
);
SELECT throws_ok(
  $$ INSERT INTO public.offer_coupon_catalog (code, eligibility, discount_type, discount_value, restriction_reason)
     VALUES ('BADRESTRICT', 'restricted', 'fixed_cents', 500, NULL) $$,
  '23514', NULL, 'cupom restritivo exige justificativa'
);
SELECT ok((SELECT eligibility = 'restricted' FROM public.offer_coupon_catalog WHERE code = 'FIRSTORDER'), 'cupom restritivo fica explicitamente classificado');

SELECT * FROM finish();
ROLLBACK;
