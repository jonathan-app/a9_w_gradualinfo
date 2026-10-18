BEGIN;
SELECT plan(23);

SELECT has_table('public', 'shipping_exception_catalog', 'catálogo de exceções de frete existe');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.shipping_exception_catalog'::regclass),
  'RLS ativa no catálogo de exceções');
SELECT is((SELECT proowner::regrole::text FROM pg_proc WHERE oid =
  'public.evaluate_offer_shipping(uuid,text)'::regprocedure), 'postgres',
  'avaliador de frete pertence a postgres');
SELECT ok(NOT has_function_privilege('anon', 'public.evaluate_offer_shipping(uuid,text)', 'EXECUTE'),
  'anon não pode executar avaliador');
SELECT ok(NOT has_function_privilege('authenticated', 'public.evaluate_offer_shipping(uuid,text)', 'EXECUTE'),
  'authenticated não pode executar avaliador');
SELECT ok(has_function_privilege('service_role', 'public.evaluate_offer_shipping(uuid,text)', 'EXECUTE'),
  'service_role pode executar avaliador');
SELECT ok((SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid =
  'public.evaluate_offer_shipping(uuid,text)'::regprocedure),
  'SECURITY DEFINER fixa search_path vazio');
SELECT ok(NOT has_table_privilege('anon', 'public.shipping_exception_catalog', 'SELECT'),
  'anon não pode ler catálogo operacional');
SELECT ok(NOT has_table_privilege('anon', 'public.shipping_exception_catalog', 'INSERT'),
  'anon não pode inserir exceções');
SELECT ok(has_table_privilege('service_role', 'public.shipping_exception_catalog', 'INSERT'),
  'service_role pode gerir exceções');

INSERT INTO public.merchants (id, name, slug, domain)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Loja Frete', 'loja-frete', 'frete.example');
INSERT INTO public.products (id, slug, title, brand, category)
VALUES
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'produto-volumoso', 'Gabinete Full Tower', 'Marca', 'Hardware'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc', 'produto-normal', 'Mouse', 'Marca', 'Periféricos');
INSERT INTO public.offers (id, product_id, merchant_id, title, url, affiliate_url, price_cents, shipping_cost_cents)
VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Oferta volumosa', 'https://frete.example/p1', 'https://frete.example/p1', 10000, 2000),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Oferta normal', 'https://frete.example/p2', 'https://frete.example/p2', 10000, 1500),
 ('cccccccc-cccc-4ccc-8ccc-ccccccccccce', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Oferta região remota', 'https://frete.example/p3', 'https://frete.example/p3', 10000, 2500);

SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccd', NULL)),
  'eligible', 'frete exatamente 15% é elegível');
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL)),
  'rejected', 'frete acima de 15% sem exceção é rejeitado');
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('dddddddd-dddd-4ddd-8ddd-dddddddddddd', NULL)),
  'rejected', 'oferta inexistente falha fechado');

INSERT INTO public.shipping_exception_catalog (
  id, exception_type, product_id, description, evidence_hash, evidence_storage_path, evidence_source,
  reviewed_by, reviewed_at
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'bulky_product', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Gabinete full tower com dimensões e peso documentados', repeat('a', 64), 'audit-evidence/bulky-a.json',
  'Ficha técnica do fabricante', 'reviewer-1', now()
);

SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL)),
  'manual_review_required', 'exceção volumosa sem log de auditoria não libera selo');
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'BR-AM-01')),
  'eligible', 'frete dentro do limite continua elegível sem exceção');
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-ccccccccccce', 'BR-AM-01')),
  'rejected', 'região remota sem exceção catalogada é rejeitada');

INSERT INTO public.price_audit_logs (
  offer_id, action, rule_applied, rule_result, evaluated_price_cents, origin, origin_actor_id,
  evidence_hash, evidence_byte_size, evidence_content_type, evidence_storage_path
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'concessao',
  'shipping_exception:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aprovado', 10000,
  'admin_aal2', 'reviewer-1', repeat('a', 64), 10, 'application/json', 'audit-evidence/bulky-a.json'
);

SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL)),
  'eligible_by_exception', 'exceção volumosa exige e aceita log admin_aal2 com hash exato');

INSERT INTO public.shipping_exception_catalog (
  id, exception_type, region_code, description, evidence_hash, evidence_storage_path, evidence_source,
  reviewed_by, reviewed_at
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef', 'remote_region', 'BR-AM-01',
  'Tabela oficial uniforme do parceiro logístico para região remota', repeat('b', 64),
  'audit-evidence/remote-am.json', 'Tabela tarifária oficial do parceiro', 'reviewer-2', now()
);

SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-ccccccccccce', 'BR-AM-01')),
  'manual_review_required', 'exceção regional também exige auditoria manual');
INSERT INTO public.price_audit_logs (
  offer_id, action, rule_applied, rule_result, evaluated_price_cents, origin, origin_actor_id,
  evidence_hash, evidence_byte_size, evidence_content_type, evidence_storage_path
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccce', 'concessao',
  'shipping_exception:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef', 'aprovado', 10000,
  'admin_aal2', 'reviewer-2', repeat('b', 64), 10, 'application/json', 'audit-evidence/remote-am.json'
);
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-ccccccccccce', 'br-am-01')),
  'eligible_by_exception', 'código regional é normalizado e exceção auditada é elegível');
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-ccccccccccce', NULL)),
  'rejected', 'exceção remota não se aplica sem região explícita');

INSERT INTO public.shipping_exception_catalog (
  id, exception_type, product_id, description, evidence_hash, evidence_storage_path, evidence_source,
  valid_from, valid_until, reviewed_by, reviewed_at
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeed', 'bulky_product', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Exceção expirada de teste para gabinete full tower', repeat('c', 64), 'audit-evidence/expired.json',
  'Ficha técnica do fabricante', now() - interval '3 days', now() - interval '1 day', 'reviewer-3', now() - interval '2 days'
);
UPDATE public.shipping_exception_catalog SET is_active = false
 WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
SELECT is((SELECT decision FROM public.evaluate_offer_shipping('cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL)),
  'rejected', 'exceção expirada ou desativada não libera o selo');

SELECT throws_ok(
  $$ INSERT INTO public.shipping_exception_catalog (exception_type, product_id, description, evidence_hash, evidence_storage_path, evidence_source)
     VALUES ('bulky_product', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Evidência inválida para teste', 'bad-hash', 'x', 'fonte') $$,
  '23514', NULL, 'hash de evidência inválido é rejeitado');
SELECT throws_ok(
  $$ INSERT INTO public.shipping_exception_catalog (exception_type, product_id, region_code, description, evidence_hash, evidence_storage_path, evidence_source)
     VALUES ('remote_region', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BR-AM-01', 'Escopo ambíguo de teste', repeat('d',64), 'x', 'fonte') $$,
  '23514', NULL, 'catálogo rejeita escopo ambíguo de produto e região');

SELECT * FROM finish();
ROLLBACK;
