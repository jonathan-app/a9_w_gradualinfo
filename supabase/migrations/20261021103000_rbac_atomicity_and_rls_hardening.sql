-- ===========================================================================
-- 20261021103000_rbac_atomicity_and_rls_hardening.sql
-- Fechamento das Lacunas 5 (RBAC e auditoria transacional) e 6 (revisão histórica de RLS)
-- ===========================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1. Lacuna 5: Blindagem de admin_user_roles, serialização transacional e WORM
-- ---------------------------------------------------------------------------
-- Impede que qualquer papel (inclusive service_role) altere admin_user_roles
-- diretamente fora das RPCs transacionais assign_admin_role e revoke_admin_role.
alter table public.admin_user_roles enable row level security;
alter table public.admin_user_roles force row level security;

revoke all on table public.admin_user_roles from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.admin_user_roles from service_role;
grant select on table public.admin_user_roles to authenticated, service_role;

drop policy if exists "admin_user_roles_service_select" on public.admin_user_roles;
create policy "admin_user_roles_service_select" on public.admin_user_roles
  for select to service_role
  using (true);

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

-- Bloqueia TRUNCATE mesmo para sessões privilegiadas nas duas trilhas WORM
drop trigger if exists admin_audit_log_prevent_truncate on public.admin_audit_log;
create trigger admin_audit_log_prevent_truncate
  before truncate on public.admin_audit_log
  for each statement execute function public.tg_prevent_admin_audit_mutation();

drop trigger if exists trg_protect_price_audit_logs_truncate on public.price_audit_logs;
create trigger trg_protect_price_audit_logs_truncate
  before truncate on public.price_audit_logs
  for each statement execute function public.tg_prevent_audit_log_mutation();

-- RPC assign_admin_role com lock transacional por usuário-alvo e FOR UPDATE
create or replace function public.assign_admin_role(
  p_user_id uuid,
  p_role public.admin_role_type,
  p_actor_id uuid,
  p_actor_email text default null,
  p_ip_address text default null
)
returns public.admin_user_roles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.admin_user_roles;
  v_row public.admin_user_roles;
begin
  if p_user_id is null or p_role is null or p_actor_id is null then
    raise exception 'invalid_role_mutation_input' using errcode = '22023';
  end if;

  -- Serializa mutações concorrentes sobre o mesmo usuário-alvo na transação atual
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('admin_user_roles:' || p_user_id::text, 0)
  );

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'admin_user_not_found' using errcode = 'P0002';
  end if;

  select * into v_previous
  from public.admin_user_roles
  where user_id = p_user_id
  for update;

  insert into public.admin_user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, p_actor_id)
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_by = excluded.assigned_by
  returning * into v_row;

  insert into public.admin_audit_log (
    operation_id, actor_type, actor_id, actor_email, actor_role,
    action, resource_type, resource_id, metadata, ip_address, status
  ) values (
    gen_random_uuid(),
    'admin',
    p_actor_id::text,
    p_actor_email,
    'admin',
    case
      when v_previous.user_id is null then 'user.role_assigned'
      else 'user.role_changed'
    end,
    'user',
    p_user_id::text,
    jsonb_build_object(
      'previous_role', v_previous.role,
      'new_role', v_row.role
    ),
    p_ip_address,
    'success'
  );

  return v_row;
end;
$$;

-- RPC revoke_admin_role com lock transacional por usuário-alvo
create or replace function public.revoke_admin_role(
  p_user_id uuid,
  p_actor_id uuid,
  p_actor_email text default null,
  p_ip_address text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.admin_user_roles;
begin
  if p_user_id is null or p_actor_id is null then
    raise exception 'invalid_role_mutation_input' using errcode = '22023';
  end if;

  -- Serializa mutações concorrentes sobre o mesmo usuário-alvo na transação atual
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('admin_user_roles:' || p_user_id::text, 0)
  );

  delete from public.admin_user_roles
  where user_id = p_user_id
  returning * into v_previous;

  if v_previous.user_id is null then
    raise exception 'admin_role_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (
    operation_id, actor_type, actor_id, actor_email, actor_role,
    action, resource_type, resource_id, metadata, ip_address, status
  ) values (
    gen_random_uuid(),
    'admin',
    p_actor_id::text,
    p_actor_email,
    'admin',
    'user.role_removed',
    'user',
    p_user_id::text,
    jsonb_build_object('previous_role', v_previous.role),
    p_ip_address,
    'success'
  );
end;
$$;

alter function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  owner to postgres;
alter function public.revoke_admin_role(uuid, uuid, text, text)
  owner to postgres;

revoke all on function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.revoke_admin_role(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  to service_role;
grant execute on function public.revoke_admin_role(uuid, uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Lacuna 6: Endurecimento histórico de RLS, policies, grants e funções
-- ---------------------------------------------------------------------------

-- 2.1 public.profiles: fecha a segunda porta (grants explícitos + FORCE RLS + policy de serviço)
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

drop policy if exists "profiles_service_all" on public.profiles;
create policy "profiles_service_all" on public.profiles
  for all to service_role
  using (true)
  with check (true);

-- 2.2 Tabelas e view do módulo de ofertas: FORCE RLS e revogação explícita na view
alter table public.merchants force row level security;
alter table public.products force row level security;
alter table public.price_history force row level security;

revoke insert, update, delete, truncate, references, trigger
  on table public.active_offers_view
  from public, anon, authenticated;

-- 2.3 public.offers_ingest_nonces: policies explícitas, FORCE RLS, revogação de mutação e expurgo seguro
alter table public.offers_ingest_nonces enable row level security;
alter table public.offers_ingest_nonces force row level security;

revoke all on table public.offers_ingest_nonces from public, anon, authenticated, service_role;
grant select, insert on table public.offers_ingest_nonces to service_role;

drop policy if exists "offers_ingest_nonces_service_select" on public.offers_ingest_nonces;
create policy "offers_ingest_nonces_service_select" on public.offers_ingest_nonces
  for select to service_role
  using (true);

drop policy if exists "offers_ingest_nonces_service_insert" on public.offers_ingest_nonces;
create policy "offers_ingest_nonces_service_insert" on public.offers_ingest_nonces
  for insert to service_role
  with check (true);

create index if not exists idx_offers_ingest_nonces_consumed_at
  on public.offers_ingest_nonces (consumed_at);

create or replace function public.purge_expired_offers_ingest_nonces(
  p_retention interval default interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  -- Impõe piso mínimo de 10 minutos (2x a janela anti-replay de 300s)
  if p_retention is null or p_retention < interval '10 minutes' then
    raise exception 'retention_below_minimum_replay_window' using errcode = '22023';
  end if;

  delete from public.offers_ingest_nonces
  where consumed_at < now() - p_retention;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter function public.purge_expired_offers_ingest_nonces(interval) owner to postgres;
revoke all on function public.purge_expired_offers_ingest_nonces(interval)
  from public, anon, authenticated;
grant execute on function public.purge_expired_offers_ingest_nonces(interval)
  to service_role;

-- 2.4 public.offer_operation_keys: policies explícitas, FORCE RLS e bloqueio de UPDATE/DELETE/TRUNCATE
alter table public.offer_operation_keys enable row level security;
alter table public.offer_operation_keys force row level security;

revoke all on table public.offer_operation_keys from public, anon, authenticated, service_role;
grant select, insert on table public.offer_operation_keys to service_role;

drop policy if exists "offer_operation_keys_service_select" on public.offer_operation_keys;
create policy "offer_operation_keys_service_select" on public.offer_operation_keys
  for select to service_role
  using (true);

drop policy if exists "offer_operation_keys_service_insert" on public.offer_operation_keys;
create policy "offer_operation_keys_service_insert" on public.offer_operation_keys
  for insert to service_role
  with check (true);

-- 2.5 Funções históricas de trigger e SECURITY DEFINER: search_path vazio e revogação de PUBLIC
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.is_post_public(text) owner to postgres;
alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;

alter function public.tg_classify_price_history() owner to postgres;
revoke all on function public.tg_classify_price_history()
  from public, anon, authenticated, service_role;

commit;
