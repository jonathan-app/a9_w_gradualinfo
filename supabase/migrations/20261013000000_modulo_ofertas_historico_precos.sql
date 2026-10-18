-- ===========================================================================
-- 20261013000000_modulo_ofertas_historico_precos.sql
-- Fase 03 / Spec 0017 — preparação local; não aplicar em produção sem nova autorização.
-- ===========================================================================
begin;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domain text not null unique,
  logo_url text,
  affiliate_tag text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_merchant_domain check (
    domain = lower(domain)
    and domain !~ '[/:@[:space:]]'
    and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
    and domain !~ '(^\.|\.\.|\.$)'
  )
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  brand text not null,
  model_code text,
  category text not null,
  ean_upc text unique,
  specs_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_product_slug check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  title text not null,
  url text not null,
  affiliate_url text not null,
  price_cents integer not null check (price_cents > 0),
  original_price_cents integer check (
    original_price_cents is null or original_price_cents >= price_cents
  ),
  currency text not null default 'BRL' check (currency = 'BRL'),
  payment_method text not null default 'a_vista'
    check (payment_method in ('a_vista', 'parcelado')),
  installment_count integer not null default 1 check (installment_count >= 1),
  installment_price_cents integer check (
    installment_price_cents is null or installment_price_cents > 0
  ),
  coupon_code text,
  shipping_cost_cents integer not null default 0 check (shipping_cost_cents >= 0),
  badge_status text not null default 'unverified'
    check (badge_status in ('unverified', 'verified', 'expired', 'rejected')),
  badge_verified_at timestamptz,
  badge_expires_at timestamptz,
  verified_by text,
  status text not null default 'ativa'
    check (status in ('ativa', 'pausada', 'esgotada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_badge_consistency check (
    (badge_status = 'verified'
      and badge_verified_at is not null
      and badge_expires_at is not null
      and badge_expires_at = badge_verified_at + interval '24 hours')
    or (badge_status in ('unverified', 'expired', 'rejected')
      and badge_verified_at is null
      and badge_expires_at is null)
  )
);

create table if not exists public.price_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  price_cents integer not null check (price_cents > 0),
  payment_method text not null default 'a_vista'
    check (payment_method in ('a_vista', 'parcelado')),
  captured_at timestamptz not null default now(),
  source_type text not null default 'manual'
    check (source_type in ('manual', 'api_partner', 'verified_audit')),
  is_anomalous boolean not null default false
);

create index if not exists idx_price_history_query
  on public.price_history (product_id, merchant_id, payment_method, captured_at)
  where is_anomalous = false;

create index if not exists idx_price_history_daily_trunc
  on public.price_history (
    product_id, merchant_id, payment_method,
    ((captured_at at time zone 'UTC')::date)
  )
  where is_anomalous = false;

create table if not exists public.price_audit_logs (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete restrict,
  action text not null check (action in ('concessao', 'renovacao', 'revogacao', 'expiracao')),
  rule_applied text not null,
  rule_result text not null check (rule_result in ('aprovado', 'reprovado')),
  evaluated_price_cents integer not null check (evaluated_price_cents > 0),
  median_30d_cents integer check (median_30d_cents is null or median_30d_cents > 0),
  discount_percent numeric(5,2),
  origin text not null check (origin in ('admin_aal2', 'signed_webhook', 'automated_collector')),
  origin_actor_id text not null,
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  evidence_byte_size integer not null check (evidence_byte_size > 0),
  evidence_content_type text not null,
  evidence_storage_path text not null,
  notes text,
  checked_at timestamptz not null default now()
);

create or replace function public.tg_prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'price_audit_logs is append-only: UPDATE and DELETE are prohibited'
    using errcode = '55000';
end;
$$;
alter function public.tg_prevent_audit_log_mutation() owner to postgres;

drop trigger if exists trg_protect_price_audit_logs on public.price_audit_logs;
create trigger trg_protect_price_audit_logs
  before update or delete on public.price_audit_logs
  for each row execute function public.tg_prevent_audit_log_mutation();

create or replace function public.calculate_offer_median(
  p_product_id uuid,
  p_merchant_id uuid,
  p_payment_method text
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with daily_samples as (
    select distinct on (((h.captured_at at time zone 'UTC')::date))
      h.price_cents,
      ((h.captured_at at time zone 'UTC')::date) as utc_day
    from public.price_history h
    where h.product_id = p_product_id
      and h.merchant_id = p_merchant_id
      and h.payment_method = p_payment_method
      and h.captured_at >= now() - interval '30 days'
      and h.captured_at <= now()
      and h.is_anomalous = false
      and h.source_type in ('verified_audit', 'api_partner')
    order by ((h.captured_at at time zone 'UTC')::date), h.price_cents asc, h.captured_at asc, h.id asc
  )
  select percentile_cont(0.5) within group (order by price_cents)::integer
  from daily_samples
  having count(*) >= 5;
$$;
alter function public.calculate_offer_median(uuid, uuid, text) owner to postgres;

create or replace view public.active_offers_view
with (security_invoker = true) as
select
  o.id, o.product_id, o.merchant_id, o.title, o.price_cents,
  o.original_price_cents, o.currency, o.payment_method,
  o.installment_count, o.installment_price_cents, o.coupon_code,
  o.shipping_cost_cents,
  (o.badge_status = 'verified' and o.badge_expires_at > now()) as is_badge_verified,
  case
    when o.badge_status = 'verified' and o.badge_expires_at <= now() then 'expired'
    else o.badge_status
  end as effective_badge_status,
  o.badge_verified_at, o.badge_expires_at, o.status, o.created_at, o.updated_at
from public.offers o
where o.status = 'ativa';

-- RLS: políticas públicas de lectura y escritura de servicio explícitas.
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.price_history enable row level security;
alter table public.price_audit_logs enable row level security;
alter table public.offers force row level security;
alter table public.price_audit_logs force row level security;

drop policy if exists "merchants_select_active" on public.merchants;
create policy "merchants_select_active" on public.merchants
  for select to anon, authenticated using (is_active = true);
drop policy if exists "products_select_catalog" on public.products;
create policy "products_select_catalog" on public.products
  for select to anon, authenticated using (true);
drop policy if exists "offers_select_active" on public.offers;
create policy "offers_select_active" on public.offers
  for select to anon, authenticated using (status = 'ativa');
drop policy if exists "price_history_select_non_anomalous" on public.price_history;
create policy "price_history_select_non_anomalous" on public.price_history
  for select to anon, authenticated using (is_anomalous = false);
drop policy if exists "merchants_service_all" on public.merchants;
create policy "merchants_service_all" on public.merchants
  for all to service_role using (true) with check (true);
drop policy if exists "products_service_all" on public.products;
create policy "products_service_all" on public.products
  for all to service_role using (true) with check (true);
drop policy if exists "offers_service_all" on public.offers;
create policy "offers_service_all" on public.offers
  for all to service_role using (true) with check (true);
drop policy if exists "price_history_service_all" on public.price_history;
create policy "price_history_service_all" on public.price_history
  for all to service_role using (true) with check (true);
drop policy if exists "price_audit_service_insert" on public.price_audit_logs;
create policy "price_audit_service_insert" on public.price_audit_logs
  for insert to service_role with check (true);
drop policy if exists "price_audit_service_select" on public.price_audit_logs;
create policy "price_audit_service_select" on public.price_audit_logs
  for select to service_role using (true);

revoke all on table public.price_audit_logs from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table
  public.merchants, public.products, public.offers, public.price_history
  from public, anon, authenticated;
grant select on table public.merchants, public.products, public.offers, public.price_history
  to anon, authenticated;
grant select on table public.active_offers_view to anon, authenticated;

revoke update, delete, truncate on table public.price_audit_logs from public, anon, authenticated, service_role;
grant insert, select on table public.price_audit_logs to service_role;
revoke all on function public.tg_prevent_audit_log_mutation() from public, anon, authenticated, service_role;
revoke execute on function public.calculate_offer_median(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.calculate_offer_median(uuid, uuid, text) to service_role;

comment on table public.merchants is 'Lojistas credenciados e allowlist de domínio para redirecionamento seguro.';
comment on table public.products is 'Catálogo canônico com identificação de variante e SKU.';
comment on table public.offers is 'Ofertas comerciais; preços armazenados em centavos inteiros.';
comment on table public.price_history is 'Eventos brutos de preço; agregação estatística consolida uma amostra diária UTC.';
comment on table public.price_audit_logs is 'Auditoria append-only de decisões do selo Preço Verificado.';
comment on view public.active_offers_view is 'Ofertas ativas com estado efetivo do selo calculado em tempo de consulta.';

commit;
