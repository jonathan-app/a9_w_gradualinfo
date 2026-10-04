-- supabase/tests/rls_posts_test.sql
-- Verificação de RLS de posts. Roda com `pnpm supabase:test` após `db reset`.
--
-- A razão de isto ser arquivo versionado: uma política quebrada que deixa a
-- tabela sem leitura não é detectada por nenhum teste do repositório, e
-- reaplicar scripts antigos a reintroduz sem aviso.
--
-- Duas armadilhas que moldaram as asserções:
--   - O dono da tabela ignora RLS. Toda verificação de dados roda com
--     `set local role anon`; o papel do dono só é usado no catálogo.
--   - RLS não levanta erro em UPDATE nem DELETE: linhas que falham no USING
--     são silenciosamente ignoradas. Só INSERT com WITH CHECK viola.

BEGIN;

SELECT plan(12);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{}';

SELECT is(
  (SELECT count(*)::int FROM posts),
  7,
  'anon vê os 7 publicados com published_at no passado'
);

SELECT is_empty(
  $$ SELECT slug FROM posts WHERE status = 'rascunho' $$,
  'anon não lê rascunho'
);

SELECT is_empty(
  $$ SELECT slug FROM posts WHERE published_at > NOW() $$,
  'anon não lê post agendado para o futuro'
);

SELECT is_empty(
  $$ SELECT slug FROM posts WHERE status = 'arquivado' $$,
  'anon não lê post arquivado'
);

UPDATE posts SET title = 'invadido';
SELECT is_empty(
  $$ SELECT slug FROM posts WHERE title = 'invadido' $$,
  'UPDATE anônimo não escreve em nenhuma linha'
);

DELETE FROM posts;
SELECT is(
  (SELECT count(*)::int FROM posts),
  7,
  'DELETE anônimo não apaga nenhuma linha'
);

SELECT throws_ok(
  $$ INSERT INTO posts (title, slug, status) VALUES ('invadido', 'invadido', 'publicado') $$,
  '42501',
  NULL,
  'INSERT anônimo viola RLS'
);

SELECT is(
  public.is_post_public(NULL),
  false,
  'is_post_public é falso para slug inexistente/nulo'
);

RESET ROLE;

SELECT ok(
  (SELECT prosecdef FROM pg_proc
    WHERE proname = 'is_post_public' AND pronamespace = 'public'::regnamespace),
  'is_post_public é SECURITY DEFINER, senão reavaliaria RLS e recursaria'
);

-- O Postgres guarda o caminho vazio com as aspas: proconfig é {"search_path=\"\""}.
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=""']
    FROM pg_proc WHERE proname = 'is_post_public' AND pronamespace = 'public'::regnamespace),
  'is_post_public tem search_path vazio, não apenas fixado em public'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p, aclexplode(p.proacl) a
    WHERE p.proname = 'is_post_public'
      AND p.pronamespace = 'public'::regnamespace
      AND a.grantee = 0
  ),
  'is_post_public não concede EXECUTE implícito ao PUBLIC'
);

-- Por catálogo, não por comment. Toda função SECURITY DEFINER de public sem
-- search_path vazio reprova este teste.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef
      AND (p.proconfig IS NULL OR NOT p.proconfig @> ARRAY['search_path=""'])
  ),
  'toda função SECURITY DEFINER de public tem search_path vazio'
);

SELECT * FROM finish();

ROLLBACK;
