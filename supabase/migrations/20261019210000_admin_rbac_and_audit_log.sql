-- Spec 0032: Backend Administrativo, RBAC e Trilha de Auditoria Duravel
-- Migration para papeis em admin_user_roles e trilha append-only em admin_audit_log

-- 1. Tipo de papel, idempotente para reset local e reaplicacao
do $$
begin
  create type public.admin_role_type as enum ('admin', 'editor', 'revisor');
exception
  when duplicate_object then null;
end
$$;

-- 2. Papeis administrativos, isolados de profiles
create table if not exists public.admin_user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role_type not null,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_roles enable row level security;
revoke all on table public.admin_user_roles from public, anon, authenticated;
grant select on table public.admin_user_roles to authenticated, service_role;

drop policy if exists "admin_user_roles_select_own" on public.admin_user_roles;
create policy "admin_user_roles_select_own" on public.admin_user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists admin_user_roles_set_updated_at on public.admin_user_roles;
create trigger admin_user_roles_set_updated_at
  before update on public.admin_user_roles
  for each row execute function public.set_updated_at();

-- 3. Helper de leitura administrativa. SECURITY DEFINER evita recursao de RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

-- 4. Trilha append-only
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid,
  actor_type text not null check (actor_type in ('admin', 'system')),
  actor_id text not null check (length(actor_id) between 1 and 128),
  actor_email text check (actor_email is null or length(actor_email) <= 320),
  actor_role public.admin_role_type,
  action text not null check (length(action) between 1 and 120),
  resource_type text not null check (
    resource_type in ('article', 'offer', 'user', 'auth', 'preview', 'system')
  ),
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text check (ip_address is null or length(ip_address) <= 45),
  status text not null default 'success' check (status in ('intent', 'success', 'failure')),
  created_at timestamptz not null default now(),
  constraint admin_audit_actor_shape check (
    (actor_type = 'admin' and actor_role is not null)
    or (actor_type = 'system' and actor_role is null)
  )
);

create unique index if not exists uq_admin_audit_operation_status
  on public.admin_audit_log (operation_id, status) where operation_id is not null;
create index if not exists idx_admin_audit_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_actor
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists idx_admin_audit_resource
  on public.admin_audit_log (resource_type, resource_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;
grant select on table public.admin_audit_log to authenticated;
grant select, insert on table public.admin_audit_log to service_role;
revoke update, delete, truncate on table public.admin_audit_log from service_role;

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin_audit_log_select_own" on public.admin_audit_log;
create policy "admin_audit_log_select_own" on public.admin_audit_log
  for select to authenticated
  using (actor_id = (select auth.uid())::text);

drop policy if exists "admin_audit_log_service_select" on public.admin_audit_log;
create policy "admin_audit_log_service_select" on public.admin_audit_log
  for select to service_role
  using (true);

drop policy if exists "admin_audit_log_service_insert" on public.admin_audit_log;
create policy "admin_audit_log_service_insert" on public.admin_audit_log
  for insert to service_role
  with check (true);

create or replace function public.tg_prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only: UPDATE and DELETE are prohibited'
    using errcode = '55000';
end;
$$;

alter function public.tg_prevent_admin_audit_mutation() owner to postgres;
revoke all on function public.tg_prevent_admin_audit_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists admin_audit_log_prevent_mutation on public.admin_audit_log;
create trigger admin_audit_log_prevent_mutation
  before update or delete on public.admin_audit_log
  for each row execute function public.tg_prevent_admin_audit_mutation();

-- 5. Funcoes de gestao de papel (RPCs transacionais)
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
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'admin_user_not_found' using errcode = 'P0002';
  end if;

  select * into v_previous
  from public.admin_user_roles
  where user_id = p_user_id;

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
