-- ===========================================================================
-- supabase/migrations/20261005000000_posts_schema_editorial.sql
-- ===========================================================================
--
-- Transforma a tabela de exemplo `posts` no schema editorial do `md-0001`. Não
-- cria nada do zero: a tabela existe desde 2026-10-04 e o dono aprovou a
-- transformação em vez de superseder. Por isso esta migration é `alter table`
-- do começo ao fim, e por isso ela é executada sobre linhas que já existem.
--
-- Três invariantes que mudam como cada passo é escrito:
--
--   1. DADOS PRESERVADOS. Nenhuma coluna nova entra como `not null` antes do
--      backfill, e nenhuma linha é apagada. Uma coluna `not null` em tabela com
--      linhas falha no meio da migration e deixa o banco num estado intermediário
--      que ninguém sabe descrever; por isso a ordem é: coluna nulável, backfill,
--      endurecer.
--   2. O QUE EXISTE E É BOM FICA. `created_at`, os três índices, o trigger de
--      `updated_at`, a função `is_post_public` e todos os `COMMENT` permanecem.
--      `created_at` está no índice `(status, created_at desc)` e é o campo mais
--      útil para depurar linha; `arquivado` continua em `status`, decidido pelo
--      dono, porque artigo publicado que precisa sair do ar sem ser apagado é
--      caso editorial real.
--   3. `CHECK` NÃO ACEITA SUBCONSULTA. A validação de `fontes_citadas` precisa
--      percorrer o array, então ela vive numa função `immutable` chamada pelo
--      `CHECK`. Declarar a regra dentro do `CHECK` é erro de sintaxe do
--      PostgreSQL, não escolha de estilo.
--
-- Idempotente, como toda migration deste repositório: `supabase db reset` pode
-- ser executado a qualquer momento.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas do schema editorial
-- ---------------------------------------------------------------------------
-- Nuláveis nesta ordem de propósito: o passo 2 preenche, o passo 3 endurece.
alter table public.posts add column if not exists author_name text;
alter table public.posts add column if not exists editoria text;
alter table public.posts add column if not exists cover_image_url text;

-- `fontes_citadas` é a única que entra já not null: o default `[]` é a resposta
-- ao caso normal de artigo sem fonte, e o AC-07 precisa distinguir "sem fontes"
-- de "campo ausente".
alter table public.posts
  add column if not exists fontes_citadas jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. `author_id` sai
-- ---------------------------------------------------------------------------
-- O MVP não tem cadastro nem login, então `author_id` não teria tabela de perfis
-- para apontar e ficaria órfão. O custo é o nome não acompanhar uma renomeação
-- futura, o que hoje é impossível porque não existe tela para renomear. Se o
-- produto ganhar contas, isto vira migração para uma tabela de perfis.
--
-- As quatro policies `*_own` citam `author_id` — a de leitura pelo dono da linha,
-- as três de escrita por compararem `(select auth.uid()) = author_id` —, e
-- **qualquer** delas impede o `drop column`. Elas saem todas aqui, e não por
-- gosto: é dependência de catálogo. A RLS em si, a policy pública e os `grant`
-- são trabalho da migration seguinte.
drop policy if exists "posts_select_own" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

alter table public.posts drop column if exists author_id;

-- ---------------------------------------------------------------------------
-- 3. Backfill das linhas que já existem
-- ---------------------------------------------------------------------------
-- Só toca linha que está fora do formato novo. Em banco criado pelo `reset` não
-- há linha nenhuma aqui — o seed roda depois —, então estes passos são o que
-- permite reaplicar a migration sobre o estado de `main`, que é o AC-06.
--
-- Os valores de cobertura não são conteúdo inventado: a raiz do domínio é uma
-- URL absoluta verdadeira, e `sem-editoria` declara o que a linha é, em vez de
-- inventar uma classificação editorial que ninguém fez.
update public.posts set excerpt = '' where excerpt is null;
update public.posts set content = '' where content is null;
update public.posts set title = 'Sem título' where btrim(coalesce(title, '')) = '';
update public.posts set slug = lower(slug) where slug <> lower(slug);
update public.posts
  set author_name = 'GradualInfo Editorial' where author_name is null;
update public.posts set editoria = 'sem-editoria' where editoria is null;
update public.posts
  set cover_image_url = 'https://gradualinfo.com.br/'
  where cover_image_url is null or btrim(cover_image_url) = '';

-- ---------------------------------------------------------------------------
-- 4. Endurecer
-- ---------------------------------------------------------------------------
alter table public.posts alter column excerpt set not null;
alter table public.posts alter column content set not null;
alter table public.posts alter column author_name set not null;
alter table public.posts alter column editoria set not null;
alter table public.posts alter column cover_image_url set not null;

-- ---------------------------------------------------------------------------
-- 5. Validação de `fontes_citadas`
-- ---------------------------------------------------------------------------
-- Array de `{ titulo, url }`, com `url` absoluta. Array e não texto livre porque
-- a fonte precisa ser linkada e conferida; `CHECK` em vez de validação no
-- código porque a escrita do MVP é migration, e migration que erra a fonte
-- escreve link quebrado no site sem ninguém ver.
create or replace function public.fontes_citadas_validas(fontes jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(fontes) = 'array'
    and jsonb_array_length(fontes) <= 100
    and not exists (
      select 1
      from jsonb_array_elements(fontes) as fonte
      where jsonb_typeof(fonte) <> 'object'
         or not jsonb_exists(fonte, 'titulo')
         or not jsonb_exists(fonte, 'url')
         or jsonb_typeof(fonte -> 'titulo') <> 'string'
         or jsonb_typeof(fonte -> 'url') <> 'string'
         or btrim(fonte ->> 'titulo') = ''
         or (fonte ->> 'url') !~ '^https?://[^[:space:]]+$'
    );
$$;

comment on function public.fontes_citadas_validas(jsonb) is
  'True quando fontes_citadas é array de { titulo, url } com url absoluta. Validador do CHECK da coluna; não é autorização.';

-- ---------------------------------------------------------------------------
-- 6. Constraints
-- ---------------------------------------------------------------------------
-- `slug` minúsculo: a URL pública é o slug, e `Meu-Artigo` e `meu-artigo`
-- quebram o SEO da mesma página sem erro nenhum.
alter table public.posts drop constraint if exists posts_slug_lowercase;
alter table public.posts
  add constraint posts_slug_lowercase check (slug = lower(slug));

alter table public.posts drop constraint if exists posts_title_not_blank;
alter table public.posts
  add constraint posts_title_not_blank check (length(btrim(title)) > 0);

-- Capa absoluta: o `og:image` do SEO básico é essa URL, e uma URL relativa
-- quebra o card de qualquer rede social que consuma a página.
alter table public.posts drop constraint if exists posts_cover_image_url_absolute;
alter table public.posts
  add constraint posts_cover_image_url_absolute
  check (cover_image_url ~ '^https?://[^[:space:]]+$');

alter table public.posts drop constraint if exists posts_fontes_citadas_form;
alter table public.posts
  add constraint posts_fontes_citadas_form
  check (public.fontes_citadas_validas(fontes_citadas));

-- ---------------------------------------------------------------------------
-- 7. Índice de listagem
-- ---------------------------------------------------------------------------
-- O AC-01 pede ordenação por `published_at` descendente com `status` como
-- coluna de apoio: é a query da home e da listagem por editoria. O índice
-- `(status, created_at desc)` continua existindo e não é substituído — ele
-- serve a ordenação administrativa por data de criação.
create index if not exists idx_posts_status_published_at
  on public.posts (status, published_at desc);

-- ---------------------------------------------------------------------------
-- 8. Catálogo
-- ---------------------------------------------------------------------------
-- Os `COMMENT` de `20261004000000_posts_exemplo.sql` são preservados como estão,
-- por decisão explícita. Os novos descrevem as colunas novas.
comment on column public.posts.author_name is
  'Nome do autor, em texto. Substitui author_id porque o MVP não tem cadastro; vira migração para tabela de perfis se o produto ganhar contas.';
comment on column public.posts.editoria is
  'Editoria em texto livre no MVP, sem lista fechada. A taxonomia controlada é a fatia 9.';
comment on column public.posts.cover_image_url is
  'URL absoluta da imagem de capa. Alimenta o og:image do SEO básico e o card da home.';
comment on column public.posts.fontes_citadas is
  'Array JSON de { titulo, url } com url absoluta; default vazio. Sem fonte é caso normal, e o AC-07 do md-0002 obriga a exibi-las.';
comment on column public.posts.slug is
  'Identificador da URL pública. Unique e minúsculo por constraint; minúsculo porque a URL é o slug.';
comment on column public.posts.title is
  'Título do artigo. Não vazio por constraint.';
comment on column public.posts.created_at is
  'Criação da linha, preservada da tabela de exemplo. Base do índice administrativo (status, created_at desc).';