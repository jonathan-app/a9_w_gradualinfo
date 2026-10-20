-- Spec 0032: Testes pgTAP para RBAC e Trilha de Auditoria WORM (Seção 5)
-- Executar em Supabase local descartavel

BEGIN;
SELECT plan(26);

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

-- 2. Validacao de RLS ativo
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_user_roles'::regclass), 'RLS ativo em admin_user_roles');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_audit_log'::regclass), 'RLS ativo em admin_audit_log');

-- 3. Bloqueio de privilegios para anon e authenticated (sem escrita direta)
SELECT ok(NOT has_table_privilege('anon', 'public.admin_user_roles', 'SELECT'), 'anon nao le admin_user_roles');
SELECT ok(NOT has_table_privilege('anon', 'public.admin_user_roles', 'INSERT'), 'anon nao insere em admin_user_roles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_user_roles', 'INSERT'), 'authenticated nao insere em admin_user_roles');
SELECT ok(NOT has_table_privilege('anon', 'public.admin_audit_log', 'SELECT'), 'anon nao le admin_audit_log');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT'), 'authenticated nao insere em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'UPDATE'), 'service_role nao tem UPDATE em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'DELETE'), 'service_role nao tem DELETE em admin_audit_log');
SELECT ok(NOT has_table_privilege('service_role', 'public.admin_audit_log', 'TRUNCATE'), 'service_role nao tem TRUNCATE em admin_audit_log');

-- 4. Funcoes de seguranca com search_path vazio
SELECT has_function('public', 'is_admin', ARRAY[]::text[], 'funcao is_admin existe');
SELECT is((SELECT prosecdef FROM pg_proc WHERE oid = 'public.is_admin()'::regprocedure), true, 'is_admin e SECURITY DEFINER');
SELECT ok((SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = 'public.is_admin()'::regprocedure), 'is_admin tem search_path vazio');

SELECT has_function('public', 'assign_admin_role', ARRAY['uuid','public.admin_role_type','uuid','text','text'], 'assign_admin_role existe');
SELECT has_function('public', 'revoke_admin_role', ARRAY['uuid','uuid','text','text'], 'revoke_admin_role existe');

-- 5. Imutabilidade append-only por trigger (erro 55000)
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

SELECT * FROM finish();
ROLLBACK;
