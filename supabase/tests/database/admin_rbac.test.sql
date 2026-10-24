-- Spec 0032 + Lacunas 5 & 6: Testes pgTAP para RBAC transacional, WORM e invariantes históricas de RLS
-- Executar em Supabase local descartavel

BEGIN;
SELECT plan(63);

-- 1. Validacao de estrutura
SELECT has_table('public', 'admin_user_roles', 'tabela admin_user_roles existe');
SELECT has_table('public', 'admin_audit_log', 'tabela admin_audit_log existe');
SELECT has_type('public', 'admin_role_type', 'tipo enumerado admin_role_type existe');

SELECT has_column('public', 'admin_user_roles', 'user_id', 'admin_user_roles tem user_id');
SELECT has_column('public', 'admin_user_roles', 'role', 'admin_user_roles tem role');
SELECT has_column('public', 'admin_audit_log', 'operation_id', 'admin_audit_log tem operation_id');
SELECT has_column('public', 'admin_audit_log', 'actor_type', 'admin_audit_log tem actor_type');
SELECT has_column('public', 'admin_audit_log', 'actor_id', 'admin_audit_log tem actor_id');
SELECT has_column('public', 'admin_audit_log', 'action', 'admin_audit_log tem action');
SELECT has_column('public', 'admin_audit_log', 'metadata', 'admin_audit_log tem metadata');

-- 2. Validacao de RLS e FORCE RLS ativos
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_user_roles'::regclass), 'RLS ativo em admin_user_roles');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_audit_log'::regclass), 'RLS ativo em admin_audit_log');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.admin_user_roles'::regclass), 'FORCE RLS ativo em admin_user_roles');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.admin_audit_log'::regclass), 'FORCE RLS ativo em admin_audit_log');

-- 3. Bloqueio de privilegios diretos (incluindo bloqueio de escrita direta para service_role em admin_user_roles)
SELECT ok(NOT has_table_privilege('anon', 'public.admin_user_roles', 'SELECT'), 'anon nao le admin_user_roles');
SELECT ok(NOT has_table_privilege('anon', 'public.admin_user_roles', 'INSERT'), 'anon nao insere em admin_user_roles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_user_roles', 'INSERT'), 'authenticated nao insere em admin_user_roles');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_user_roles', 'INSERT'), 'service_role nao insere diretamente em admin_user_roles (obriga RPC)');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_user_roles', 'UPDATE'), 'service_role nao atualiza diretamente admin_user_roles (obriga RPC)');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_user_roles', 'DELETE'), 'service_role nao deleta diretamente de admin_user_roles (obriga RPC)');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_user_roles', 'TRUNCATE'), 'service_role nao tem TRUNCATE em admin_user_roles');

SELECT ok(NOT has_table_privilege('anon', 'public.admin_audit_log', 'SELECT'), 'anon nao le admin_audit_log');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT'), 'authenticated nao insere em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'UPDATE'), 'service_role nao tem UPDATE em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'DELETE'), 'service_role nao tem DELETE em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'TRUNCATE'), 'service_role nao tem TRUNCATE em admin_audit_log');

-- 4. Funcoes de seguranca com search_path vazio e privilegios de execucao
SELECT has_function('public', 'is_admin', ARRAY[]::text[], 'funcao is_admin existe');
SELECT is((SELECT prosecdef FROM pg_proc WHERE oid = 'public.is_admin()'::regprocedure), true, 'is_admin e SECURITY DEFINER');
SELECT ok((SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = 'public.is_admin()'::regprocedure), 'is_admin tem search_path vazio');

SELECT has_function('public', 'assign_admin_role', ARRAY['uuid','public.admin_role_type','uuid','text','text'], 'assign_admin_role existe');
SELECT has_function('public', 'revoke_admin_role', ARRAY['uuid','uuid','text','text'], 'revoke_admin_role existe');
SELECT ok(NOT has_function_privilege('anon', 'public.assign_admin_role(uuid,public.admin_role_type,uuid,text,text)', 'EXECUTE'), 'anon nao executa assign_admin_role');
SELECT ok(NOT has_function_privilege('authenticated', 'public.assign_admin_role(uuid,public.admin_role_type,uuid,text,text)', 'EXECUTE'), 'authenticated nao executa assign_admin_role');
SELECT ok(has_function_privilege('service_role', 'public.assign_admin_role(uuid,public.admin_role_type,uuid,text,text)', 'EXECUTE'), 'service_role executa assign_admin_role');
SELECT ok(NOT has_function_privilege('anon', 'public.revoke_admin_role(uuid,uuid,text,text)', 'EXECUTE'), 'anon nao executa revoke_admin_role');
SELECT ok(NOT has_function_privilege('authenticated', 'public.revoke_admin_role(uuid,uuid,text,text)', 'EXECUTE'), 'authenticated nao executa revoke_admin_role');
SELECT ok(has_function_privilege('service_role', 'public.revoke_admin_role(uuid,uuid,text,text)', 'EXECUTE'), 'service_role executa revoke_admin_role');

-- 5. Imutabilidade append-only por trigger (UPDATE, DELETE e TRUNCATE bloqueados com 55000)
INSERT INTO public.admin_audit_log (
  actor_type, actor_id, actor_role, action, resource_type, metadata
) VALUES (
  'admin', '00000000-0000-0000-0000-000000000001', 'admin', 'test.event', 'system', '{}'::jsonb
);

SELECT throws_ok(
  $$ UPDATE public.admin_audit_log SET action = 'tampered' $$,
  '55000',
  NULL,
  'UPDATE em admin_audit_log e sumariamente bloqueado pelo trigger anti-mutacao'
);

SELECT throws_ok(
  $$ DELETE FROM public.admin_audit_log $$,
  '55000',
  NULL,
  'DELETE em admin_audit_log e sumariamente bloqueado pelo trigger anti-mutacao'
);

SELECT throws_ok(
  $$ TRUNCATE public.admin_audit_log $$,
  '55000',
  NULL,
  'TRUNCATE em admin_audit_log e sumariamente bloqueado pelo trigger anti-mutacao'
);

-- 6. Lacuna 5: Atomicidade transacional e rollback em assign_admin_role / revoke_admin_role
-- 6.1 Atribuicao inicial cria papel e grava user.role_assigned na mesma transacao
SELECT is(
  (SELECT role::text FROM public.assign_admin_role(
    '22222222-2222-2222-2222-222222222222'::uuid,
    'revisor'::public.admin_role_type,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'ana@exemplo.dev',
    '192.0.2.10'
  )),
  'revisor',
  'assign_admin_role atribui papel inicial revisor'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_audit_log
   WHERE resource_id = '22222222-2222-2222-2222-222222222222'
     AND action = 'user.role_assigned'
     AND metadata->>'new_role' = 'revisor'
     AND metadata->>'previous_role' IS NULL),
  1,
  'assign_admin_role registra user.role_assigned com previous_role nulo'
);

-- 6.2 Mudanca de papel atualiza linha e grava user.role_changed com previous_role exato
SELECT is(
  (SELECT role::text FROM public.assign_admin_role(
    '22222222-2222-2222-2222-222222222222'::uuid,
    'editor'::public.admin_role_type,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'ana@exemplo.dev',
    '192.0.2.10'
  )),
  'editor',
  'assign_admin_role atualiza papel existente para editor'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_audit_log
   WHERE resource_id = '22222222-2222-2222-2222-222222222222'
     AND action = 'user.role_changed'
     AND metadata->>'previous_role' = 'revisor'
     AND metadata->>'new_role' = 'editor'),
  1,
  'assign_admin_role registra user.role_changed com previous_role=revisor e new_role=editor'
);

-- 6.3 Falha intermediaria na gravacao do admin_audit_log (actor_email > 320 chars) faz rollback da mudanca de papel
SELECT throws_ok(
  $$ SELECT public.assign_admin_role(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'admin'::public.admin_role_type,
       '11111111-1111-1111-1111-111111111111'::uuid,
       repeat('a', 325),
       '192.0.2.10'
     ) $$,
  '23514',
  NULL,
  'falha de constraint no admin_audit_log aborta assign_admin_role'
);

SELECT is(
  (SELECT role::text FROM public.admin_user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  'editor',
  'rollback transacional preserva papel anterior (editor) quando a auditoria falha em assign_admin_role'
);

-- 6.4 Falha intermediaria na gravacao do admin_audit_log faz rollback da delecao em revoke_admin_role
SELECT throws_ok(
  $$ SELECT public.revoke_admin_role(
       '22222222-2222-2222-2222-222222222222'::uuid,
       '11111111-1111-1111-1111-111111111111'::uuid,
       repeat('b', 325),
       '192.0.2.10'
     ) $$,
  '23514',
  NULL,
  'falha de constraint no admin_audit_log aborta revoke_admin_role'
);

SELECT is(
  (SELECT role::text FROM public.admin_user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  'editor',
  'rollback transacional preserva linha em admin_user_roles quando a auditoria falha em revoke_admin_role'
);

-- 6.5 Revogacao bem-sucedida remove papel e grava user.role_removed; segunda revogacao falha com P0002
SELECT lives_ok(
  $$ SELECT public.revoke_admin_role(
       '22222222-2222-2222-2222-222222222222'::uuid,
       '11111111-1111-1111-1111-111111111111'::uuid,
       'ana@exemplo.dev',
       '192.0.2.10'
     ) $$,
  'revoke_admin_role remove papel existente com sucesso'
);

SELECT throws_ok(
  $$ SELECT public.revoke_admin_role(
       '22222222-2222-2222-2222-222222222222'::uuid,
       '11111111-1111-1111-1111-111111111111'::uuid,
       'ana@exemplo.dev',
       '192.0.2.10'
     ) $$,
  'P0002',
  'admin_role_not_found',
  'revoke_admin_role rejeita revogacao duplicada com P0002'
);

-- 7. Lacuna 6: Invariantes globais de RLS, policies e SECURITY DEFINER em todo o schema public
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND (NOT c.relrowsecurity OR NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname
      ))
  ),
  'toda tabela do schema public possui RLS ativa e ao menos uma policy explicita'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.profiles', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.profiles', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'public.profiles revoga privilegios indevidos de anon e authenticated'
);

-- 8. RPC list_admin_operadores (Spec 0036)
SELECT has_function('public', 'list_admin_operadores', ARRAY['uuid','int','int'], 'list_admin_operadores existe');
SELECT is((SELECT prosecdef FROM pg_proc WHERE oid = 'public.list_admin_operadores(uuid,int,int)'::regprocedure), true, 'list_admin_operadores e SECURITY DEFINER');
SELECT ok((SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = 'public.list_admin_operadores(uuid,int,int)'::regprocedure), 'list_admin_operadores tem search_path vazio');
SELECT ok(has_function_privilege('service_role', 'public.list_admin_operadores(uuid,int,int)', 'EXECUTE'), 'service_role executa list_admin_operadores');
SELECT ok(NOT has_function_privilege('anon', 'public.list_admin_operadores(uuid,int,int)', 'EXECUTE'), 'anon nao executa list_admin_operadores');
SELECT ok(NOT has_function_privilege('authenticated', 'public.list_admin_operadores(uuid,int,int)', 'EXECUTE'), 'authenticated nao executa list_admin_operadores');
SELECT ok((SELECT user_id IS NULL FROM public.list_admin_operadores(NULL::uuid, 20, 0) LIMIT 1), 'list_admin_operadores sem dados nao retorna operador real');
SELECT ok((SELECT total_count FROM public.list_admin_operadores(NULL::uuid, 20, 0)) = 0::bigint, 'list_admin_operadores sem dados retorna total zero');
SELECT ok((SELECT total_count FROM public.list_admin_operadores(NULL::uuid, 20, -5)) = 0::bigint, 'list_admin_operadores com offset negativo nao falha (piso em 0)');
SELECT ok((SELECT total_count FROM public.list_admin_operadores(NULL::uuid, 999, 0)) = 0::bigint, 'list_admin_operadores com limit acima de 50 nao falha (cap interno)');

-- 9. Desempate por user_id quando created_at e igual (Spec 0036, AC-10)
INSERT INTO public.admin_user_roles (user_id, role, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222222'::uuid, 'editor'::public.admin_role_type, '2026-10-20T10:00:00Z'::timestamptz),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'editor'::public.admin_role_type, '2026-10-20T10:00:00Z'::timestamptz);

SELECT is(
  (SELECT user_id::text FROM public.list_admin_operadores(NULL::uuid, 20, 0) LIMIT 1),
  '11111111-1111-1111-1111-111111111111',
  'desempate por created_at igual usa user_id crescente'
);

SELECT * FROM finish();
ROLLBACK;
