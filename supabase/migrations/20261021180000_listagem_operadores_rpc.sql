-- Spec 0036: Listagem paginada de operadores administrativos (junção servidor)
-- Adiciona a RPC de leitura public.list_admin_operadores.

create or replace function public.list_admin_operadores(
  p_root_id uuid,
  p_limit int,
  p_offset int
)
returns table (
  user_id uuid,
  email text,
  role public.admin_role_type,
  assigned_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with base as (
    select aur.user_id, u.email::text, aur.role, aur.created_at as assigned_at
    from public.admin_user_roles aur
    join auth.users u on u.id = aur.user_id
    where (p_root_id is null or aur.user_id <> p_root_id)
  ), total as (
    select count(*) as total_count from base
  ), paginado as (
    select base.user_id, base.email, base.role, base.assigned_at
    from base
    order by base.assigned_at desc, base.user_id asc
    limit least(greatest(p_limit, 1), 50)
    offset greatest(p_offset, 0)
  )
  select p.user_id, p.email, p.role, p.assigned_at, t.total_count
  from paginado p, total t
  union all
  select null::uuid, null::text, null::public.admin_role_type, null::timestamptz, t.total_count
  from total t
  where not exists (select 1 from paginado);
end;
$$;

alter function public.list_admin_operadores(uuid, int, int) owner to postgres;
revoke all on function public.list_admin_operadores(uuid, int, int) from public, anon, authenticated;
grant execute on function public.list_admin_operadores(uuid, int, int) to service_role;
