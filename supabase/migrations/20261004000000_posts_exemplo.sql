-- ===========================================================================
-- supabase/migrations/20261004000000_posts_exemplo.sql — exemplo de tabela
-- ===========================================================================
--
-- Tabela de exemplo que demonstra os padrões obrigatórios do projeto em uma
-- tabela com leitura pública:
--   1. RLS ligado, com policy por operação.
--   2. Função SECURITY DEFINER com `SET search_path = ''`, REVOKE ALL FROM
--      PUBLIC e GRANT EXECUTE explícito — sem isso, a função herda o que o
--      chamador pode executar (execução como privilégio vazado) ou recursa
--      na própria RLS.
--   3. Trigger de updated_at para nenhuma escrita esquecer o timestamp.
--   4. Índices nas colunas usadas em filtro e ordenação.
--   5. COMMENT em tabela, coluna e função — o catálogo é a documentação.
-- ===========================================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicado', 'arquivado')),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

comment on table public.posts is
  'Conteúdo de exemplo. Leitura pública restrita a status publicado com published_at no passado.';
comment on column public.posts.status is
  'rascunho, publicado ou arquivado. publicado só é público se published_at <= now().';
comment on column public.posts.published_at is
  'Data de publicação; NULL mantém o post invisível ao público mesmo com status publicado.';

alter table public.posts enable row level security;

-- Público: só o que já está publicado. published_at no futuro impede vazar
-- agendamento antes da hora.
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts
  for select
  using (status = 'publicado' and published_at is not null and published_at <= now());

-- Autor autenticado lê a própria linha em qualquer estado.
drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own" on public.posts
  for select to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete to authenticated
  using ((select auth.uid()) = author_id);

-- ---------------------------------------------------------------------------
-- is_post_public: predicado SECURITY DEFINER usado em políticas futuras.
-- search_path = '' força referência qualificada (public.posts): com caminho
-- aberto, um objeto criado por um atacante em outro schema sequestraria a
-- resolução de nome dentro da função.
-- ---------------------------------------------------------------------------
create or replace function public.is_post_public(post_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts
    where slug = post_slug
      and status = 'publicado'
      and published_at is not null
      and published_at <= now()
  );
$$;

comment on function public.is_post_public(text) is
  'True quando o post está publicado e com published_at no passado. Predicado de política; não usar como autorização no cliente.';

-- EXECUTE implícito do PUBLIC vazaria a função para anon e authenticated.
-- É um predicado invocado pelas políticas, então os papéis que consultam
-- precisam dele — e só eles.
revoke all on function public.is_post_public(text) from public;
grant execute on function public.is_post_public(text) to anon, authenticated, service_role;

-- updated_at em toda escrita.
create or replace function public.set_post_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_post_updated_at();

create index if not exists idx_posts_slug on public.posts (slug);
create index if not exists idx_posts_status on public.posts (status);
-- A listagem ordena por created_at desc paginado; o composto evita ordenar
-- o conjunto inteiro a cada página.
create index if not exists idx_posts_status_created_at
  on public.posts (status, created_at desc);
