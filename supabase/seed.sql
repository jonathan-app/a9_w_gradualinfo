-- ===========================================================================
-- supabase/seed.sql — dados de desenvolvimento
-- ===========================================================================
--
-- Executado por `pnpm supabase:reset` depois das migrations.
--
-- Regra: seed é para desenvolvimento local. Nada aqui pode depender de
-- segredo, e nenhum dado real de usuário entra neste arquivo.
-- ===========================================================================

-- Perfis de exemplo. O id precisa existir em auth.users: por isso os usuários
-- são criados logo abaixo, via GoTrue (o mesmo caminho do signup real).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'ana@exemplo.dev', crypt('senha-de-teste-123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Ana Silva"}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bruno@exemplo.dev', crypt('senha-de-teste-123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bruno Costa"}')
on conflict (id) do nothing;

-- auth.identities: o GoTrue exige uma linha por provider. Sem ela o login
-- responde "Invalid login credentials" mesmo com o usuário correto.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"ana@exemplo.dev"}', 'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bruno@exemplo.dev"}', 'email', now(), now(), now())
on conflict (id) do nothing;

-- O perfil de cada um nasce pelo trigger on_auth_user_created; aqui só se
-- completa o que o trigger não tem como saber.
update public.profiles
set avatar_url = null
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
