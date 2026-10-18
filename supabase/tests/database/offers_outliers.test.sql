-- supabase/tests/database/offers_outliers.test.sql
-- Spec 0017 Regra 3: Testes de classificação automática de outliers e salvaguarda de baixo valor.
-- Executar apenas em Supabase local descartável via `pnpm supabase:test`.
BEGIN;

SELECT plan(22);

-- 1. Verificação de permissões e segurança da função de classificação
SELECT has_function('public', 'classify_price_observation', ARRAY['uuid', 'uuid', 'text', 'integer'],
  'função classify_price_observation existe');

SELECT ok((SELECT prosecdef FROM pg_proc WHERE oid =
  'public.classify_price_observation(uuid,uuid,text,integer)'::regprocedure),
  'classify_price_observation é SECURITY DEFINER');

SELECT is((SELECT proowner::regrole::text FROM pg_proc WHERE oid =
  'public.classify_price_observation(uuid,uuid,text,integer)'::regprocedure),
  'postgres', 'classify_price_observation pertence a postgres');

SELECT ok((SELECT prosecdef AND proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid =
  'public.classify_price_observation(uuid,uuid,text,integer)'::regprocedure),
  'classify_price_observation possui search_path vazio fixo');

SELECT ok(NOT has_function_privilege('anon',
  'public.classify_price_observation(uuid,uuid,text,integer)', 'EXECUTE'),
  'anon não pode executar classify_price_observation');

SELECT ok(NOT has_function_privilege('authenticated',
  'public.classify_price_observation(uuid,uuid,text,integer)', 'EXECUTE'),
  'authenticated não pode executar classify_price_observation');

SELECT ok(has_function_privilege('service_role',
  'public.classify_price_observation(uuid,uuid,text,integer)', 'EXECUTE'),
  'service_role pode executar classify_price_observation');

SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_classify_price_history'),
  'trigger trg_classify_price_history existe em price_history');

-- 2. Fixtures isoladas na transação
INSERT INTO public.merchants (id, name, slug, domain)
VALUES ('11111111-1111-4111-8111-111111111111', 'Lojista Outlier', 'lojista-outlier', 'outlier.test');

-- Produto 1: Ticket Normal (mediana será 9400 / R$ 94,00)
INSERT INTO public.products (id, slug, title, brand, category)
VALUES ('22222222-2222-4222-8222-222222222222', 'produto-normal', 'Produto Ticket Normal', 'Marca', 'Hardware');

-- Produto 2: Baixo Valor (mediana será 4000 / R$ 40,00)
INSERT INTO public.products (id, slug, title, brand, category)
VALUES ('33333333-3333-4333-8333-333333333333', 'produto-baixo-valor', 'Produto Baixo Valor', 'Marca', 'Acessórios');

-- Histórico de 5 dias UTC para Produto 1 (preços: 9000, 9200, 9400, 9600, 9800 -> Mediana 9400)
INSERT INTO public.price_history (product_id, merchant_id, price_cents, payment_method, captured_at, source_type, is_anomalous)
VALUES
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 9000, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day', 'api_partner', false),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 9200, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '2 days', 'api_partner', false),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 9400, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '3 days', 'api_partner', false),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 9600, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '4 days', 'api_partner', false),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 9800, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '5 days', 'api_partner', false);

-- Histórico de 5 dias UTC para Produto 2 (preços: 3800, 3900, 4000, 4100, 4200 -> Mediana 4000)
INSERT INTO public.price_history (product_id, merchant_id, price_cents, payment_method, captured_at, source_type, is_anomalous)
VALUES
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 3800, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day', 'api_partner', false),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 3900, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '2 days', 'api_partner', false),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 4000, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '3 days', 'api_partner', false),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 4100, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '4 days', 'api_partner', false),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 4200, 'a_vista', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '5 days', 'api_partner', false);

-- Confere medianas calculadas
SELECT is(public.calculate_offer_median(
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a_vista'
), 9400, 'mediana de Produto 1 é 9400');

SELECT is(public.calculate_offer_median(
  '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'a_vista'
), 4000, 'mediana de Produto 2 é 4000');

-- 3. Testes de fronteira de 50% em Produto 1 (Mediana 9400; 50% é 4700):
-- 3.1 Queda de exatamente 50% (preço 4700): NÃO é anômalo
SELECT is(public.classify_price_observation(
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a_vista', 4700
), false, 'queda de exatamente 50% (4700 em 9400) não é anômala');

-- 3.2 Queda superior a 50% (preço 4699): É ANÔMALO
SELECT is(public.classify_price_observation(
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a_vista', 4699
), true, 'queda superior a 50% (4699 em 9400) é classificada como anômala');

-- 3.3 Queda inferior a 50% (preço 4701): NÃO é anômalo
SELECT is(public.classify_price_observation(
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a_vista', 4701
), false, 'queda de 49.99% (4701 em 9400) não é anômala');

-- 4. Testes de salvaguarda de baixo valor em Produto 2 (Mediana 4000 < 5000):
-- 4.1 Queda de 55% mas desvio absoluto R$ 22 (preço 1800; desvio 2200 <= 2500): NÃO é anômalo
SELECT is(public.classify_price_observation(
  '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'a_vista', 1800
), false, 'item < R$ 50 com queda de 55% mas delta <= R$ 25 é protegido pela salvaguarda');

-- 4.2 Queda com desvio absoluto de exatamente R$ 25 (preço 1500; desvio 2500 <= 2500): NÃO é anômalo
SELECT is(public.classify_price_observation(
  '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'a_vista', 1500
), false, 'item < R$ 50 com delta de exatos R$ 25 é tolerado inclusivamente');

-- 4.3 Queda com desvio absoluto > R$ 25 e desvio relativo > 50% (preço 1400; desvio 2600 > 2500): É ANÔMALO
SELECT is(public.classify_price_observation(
  '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'a_vista', 1400
), true, 'item < R$ 50 com queda > 50% E delta > R$ 25 é anômalo');

-- 5. Ausência de histórico (< 5 coletas): não classifica como anômalo automaticamente
SELECT is(public.classify_price_observation(
  '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'a_vista', 500
), false, 'produto sem histórico mínimo retorna false');

-- 6. Teste da trigger de ingestão em public.price_history:
-- Inserção de valor anômalo (R$ 30,00 para Produto 1 com mediana R$ 94,00) sem flag explícita
INSERT INTO public.price_history (
  product_id, merchant_id, price_cents, payment_method, captured_at, source_type
) VALUES (
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
  3000, 'a_vista', now(), 'api_partner'
);

SELECT is((
  SELECT is_anomalous FROM public.price_history
  WHERE product_id = '22222222-2222-4222-8222-222222222222'
    AND price_cents = 3000
  LIMIT 1
), true, 'trigger classifica e marca observação anômala antes de persistir');

-- 7. Mediana blindada contra contaminação por anomalia recém-inserida
SELECT is(public.calculate_offer_median(
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a_vista'
), 9400, 'calculate_offer_median permanece intacta sem contaminação por anomalia');

-- 8. Inserção de valor normal (R$ 80,00) é marcado como não anômalo
INSERT INTO public.price_history (
  product_id, merchant_id, price_cents, payment_method, captured_at, source_type
) VALUES (
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
  8000, 'a_vista', now(), 'api_partner'
);

SELECT is((
  SELECT is_anomalous FROM public.price_history
  WHERE product_id = '22222222-2222-4222-8222-222222222222'
    AND price_cents = 8000
  LIMIT 1
), false, 'trigger mantém is_anomalous = false para preço legítimo');

-- 9. Registro de auditoria imutável para corte de outlier
INSERT INTO public.offers (
  id, product_id, merchant_id, title, url, affiliate_url, price_cents, status
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Oferta com Outlier', 'https://outlier.test/p', 'https://outlier.test/p',
  3000, 'ativa'
);

INSERT INTO public.price_audit_logs (
  offer_id, action, rule_applied, rule_result, evaluated_price_cents,
  median_30d_cents, discount_percent, origin, origin_actor_id,
  evidence_hash, evidence_byte_size, evidence_content_type, evidence_storage_path, notes
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  'concessao', 'outlier_cut', 'reprovado', 3000,
  9400, 68.09, 'automated_collector', 'outlier-daemon',
  repeat('f', 64), 128, 'application/json', 'outliers/20261013-evidence.json',
  'Rejeitado por anomalia estatística (>50% de queda)'
);

SELECT is((
  SELECT rule_result FROM public.price_audit_logs
  WHERE offer_id = '55555555-5555-4555-8555-555555555555'
), 'reprovado', 'auditoria registra rejeição por outlier');

SELECT is((
  SELECT rule_applied FROM public.price_audit_logs
  WHERE offer_id = '55555555-5555-4555-8555-555555555555'
), 'outlier_cut', 'regra auditada registrada como outlier_cut');

SELECT * FROM finish();
ROLLBACK;
