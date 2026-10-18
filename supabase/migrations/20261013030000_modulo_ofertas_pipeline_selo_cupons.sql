-- Spec 0017 / Fatia 3. LOCAL ONLY until separately authorized.
begin;

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists variant_key text;
alter table public.offers add column if not exists verified_effective_price_cents integer check (verified_effective_price_cents is null or verified_effective_price_cents > 0);
alter table public.offers add column if not exists verified_coupon_code text;
create unique index if not exists uq_products_sku_nonblank
  on public.products (sku) where sku is not null and length(btrim(sku)) > 0;
create unique index if not exists uq_products_variant_key_nonblank
  on public.products (variant_key) where variant_key is not null and length(btrim(variant_key)) > 0;

create table if not exists public.offer_coupon_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  eligibility text not null check (eligibility in ('universal', 'restricted')),
  discount_type text not null check (discount_type in ('fixed_cents', 'percent_bps')),
  discount_value integer not null check (discount_value > 0),
  merchant_id uuid references public.merchants(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  variant_key text,
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  restriction_reason text,
  evidence_hash text check (evidence_hash is null or evidence_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  constraint chk_coupon_validity check (valid_until is null or valid_until > valid_from),
  constraint chk_coupon_percent check (discount_type <> 'percent_bps' or discount_value <= 10000),
  constraint chk_coupon_restriction check (
    (eligibility = 'universal' and restriction_reason is null)
    or (eligibility = 'restricted' and length(btrim(coalesce(restriction_reason, ''))) >= 3)
  )
);
create unique index if not exists uq_offer_coupon_code_ci on public.offer_coupon_catalog (upper(code));
create index if not exists idx_offer_coupon_active_code
  on public.offer_coupon_catalog (upper(code), valid_from, valid_until) where is_active;
alter table public.offer_coupon_catalog enable row level security;
alter table public.offer_coupon_catalog force row level security;
revoke all on table public.offer_coupon_catalog from public, anon, authenticated;
drop policy if exists offer_coupon_service_all on public.offer_coupon_catalog;
create policy offer_coupon_service_all on public.offer_coupon_catalog
  for all to service_role using (true) with check (true);
grant select, insert, update on table public.offer_coupon_catalog to service_role;

-- Pipeline transacional: valida variante, cupom, desconto real, histórico e frete,
-- grava auditoria append-only e só então concede/renova o selo por 24 horas.
create or replace function public.evaluate_and_set_verified_price(
  p_offer_id uuid,
  p_action text,
  p_announced_sku text,
  p_announced_ean text,
  p_announced_variant jsonb,
  p_region_code text,
  p_origin_actor_id text,
  p_evidence_hash text,
  p_evidence_byte_size integer,
  p_evidence_content_type text,
  p_evidence_storage_path text,
  p_notes text default null
)
returns table (
  approved boolean,
  badge_status text,
  reason text,
  effective_price_cents integer,
  median_30d_cents integer,
  audit_id uuid,
  badge_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer record;
  v_product record;
  v_coupon public.offer_coupon_catalog%rowtype;
  v_coupon_found boolean := false;
  v_effective_price bigint;
  v_discount bigint := 0;
  v_median integer;
  v_rule text := 'median_30d_coupon_variant_shipping';
  v_result text := 'reprovado';
  v_reason text;
  v_exception_id uuid;
  v_exception_hash text;
  v_shipping record;
  v_audit_id uuid;
  v_verified_at timestamptz := now();
  v_badge_status text := 'unverified';
begin
  if p_action not in ('concessao', 'renovacao') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if p_evidence_hash is null or p_evidence_hash !~ '^[a-f0-9]{64}$' or p_evidence_byte_size is null or p_evidence_byte_size <= 0
     or length(btrim(coalesce(p_evidence_content_type, ''))) = 0
     or length(btrim(coalesce(p_evidence_storage_path, ''))) = 0
     or length(btrim(coalesce(p_origin_actor_id, ''))) = 0 then
    raise exception 'invalid_evidence_metadata' using errcode = '22023';
  end if;

  select o.* into v_offer from public.offers o where o.id = p_offer_id for update;
  if not found then
    return query select false, 'rejected'::text, 'offer_not_found'::text, null::integer, null::integer, null::uuid, null::timestamptz;
    return;
  end if;
  select p.* into v_product from public.products p where p.id = v_offer.product_id;
  if not found then
    v_reason := 'product_not_found';
  elsif v_product.sku is null or length(btrim(v_product.sku)) = 0 or p_announced_sku is null or btrim(p_announced_sku) <> v_product.sku then
    v_reason := 'sku_mismatch';
  elsif v_product.ean_upc is not null and (p_announced_ean is null or btrim(p_announced_ean) <> v_product.ean_upc) then
    v_reason := 'ean_mismatch';
  elsif coalesce(p_announced_variant, '{}'::jsonb) <> coalesce(v_product.specs_json, '{}'::jsonb) then
    v_reason := 'variant_mismatch';
  end if;

  v_effective_price := v_offer.price_cents;
  if v_reason is null and nullif(btrim(v_offer.coupon_code), '') is not null then
    select c.* into v_coupon from public.offer_coupon_catalog c
      where upper(c.code) = upper(btrim(v_offer.coupon_code)) for share;
    v_coupon_found := found;
    if not v_coupon_found then
      v_reason := 'coupon_not_found';
    elsif not v_coupon.is_active then
      v_reason := 'coupon_inactive';
    elsif v_coupon.valid_from > v_verified_at then
      v_reason := 'coupon_not_yet_valid';
    elsif v_coupon.valid_until is not null and v_coupon.valid_until <= v_verified_at then
      v_reason := 'coupon_expired';
    elsif v_coupon.eligibility <> 'universal' then
      v_reason := 'coupon_restricted';
    elsif (v_coupon.merchant_id is not null and v_coupon.merchant_id <> v_offer.merchant_id)
       or (v_coupon.product_id is not null and v_coupon.product_id <> v_offer.product_id)
       or (v_coupon.variant_key is not null and v_coupon.variant_key <> v_product.variant_key) then
      v_reason := 'coupon_scope_mismatch';
    else
      if v_coupon.discount_type = 'fixed_cents' then
        v_discount := v_coupon.discount_value;
      else
        v_discount := (v_offer.price_cents::bigint * v_coupon.discount_value::bigint) / 10000;
      end if;
      if v_discount <= 0 or v_discount >= v_offer.price_cents then
        v_reason := 'coupon_invalid_discount';
      else
        v_effective_price := v_offer.price_cents::bigint - v_discount;
      end if;
    end if;
  end if;

  if v_reason is null then
    v_median := public.calculate_offer_median(v_offer.product_id, v_offer.merchant_id, v_offer.payment_method);
    if v_median is null then
      v_reason := 'insufficient_history';
    elsif v_effective_price >= v_median then
      v_reason := 'price_not_below_median';
    end if;
  end if;

  -- Detect a candidate exception only after identity/coupon/price checks pass.
  if v_reason is null and v_offer.shipping_cost_cents::bigint * 100 > v_effective_price * 15 then
    select e.id, e.evidence_hash into v_exception_id, v_exception_hash
      from public.shipping_exception_catalog e
     where e.is_active and e.valid_from <= v_verified_at
       and (e.valid_until is null or e.valid_until > v_verified_at)
       and e.reviewed_by is not null and e.reviewed_at is not null
       and ((e.exception_type = 'bulky_product' and e.product_id = v_offer.product_id)
         or (e.exception_type = 'remote_region' and p_region_code is not null
             and e.region_code = upper(btrim(p_region_code))))
     order by case when e.exception_type = 'bulky_product' then 0 else 1 end, e.created_at desc
     limit 1;
    if v_exception_id is null then
      v_reason := 'shipping_exceeds_15_percent_no_exception';
    elsif v_exception_hash <> p_evidence_hash then
      -- Do not let a generic evidence file silently stand in for exception proof.
      v_reason := 'shipping_exception_evidence_hash_mismatch';
    else
      v_rule := 'shipping_exception:' || v_exception_id::text;
    end if;
  end if;

  if v_reason is not null then
    v_result := 'reprovado';
    v_badge_status := case when v_reason in ('insufficient_history', 'shipping_exception_evidence_hash_mismatch') then 'unverified' else 'rejected' end;
    insert into public.price_audit_logs (
      offer_id, action, rule_applied, rule_result, evaluated_price_cents, median_30d_cents,
      discount_percent, origin, origin_actor_id, evidence_hash, evidence_byte_size,
      evidence_content_type, evidence_storage_path, notes, checked_at
    ) values (
      p_offer_id, p_action, 'verified_price_pipeline:' || v_reason, v_result,
      greatest(1, least(v_effective_price, 2147483647))::integer, v_median,
      case when v_median is null or v_median = 0 then null else round((1 - v_effective_price::numeric / v_median) * 100, 2) end,
      'admin_aal2', p_origin_actor_id, p_evidence_hash, p_evidence_byte_size,
      p_evidence_content_type, p_evidence_storage_path, concat_ws('; ', p_notes, v_reason), v_verified_at
    ) returning id into v_audit_id;
    update public.offers set badge_status = v_badge_status, badge_verified_at = null,
      badge_expires_at = null, verified_by = null, verified_effective_price_cents = null,
      verified_coupon_code = null, updated_at = v_verified_at where id = p_offer_id;
    return query select false, v_badge_status, v_reason, greatest(1, least(v_effective_price, 2147483647))::integer,
      v_median, v_audit_id, null::timestamptz;
    return;
  end if;

  -- Insert the exact exception-bound audit before evaluating shipping. The function
  -- and badge update share one DB transaction; any exception rolls everything back.
  insert into public.price_audit_logs (
    offer_id, action, rule_applied, rule_result, evaluated_price_cents, median_30d_cents,
    discount_percent, origin, origin_actor_id, evidence_hash, evidence_byte_size,
    evidence_content_type, evidence_storage_path, notes, checked_at
  ) values (
    p_offer_id, p_action, v_rule, 'aprovado', v_effective_price::integer, v_median,
    round((1 - v_effective_price::numeric / v_median) * 100, 2), 'admin_aal2',
    p_origin_actor_id, p_evidence_hash, p_evidence_byte_size, p_evidence_content_type,
    p_evidence_storage_path, p_notes, v_verified_at
  ) returning id into v_audit_id;

  select * into v_shipping from public.evaluate_offer_shipping(p_offer_id, p_region_code);
  if not coalesce(v_shipping.eligible, false) then
    -- Append-only audit means we cannot rewrite the just-created approved decision.
    -- This branch is unreachable for normal 15% shipping and for an exact exception
    -- hash; fail the transaction to avoid a misleading approval record.
    raise exception 'shipping_evaluation_changed:%', v_shipping.reason using errcode = '23514';
  end if;

  update public.offers set badge_status = 'verified', badge_verified_at = v_verified_at,
    badge_expires_at = v_verified_at + interval '24 hours', verified_by = p_origin_actor_id,
    verified_effective_price_cents = v_effective_price::integer,
    verified_coupon_code = case when v_coupon_found then v_coupon.code else null end,
    updated_at = v_verified_at where id = p_offer_id;
  return query select true, 'verified'::text, coalesce(v_shipping.reason, 'approved')::text,
    v_effective_price::integer, v_median, v_audit_id, v_verified_at + interval '24 hours';
end;
$$;

alter function public.evaluate_and_set_verified_price(uuid, text, text, text, jsonb, text, text, text, integer, text, text, text) owner to postgres;
revoke all on function public.evaluate_and_set_verified_price(uuid, text, text, text, jsonb, text, text, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.evaluate_and_set_verified_price(uuid, text, text, text, jsonb, text, text, text, integer, text, text, text) to service_role;

comment on column public.offers.verified_effective_price_cents is 'Preço efetivo auditado para o selo, após cupom universal; não confundir com o preço-base da oferta.';
comment on column public.offers.verified_coupon_code is 'Cupom universal usado no cálculo do preço efetivo auditado.';
comment on table public.offer_coupon_catalog is 'Cupons universais podem ser considerados no selo; cupons restritivos nunca concedem selo geral.';
comment on function public.evaluate_and_set_verified_price(uuid, text, text, text, jsonb, text, text, text, integer, text, text, text) is 'Pipeline transacional local da Spec 0017: SKU/variante, cupom universal, mediana, frete, auditoria e selo de 24h.';
commit;
