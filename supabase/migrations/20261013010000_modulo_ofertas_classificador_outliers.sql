-- ===========================================================================
-- 20261013010000_modulo_ofertas_classificador_outliers.sql
-- Fase 03 / Spec 0017 — Classificador determinístico de anomalias de preço (outliers)
-- Regra 3: Quedas > 50% e salvaguarda absoluta de R$ 25 para itens < R$ 50.
-- Preparação local; não aplicar em produção sem autorização explícita.
-- ===========================================================================
begin;

-- 1. Função determinística para classificação de uma observação de preço
create or replace function public.classify_price_observation(
  p_product_id uuid,
  p_merchant_id uuid,
  p_payment_method text,
  p_price_cents integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_median integer;
  v_drop_cents integer;
begin
  -- 1.1 Obtém a mediana consolidada dos 30 dias na mesma tríade (mínimo 5 dias distintos UTC)
  v_median := public.calculate_offer_median(p_product_id, p_merchant_id, p_payment_method);

  -- 1.2 Menos de 5 dias distintos UTC consolidados: sem histórico estatístico suficiente
  if v_median is null then
    return false;
  end if;

  -- 1.3 Preços iguais ou superiores à mediana não caracterizam anomalia de queda
  if p_price_cents >= v_median then
    return false;
  end if;

  v_drop_cents := v_median - p_price_cents;

  -- 1.4 Salvaguarda de produtos de baixo valor (mediana prévia < R$ 50,00 / 5000 centavos):
  --     Exige condição dupla e cumulativa:
  --     Desvio relativo > 50% (v_drop_cents * 2 > v_median) E
  --     Desvio absoluto > R$ 25,00 (v_drop_cents > 2500 centavos)
  if v_median < 5000 then
    return (v_drop_cents * 2 > v_median) and (v_drop_cents > 2500);
  end if;

  -- 1.5 Produtos de valor normal (mediana >= R$ 50,00):
  --     Corte estrito para desvio relativo superior a 50%:
  --     v_drop_cents / v_median > 0.50 <=> v_drop_cents * 2 > v_median
  --     (50% exato não é outlier; apenas > 50% ativa a anomalia)
  return (v_drop_cents * 2 > v_median);
end;
$$;

alter function public.classify_price_observation(uuid, uuid, text, integer) owner to postgres;
revoke execute on function public.classify_price_observation(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.classify_price_observation(uuid, uuid, text, integer) to service_role;

-- 2. Trigger BEFORE INSERT OR UPDATE para garantir que anomalias sejam marcadas
--    deterministicamente antes de persistir no banco, impedindo que contaminem calculate_offer_median.
create or replace function public.tg_classify_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Se já foi expressamente marcado como anômalo, mantém true
  if new.is_anomalous is true then
    return new;
  end if;

  -- Avalia a nova observação deterministicamente contra o histórico consolidado
  new.is_anomalous := public.classify_price_observation(
    new.product_id,
    new.merchant_id,
    new.payment_method,
    new.price_cents
  );

  return new;
end;
$$;

alter function public.tg_classify_price_history() owner to postgres;

drop trigger if exists trg_classify_price_history on public.price_history;
create trigger trg_classify_price_history
  before insert or update on public.price_history
  for each row execute function public.tg_classify_price_history();

commit;
