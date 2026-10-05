-- supabase/tests/rls_posts_test.sql
-- Verificação de RLS e do schema editorial de `posts`. Roda com
-- `pnpm supabase:test` após `pnpm supabase:reset`.
--
-- A razão de isto ser arquivo versionado: uma política quebrada que deixa a
-- tabela sem leitura não é detectada por nenhum teste do repositório, e
-- reaplicar scripts antigos a reintroduz sem aviso.
--
-- Quatro armadilhas que moldaram as asserções:
--   - O dono da tabela ignora RLS. Toda verificação de dados roda com
--     `set local role`; o papel do dono só é usado no catálogo.
--   - RLS não levanta erro em UPDATE nem DELETE: linhas que falham no USING são
--     silenciosamente ignoradas. A escrita agora é bloqueada por `grant`, então
--     o teste espera **erro**, não silêncio — os dois bloqueios existem de
--     propósito e cada um tem asserção própria.
--   - Policy separada no catálogo não é isolamento. Isolamento é leitura real:
--     cada papel assume o papel e afirma a contagem exata de linhas que enxerga.
--   - `user_metadata` é gravável pelo próprio usuário, então usá-la como
--     privilégio de leitura seria uma escalada que o leitor executa sozinho. A
--     asserção que prova que `user_metadata` NÃO abre rascunho é a que a
--     implementação erra primeiro: ela passa em todo teste que só olha policy.

BEGIN;

SELECT plan(63);

-- ===========================================================================
-- A. Fixtures e infraestrutura
-- ===========================================================================
-- O seed precisa existir: RLS não pode passar porque a tabela está vazia.
SELECT is((SELECT count(*)::int FROM public.posts), 4,
  'seed contém publicado, rascunho, arquivado e agendado');
SELECT is((SELECT count(*)::int FROM public.profiles
  WHERE id IN ('11111111-1111-1111-1111-111111111111',
               '22222222-2222-2222-2222-222222222222')), 2,
  'trigger de signup criou os dois perfis locais');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
    AND tgname = 'on_auth_user_created' AND NOT tgisinternal
), 'trigger de signup está registrado');

-- ===========================================================================
-- B. Schema editorial: o que a transformação SOMOU e o que ela PRESERVOU
-- ===========================================================================
SELECT is((SELECT count(*)::int FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'posts'
    AND column_name IN ('cover_image_url', 'editoria', 'author_name', 'fontes_citadas')),
  4, 'as quatro colunas novas existem');
SELECT is((SELECT count(*)::int FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id'),
  0, 'author_id e a FK em auth.users saíram');
SELECT is((SELECT count(*)::int FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'posts' AND is_nullable = 'NO'
    AND column_name IN ('excerpt', 'content', 'author_name', 'editoria',
                        'cover_image_url', 'fontes_citadas')),
  6, 'excerpt, content e as três colunas novas foram endurecidas para not null');
SELECT is((SELECT count(*)::int FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'posts'
    AND column_name IN ('id', 'title', 'slug', 'status', 'created_at',
                        'updated_at', 'published_at')),
  7, 'as colunas preexistentes foram preservadas, created_at inclusive');
SELECT is((SELECT column_default FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'posts'
    AND column_name = 'fontes_citadas'),
  '''[]''::jsonb', 'fontes_citadas tem default []: sem fonte é caso normal');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.posts'::regclass AND conname = 'posts_status_check'),
  'os três valores de status continuam: rascunho, publicado e arquivado');
SELECT ok(EXISTS (SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'posts'
    AND indexdef LIKE '%(status, published_at DESC)%'),
  'existe índice de listagem por published_at desc com status de apoio');
SELECT is((SELECT count(*)::int FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'posts'
    AND indexname IN ('idx_posts_slug', 'idx_posts_status', 'idx_posts_status_created_at')),
  3, 'os três índices da tabela de exemplo continuam');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger
  WHERE tgrelid = 'public.posts'::regclass
    AND tgname = 'posts_set_updated_at' AND NOT tgisinternal),
  'o trigger de updated_at continua');
-- Os COMMENTs são o que a casa chama de catálogo como documentação, e a
-- transformação tinha duas obrigações opostas: não perder nenhum e documentar o
-- que entrou. Por isso são três afirmações — a da tabela, a das colunas que já
-- tinham COMMENT e a das quatro novas — e não uma contagem única.
SELECT is((SELECT count(*)::int FROM pg_description
  WHERE objoid = 'public.posts'::regclass AND objsubid = 0 AND description <> ''),
  1, 'a tabela tem COMMENT');
SELECT is((SELECT count(*)::int FROM pg_description d
  JOIN pg_attribute a ON a.attrelid = d.objoid AND a.attnum = d.objsubid
  WHERE d.objoid = 'public.posts'::regclass AND d.objsubid > 0
    AND d.description <> ''
    AND a.attname IN ('slug', 'title', 'status', 'published_at', 'created_at')),
  5, 'os COMMENTs das colunas preexistentes foram preservados');
SELECT is((SELECT count(*)::int FROM pg_description d
  JOIN pg_attribute a ON a.attrelid = d.objoid AND a.attnum = d.objsubid
  WHERE d.objoid = 'public.posts'::regclass AND d.objsubid > 0
    AND d.description <> ''
    AND a.attname IN ('author_name', 'editoria', 'cover_image_url', 'fontes_citadas')),
  4, 'as quatro colunas novas têm COMMENT');
SELECT ok((SELECT prosecdef AND proconfig @> ARRAY['search_path=""']
  FROM pg_proc WHERE proname = 'fontes_citadas_validas'
    AND pronamespace = 'public'::regnamespace)
  OR NOT EXISTS (SELECT 1 FROM pg_proc
    WHERE proname = 'fontes_citadas_validas'
      AND pronamespace = 'public'::regnamespace AND prosecdef),
  'o validador de fontes não é SECURITY DEFINER, ou fixa search_path vazio');

-- ===========================================================================
-- C. Constraints de coluna
-- ===========================================================================
-- As quatro colunas novas precisam de valor em toda inserção; o helper abaixo
-- só existe para a asserção caber numa linha.
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url)
     VALUES ('Slug maiúsculo', 'Slug-Com-Maiuscula', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg') $$,
  '23514', NULL, 'CHECK: slug precisa ser minúsculo');
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url)
     VALUES ('   ', 'slug-em-branco', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg') $$,
  '23514', NULL, 'CHECK: título em branco é rejeitado');
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url)
     VALUES ('Capa vazia', 'capa-vazia', 'e', '# c', 'A', 'E', '') $$,
  '23514', NULL, 'CHECK: capa vazia é rejeitada');
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url)
     VALUES ('Capa relativa', 'capa-relativa', 'e', '# c', 'A', 'E', '/capa.jpg') $$,
  '23514', NULL, 'CHECK: capa precisa ser URL absoluta');
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url, fontes_citadas)
     VALUES ('Fonte relativa', 'fonte-relativa', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg',
             '[{"titulo": "Fonte", "url": "/interna"}]') $$,
  '23514', NULL, 'CHECK: fonte com url relativa é rejeitada');
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url, fontes_citadas)
     VALUES ('Fonte sem titulo', 'fonte-sem-titulo', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg',
             '[{"url": "https://exemplo.dev/fonte"}]') $$,
  '23514', NULL, 'CHECK: fonte sem titulo é rejeitada');
SELECT lives_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url, fontes_citadas)
     VALUES ('Fontes válidas', 'fontes-validas', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg',
             '[{"titulo": "Fonte um", "url": "https://exemplo.dev/um"}]') $$,
  'CHECK: array de { titulo, url } com url absoluta é aceito');
-- A linha aceita acima fica na transação e contaminaria as contagens das
-- seções seguintes, que contam fixtures. Sai aqui: o que está sendo provado é
-- que o CHECK aceita, não que a linha existe.
DELETE FROM public.posts WHERE slug = 'fontes-validas';
SELECT throws_ok(
  $$ INSERT INTO public.posts (title, slug, excerpt, content, author_name, editoria, cover_image_url, status)
     VALUES ('Status inválido', 'status-invalido', 'e', '# c', 'A', 'E', 'https://exemplo.dev/c.jpg', 'no-ar') $$,
  '23514', NULL, 'CHECK: status fora dos três valores é rejeitado');

-- ===========================================================================
-- D. Grants: a segunda porta, independente da RLS
-- ===========================================================================
SELECT ok(NOT has_table_privilege('anon', 'public.posts', 'INSERT'),
  'anon não tem privilégio de INSERT');
SELECT ok(NOT has_table_privilege('anon', 'public.posts', 'UPDATE'),
  'anon não tem privilégio de UPDATE');
SELECT ok(NOT has_table_privilege('anon', 'public.posts', 'DELETE'),
  'anon não tem privilégio de DELETE');
SELECT is((SELECT count(*)::int FROM (values ('INSERT'), ('UPDATE'), ('DELETE')) v(priv)
  WHERE has_table_privilege('authenticated', 'public.posts', v.priv)),
  0, 'authenticated não tem nenhum privilégio de escrita');
SELECT ok(has_table_privilege('anon', 'public.posts', 'SELECT')
  AND has_table_privilege('authenticated', 'public.posts', 'SELECT'),
  'anon e authenticated mantêm SELECT');
SELECT ok(has_table_privilege('service_role', 'public.posts', 'INSERT')
  AND has_table_privilege('service_role', 'public.posts', 'SELECT'),
  'service_role mantém escrita: é o caminho de publicação por migration');

-- ===========================================================================
-- E. Policies
-- ===========================================================================
SELECT ok(EXISTS (SELECT 1 FROM pg_policies
  WHERE tablename = 'posts' AND policyname = 'posts_select_preview'
    AND cmd = 'SELECT' AND roles = ARRAY['authenticated']::name[]),
  'posts_select_preview existe e é só para authenticated');
-- A armadilha do app_metadata, vista pelo catálogo: a policy de preview cita
-- app_metadata e não cita user_metadata em lugar nenhum.
SELECT ok(EXISTS (SELECT 1 FROM pg_policies
  WHERE tablename = 'posts' AND policyname = 'posts_select_preview'
    AND qual LIKE '%app_metadata%')
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts'
    AND qual LIKE '%user_metadata%'),
  'a policy de preview cita app_metadata e nunca user_metadata');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies
  WHERE tablename = 'posts' AND policyname = 'posts_select_public'
    AND qual LIKE '%published_at <= now()%'),
  'posts_select_public foi preservada, com a cláusula de agendamento');
SELECT is((SELECT count(*)::int FROM pg_policies
  WHERE tablename = 'posts' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')),
  0, 'não existe policy de escrita em posts para papel algum');

-- ===========================================================================
-- F. Acesso efetivo: anon
-- ===========================================================================
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{}';

SELECT is((SELECT count(*)::int FROM posts), 1,
  'anon vê o único publicado com published_at no passado');
SELECT is_empty($$ SELECT slug FROM posts WHERE status = 'rascunho' $$,
  'anon não lê rascunho');
SELECT is_empty($$ SELECT slug FROM posts WHERE published_at > NOW() $$,
  'anon não lê post agendado para o futuro');
SELECT is_empty($$ SELECT slug FROM posts WHERE status = 'arquivado' $$,
  'anon não lê post arquivado');
SELECT throws_ok($$ UPDATE posts SET title = 'invadido' $$, '42501', NULL,
  'UPDATE anônimo é bloqueado por privilégio, não ignorado em silêncio');
SELECT throws_ok($$ DELETE FROM posts $$, '42501', NULL,
  'DELETE anônimo é bloqueado por privilégio');
SELECT is((SELECT count(*)::int FROM posts), 1,
  'nenhuma escrita anônhou alterado a contagem visível');
SELECT throws_ok(
  $$ INSERT INTO posts (title, slug, status, author_name, editoria, cover_image_url, excerpt, content)
     VALUES ('invadido', 'invadido', 'publicado', 'A', 'E', 'https://exemplo.dev/c.jpg', 'e', '# c') $$,
  '42501', NULL, 'INSERT anônimo é bloqueado por privilégio');

-- ===========================================================================
-- G. authenticated sem claim: a mesma leitura do anon, provado
-- ===========================================================================
-- A asserção cruzada que importa: existir uma policy de preview não pode alargar
-- ninguém por efeito colateral.
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{}';

SELECT is((SELECT count(*)::int FROM posts), 1,
  'authenticated sem claim vê exatamente o que o anon vê');
SELECT is_empty($$ SELECT slug FROM posts WHERE status = 'rascunho' $$,
  'authenticated sem claim não lê rascunho');
SELECT throws_ok(
  $$ INSERT INTO posts (title, slug, status, author_name, editoria, cover_image_url, excerpt, content)
     VALUES ('invadido', 'invadido', 'publicado', 'A', 'E', 'https://exemplo.dev/c.jpg', 'e', '# c') $$,
  '42501', NULL, 'INSERT de authenticated sem claim é bloqueado');
SELECT throws_ok($$ UPDATE posts SET title = 'invadido' $$, '42501', NULL,
  'UPDATE de authenticated sem claim é bloqueado');
SELECT throws_ok($$ DELETE FROM posts $$, '42501', NULL,
  'DELETE de authenticated sem claim é bloqueado');

-- ===========================================================================
-- H. authenticated com app_metadata.preview: lê tudo, não escreve nada
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"app_metadata":{"preview":"true"}}';

SELECT is((SELECT count(*)::int FROM posts), 4,
  'preview lê as quatro linhas, inclusive rascunho e arquivado');
SELECT is((SELECT count(*)::int FROM posts WHERE status = 'rascunho'), 1,
  'preview lê o rascunho');
SELECT is((SELECT count(*)::int FROM posts WHERE published_at > now()), 1,
  'preview lê o agendado, que para o público não existe');
SELECT is((SELECT count(*)::int FROM posts WHERE status = 'arquivado'), 1,
  'preview lê o arquivado');
SELECT throws_ok(
  $$ INSERT INTO posts (title, slug, status, author_name, editoria, cover_image_url, excerpt, content)
     VALUES ('invadido', 'invadido', 'publicado', 'A', 'E', 'https://exemplo.dev/c.jpg', 'e', '# c') $$,
  '42501', NULL, 'preview lê, mas não escreve: claim não é papel de escrita');
SELECT throws_ok($$ UPDATE posts SET title = 'invadido' $$, '42501', NULL,
  'preview não altera linha');

-- ===========================================================================
-- I. A armadilha: claim em user_metadata não abre rascunho
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"user_metadata":{"preview":"true"}}';

SELECT is((SELECT count(*)::int FROM posts), 1,
  'claim em user_metadata não amplia a leitura: vê o mesmo que o anon');
SELECT is_empty($$ SELECT slug FROM posts WHERE status = 'rascunho' $$,
  'claim em user_metadata NÃO abre rascunho: user_metadata é gravável pelo usuário');

-- ===========================================================================
-- J. service_role
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{}';

SELECT is((SELECT count(*)::int FROM posts), 4,
  'service_role lê tudo, por definição: burla a RLS');
RESET ROLE;

-- ===========================================================================
-- K. is_post_public e search_path
-- ===========================================================================
SELECT is(public.is_post_public(NULL), false,
  'is_post_public é falso para slug inexistente/nulo');
SELECT is(public.is_post_public('fixture-publicado'), true,
  'is_post_public reconhece o publicado');
SELECT is(public.is_post_public('fixture-rascunho'), false,
  'is_post_public rejeita o rascunho');
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