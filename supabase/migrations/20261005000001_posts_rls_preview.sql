-- ===========================================================================
-- supabase/migrations/20261005000001_posts_rls_preview.sql
-- ===========================================================================
--
-- Fecha as regras de acesso de `posts`: sai escrita para papel não privilegiado,
-- entra a segunda policy de leitura, e os `grant` passam a ser explícitos.
--
-- Quatro decisões que o `md-0001` fixa e que o código abaixo existe para provar:
--
--   1. AUSÊNCIA DE POLICY E AUSÊNCIA DE GRANT SÃO AS DUAS COISAS. Policy sem
--      grant não impede nada, e grant sem policy permite tudo se a RLS for
--      desligada por engano. No estado anterior, `anon` e `authenticated` tinham
--      INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER em `posts` por
--      default privilege do Supabase — ou seja, bastava um `alter table ... disable
--      row level security` acidental para a tabela ficar aberta. O `revoke`
--      explícito é o que fecha a segunda porta.
--
--   2. PREVIEW É `authenticated` COM CLAIM, NÃO PAPEL NOVO. Não existe papel
--      `preview` no Supabase, e nenhuma variável de ambiente cria papel. A
--      credencial troca por sessão, e a sessão é o que a RLS entende. A claim é
--      lida de `app_metadata` e **nunca** de `user_metadata`: `user_metadata` é
--      gravável pelo próprio usuário, então usá-la daria a qualquer um o
--      privilégio de ler rascunho editando o próprio perfil.
--
--   3. POLICIES SEPARADAS, SEM `OR` DENTRO. Policy com `OR` esconde a diferença
--      entre "vê rascunho" e "não vê", que é a coisa mais importante desta
--      tabela. Revisar duas policies separadas é ler duas regras; revisar uma com
--      `OR` é reconstruir a tabela de verdade de quem lê o quê.
--
--   4. `posts_select_public` NÃO É RECRIADA. A cláusula
--      `status = 'publicado' and published_at is not null and published_at <= now()`
--      já resolve agendamento — artigo com data futura existe e é invisível ao
--      público — e recriá-la seria trocar uma regra testada por uma cópia.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Leitura: pública e de preview
-- ---------------------------------------------------------------------------
-- As quatro policies `*_own` não são repetidas aqui: elas saíram na migration do
-- schema porque citavam `author_id`, e o `drop column` depende delas. Este arquivo
-- cuida do que é decisão de acesso, não de dependência de catálogo.
--
-- `posts_select_public` não é recriada: a cláusula
-- `status = 'publicado' and published_at is not null and published_at <= now()`
-- já resolve agendamento — artigo com data futura existe e é invisível ao
-- público — e recriá-la seria trocar uma regra testada por uma cópia.
drop policy if exists "posts_select_preview" on public.posts;
create policy "posts_select_preview" on public.posts
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'preview') = 'true');

comment on policy "posts_select_preview" on public.posts is
  'Leitura de preview: tudo, inclusive rascunho, arquivado e agendado. Exige authenticated com app_metadata.preview = true, que só o service_role escreve.';

-- ---------------------------------------------------------------------------
-- Grants explícitos
-- ---------------------------------------------------------------------------
-- `revoke all` antes do `grant select`: revogar tudo e devolver só a leitura
-- impede que um privilégio antigo ou herdado continue valendo por ter ficado de
-- fora do comando. `service_role` mantém o que tem e não entra aqui — é o papel
-- que publica por migration, e ele burla a RLS por definição.
revoke all on table public.posts from anon, authenticated;
grant select on table public.posts to anon, authenticated;

-- A função é predicado de policy, então os papéis que consultam precisam poder
-- chamá-la. `revoke all` na tabela não afeta privilégio de função, e o grant
-- explícito de execução continua valendo da migration de 2026-10-04.
--
-- `public` (o pseudo-papel de todos) fica intacto de propósito: no Supabase o
-- `service_role` pode herdar o que tem de `PUBLIC`, e revogar sem re-verificar
-- quebraria o caminho de publicação sem nenhuma policy envolvida. O que este
-- arquivo garante é o contrário: nenhum papel **não privilegiado** tem escrita.