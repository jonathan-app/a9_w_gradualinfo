-- ===========================================================================
-- supabase/migrations/00000000000000_init.sql — esquema inicial
-- ===========================================================================
--
-- Regras que valem para toda migration deste arquivo:
--   1. Idempotente. `if not exists` em tudo: rodar duas vezes não pode
--      estragar o banco, porque `supabase db reset` pode ser executado de novo
--      a qualquer momento.
--   2. RLS ligado em toda tabela nova. Tabela sem RLS é tabela pública para o
--      anon key: qualquer pessoa com a chave do projeto lê a tabela inteira.
--   3. Policy separada para SELECT, INSERT, UPDATE e DELETE. Policy única com
--      `for all` costuma esconder regra de leitura que deveria ser pública e
--      escrita que deveria ser restrita.
--
-- Este é o exemplo mínimo: um perfil ligado ao `auth.users`. Copie o padrão ao
-- criar suas tabelas.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
-- Uma linha por usuário, com id igual ao id de auth.users. O RLS abaixo faz
-- o vínculo: o usuário só enxerga a própria linha.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público do usuário. id referencia auth.users.';

-- RLS ligado: desligado, a tabela é legível por qualquer um com a anon key.
alter table public.profiles enable row level security;

-- Leitura: o dono lê a própria linha.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Escrita: o dono altera a própria linha.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Trigger: criar o perfil junto com o usuário
-- ---------------------------------------------------------------------------
-- Sem isto, o usuário existe no auth mas não tem linha em profiles — e o
-- código da aplicação passa a depender de "e se o signup foi pelo formulário
-- e não pela API?".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
-- Trigger genérico: qualquer UPDATE passa a ter updated_at correto, sem
-- depender de o código da aplicação lembrar de atualizar o campo.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
