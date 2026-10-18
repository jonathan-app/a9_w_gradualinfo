-- ===========================================================================
-- 20261013020000_modulo_ofertas_elegibilidade_frete.sql
-- Spec 0017 / Fatia 2: avaliação de frete e exceções catalogadas.
-- Executar apenas em ambiente local isolado até nova autorização formal.
-- ===========================================================================
begin;

create table if not exists public.shipping_exception_catalog (
  id uuid primary key default gen_random_uuid(),
  exception_type text not null
    check (exception_type in ('bulky_product', 'remote_region')),
  product_id uuid references public.products(id) on delete restrict,
  region_code text,
  description text not null check (length(btrim(description)) between 12 and 500),
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  evidence_storage_path text not null check (length(btrim(evidence_storage_path)) > 0),
  evidence_source text not null check (length(btrim(evidence_source)) between 3 and 300),
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_shipping_exception_scope check (
    (exception_type = 'bulky_product' and product_id is not null and region_code is null)
    or
    (exception_type = 'remote_region' and product_id is null
      and region_code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$')
  ),
  constraint chk_shipping_exception_validity check (
    valid_until is null or valid_until > valid_from
  ),
  constraint chk_shipping_exception_manual_review check (
    (reviewed_by is null and reviewed_at is null)
    or (length(btrim(reviewed_by)) > 0 and reviewed_at is not null)
  )
);

create index if not exists idx_shipping_exception_product_active
  on public.shipping_exception_catalog (product_id, valid_from, valid_until)
  where is_active and exception_type = 'bulky_product';
create index if not exists idx_shipping_exception_region_active
  on public.shipping_exception_catalog (region_code, valid_from, valid_until)
  where is_active and exception_type = 'remote_region';

alter table public.shipping_exception_catalog enable row level security;
alter table public.shipping_exception_catalog force row level security;

revoke all on table public.shipping_exception_catalog from public, anon, authenticated;
drop policy if exists shipping_exception_service_all on public.shipping_exception_catalog;
create policy shipping_exception_service_all on public.shipping_exception_catalog
  for all to service_role using (true) with check (true);
grant select, insert, update on table public.shipping_exception_catalog to service_role;

create or replace function public.evaluate_offer_shipping(
  p_offer_id uuid,
  p_region_code text default null
)
returns table (
  eligible boolean,
  decision text,
  reason text,
  exception_id uuid,
  requires_manual_review boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_offer record;
  v_exception public.shipping_exception_catalog%rowtype;
  v_has_exception boolean := false;
  v_has_audit boolean := false;
begin
  select o.id, o.product_id, o.price_cents, o.shipping_cost_cents
    into v_offer
    from public.offers o
   where o.id = p_offer_id;

  if not found then
    return query select false, 'rejected'::text, 'offer_not_found'::text, null::uuid, false;
    return;
  end if;

  -- Comparação inteira, sem arredondamento percentual em ponto flutuante.
  if v_offer.shipping_cost_cents::bigint * 100
       <= v_offer.price_cents::bigint * 15 then
    return query select true, 'eligible'::text, 'shipping_within_15_percent'::text,
      null::uuid, false;
    return;
  end if;

  select e.* into v_exception
    from public.shipping_exception_catalog e
   where e.is_active
     and e.valid_from <= now()
     and (e.valid_until is null or e.valid_until > now())
     and e.reviewed_by is not null
     and e.reviewed_at is not null
     and (
       (e.exception_type = 'bulky_product' and e.product_id = v_offer.product_id)
       or
       (e.exception_type = 'remote_region' and p_region_code is not null
         and e.region_code = upper(btrim(p_region_code)))
     )
   order by case when e.exception_type = 'bulky_product' then 0 else 1 end,
            e.created_at desc
   limit 1;

  v_has_exception := found;

  if not v_has_exception then
    return query select false, 'rejected'::text, 'shipping_exceeds_15_percent_no_exception'::text,
      null::uuid, false;
    return;
  end if;

  -- A catalog entry alone never bypasses the rule. A manual audit must bind
  -- the offer, exception ID and exact SHA-256 evidence hash before eligibility.
  select exists (
    select 1
      from public.price_audit_logs a
     where a.offer_id = p_offer_id
       and a.action in ('concessao', 'renovacao')
       and a.rule_applied = 'shipping_exception:' || v_exception.id::text
       and a.rule_result = 'aprovado'
       and a.evidence_hash = v_exception.evidence_hash
       and a.origin = 'admin_aal2'
  ) into v_has_audit;

  if not v_has_audit then
    return query select false, 'manual_review_required'::text,
      'exception_catalogued_but_manual_audit_missing'::text, v_exception.id, true;
    return;
  end if;

  return query select true, 'eligible_by_exception'::text,
    'catalogued_exception_with_manual_audit'::text, v_exception.id, false;
end;
$$;

alter function public.evaluate_offer_shipping(uuid, text) owner to postgres;
revoke all on function public.evaluate_offer_shipping(uuid, text) from public, anon, authenticated;
grant execute on function public.evaluate_offer_shipping(uuid, text) to service_role;

comment on table public.shipping_exception_catalog is
  'Exceções específicas de frete; cada concessão exige revisão manual e evidência SHA-256 vinculada à auditoria da oferta.';
comment on function public.evaluate_offer_shipping(uuid, text) is
  'Avalia frete <= 15% em aritmética inteira; exceções nunca liberam selo sem log admin_aal2 com hash correspondente.';

commit;
