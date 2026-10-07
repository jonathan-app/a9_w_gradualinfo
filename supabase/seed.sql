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
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'ana@exemplo.dev', crypt('senha-de-teste-123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Ana Silva"}', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bruno@exemplo.dev', crypt('senha-de-teste-123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bruno Costa"}', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'preview@gradualinfo.dev', crypt('senha-de-teste-123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"],"preview":"true"}', '{"display_name":"Preview System"}', '', '', '', '', '')
on conflict (id) do nothing;

-- auth.identities: o GoTrue exige uma linha por provider. Sem ela o login
-- responde "Invalid login credentials" mesmo com o usuário correto.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"ana@exemplo.dev"}', 'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bruno@exemplo.dev"}', 'email', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"preview@gradualinfo.dev"}', 'email', now(), now(), now())
on conflict (id) do nothing;

-- O perfil de cada um nasce pelo trigger on_auth_user_created; aqui só se
-- completa o que o trigger não tem como saber.
update public.profiles
set avatar_url = null
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);


-- Fixtures locais: uma linha de cada estado para provar leitura pública real.
-- Não mover para migration: o deploy de schema não deve publicar exemplos.
--
-- Preenchem todas as colunas `not null` do schema editorial porque a migration
-- de transformação endurece `excerpt`, `content`, `author_name`, `editoria` e
-- `cover_image_url`. `fontes_citadas` só aparece no publicado, de propósito: é a
-- linha que a spec `md-0002` vai renderizar, e ela precisa de fonte real para
-- o AC-07 não passar por vacuidade.
insert into public.posts (
  title, slug, excerpt, content,
  cover_image_url, editoria, author_name, fontes_citadas,
  status, published_at
)
values
  (
    'Fixture publicado', 'fixture-publicado', 'Exemplo local', '# Publicado',
    'https://gradualinfo.com.br/exemplo-capa.jpg', 'Mão na Massa', 'Equipe GradualInfo',
    '[{"titulo": "Documentação do Supabase", "url": "https://supabase.com/docs"}]',
    'publicado', now() - interval '1 day'
  ),
  (
    'Fixture rascunho', 'fixture-rascunho', 'Exemplo local', '# Rascunho',
    'https://gradualinfo.com.br/exemplo-capa.jpg', 'Mão na Massa', 'Equipe GradualInfo',
    '[]',
    'rascunho', null
  ),
  (
    'Fixture arquivado', 'fixture-arquivado', 'Exemplo local', '# Arquivado',
    'https://gradualinfo.com.br/exemplo-capa.jpg', 'Mão na Massa', 'Equipe GradualInfo',
    '[]',
    'arquivado', now() - interval '1 day'
  ),
  (
    'Fixture agendado', 'fixture-agendado', 'Exemplo local', '# Agendado',
    'https://gradualinfo.com.br/exemplo-capa.jpg', 'Mão na Massa', 'Equipe GradualInfo',
    '[]',
    'publicado', now() + interval '100 years'
  )
on conflict (slug) do update
set title = excluded.title,
    excerpt = excluded.excerpt,
    content = excluded.content,
    cover_image_url = excluded.cover_image_url,
    editoria = excluded.editoria,
    author_name = excluded.author_name,
    fontes_citadas = excluded.fontes_citadas,
    status = excluded.status,
    published_at = excluded.published_at;
