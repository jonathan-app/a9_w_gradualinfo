# 0032. Backend Administrativo, RBAC e Trilha de Auditoria Durável

**Date**: 2026-10-19 20:50, America/Sao_Paulo (revisão técnica em 2026-10-19)
**Status**: Accepted
**Decision source**: Fase 2 do escopo `docs/scope/2026-10-19-2030-auditoria-backend-login-dashboard.md`, derivada da auditoria estratégica do backend, do login e do dashboard. A revisão confrontou a proposta inicial com o código real de admissão, guarda e RLS.

---

## 1. Resumo Executivo

Esta especificação formaliza a Fase 2 do backend administrativo: admissão multiusuário com papéis, autorização centralizada no servidor, trilha de auditoria durável e contratos das mutações administrativas. Ela parte da fundação já aceita nas Specs 0018, 0019 e 0020, que provou login real com TOTP e AAL2, e remove o gargalo de identidade única que hoje impede qualquer operador além do `ADMIN_USER_ID`.

O desenho tem quatro peças:

1. **RBAC no PostgreSQL**: papéis `admin`, `editor` e `revisor` em `public.admin_user_roles`, isolados de `profiles` e sem escrita direta pelo cliente.
2. **Admissão multiusuário**: login, matrícula e desafio TOTP passam a aceitar o administrador raiz (variável de ambiente) ou qualquer usuário com papel no banco, sempre exigindo AAL2.
3. **Guarda central**: `checkAdminUser()` resolve o papel e `assertAdminApiAuth(request, requiredRole)` exige explicitamente o papel mínimo de cada rota. Não existe papel padrão permissivo.
4. **Auditoria append-only**: `public.admin_audit_log` registra ator, papel, ação, recurso, resultado, IP e metadados sanitizados. A tabela é imutável por trigger e por privilégio, com leitura limitada por RLS.

A Fase 2 entrega schema, serviços, guarda, admissão, endpoint mínimo de gestão de papéis e testes. O dashboard visual e as métricas reais continuam na Fase 3. Os endpoints de mutação editorial no Sanity continuam fora desta fase; a matriz de autorização deles fica registrada como contrato.

---

## 2. Contexto e Problema

O código atual protege a área administrativa com uma identidade única:

- `lib/admin/auth.ts:269` (`checkAdminUser`) compara `data.user.id` com `env.adminUserId` e recusa qualquer outro usuário antes de avaliar MFA.
- `app/api/admin/auth/login/route.ts:78` faz a mesma comparação e encerra a sessão de qualquer identidade divergente.
- `app/api/admin/auth/mfa/enroll/route.ts:33`, `app/api/admin/auth/mfa/verify/route.ts:38`, `app/admin-dashboard/mfa/setup/page.tsx:36` e `app/admin-dashboard/mfa/verify/page.tsx:36` repetem a comparação.
- `lib/audit.ts` registra apenas eventos de preview no logger estruturado, sem persistência consultável.
- As mutações administrativas existentes são `POST /api/admin/preview`, `POST /api/admin/dashboard/rotinas/refresh-health` e `POST /api/admin/ofertas/[id]/avaliar-selo`. A última grava `price_audit_logs` de forma transacional dentro da RPC `evaluate_and_set_verified_price` (`supabase/migrations/20261013030000_modulo_ofertas_pipeline_selo_cupons.sql`).
- O padrão de tabela append-only já existe em `price_audit_logs`: trigger `tg_prevent_audit_log_mutation`, `REVOKE` de UPDATE/DELETE e concessão restrita a `service_role` (`supabase/migrations/20261013000000_modulo_ofertas_historico_precos.sql`).

Consequências do estado atual:

- Não há como delegar acesso a um editor sem compartilhar a credencial do administrador único.
- Não há trilha durável de quem aprovou um selo, emitiu um preview ou alterou um papel.
- A promoção de um usuário a operador exige mudança de ambiente e redeploy.
- Uma política RLS que consulte a própria tabela de papéis sem uma função `SECURITY DEFINER` entra em recursão infinita. O desenho inicial da Spec 0032 tinha esse defeito e foi corrigido nesta revisão.
- A admissão de um novo operador falha antes de qualquer verificação de papel, porque login e MFA ainda recusam todo UUID diferente de `ADMIN_USER_ID`.

A Fase 2 resolve esses pontos sem tocar no fluxo de recuperação do administrador raiz, sem reescrever a RPC de ofertas e sem antecipar a UI da Fase 3.

---

## Requirements

### Histórias de usuário

- Como proprietário do portal, quero conceder acesso administrativo a outra pessoa com um papel definido, sem compartilhar minha credencial nem alterar variáveis de ambiente.
- Como operador delegado, quero entrar com e-mail, senha e TOTP e enxergar apenas as operações compatíveis com meu papel.
- Como proprietário, quero uma trilha durável que mostre quem fez cada operação sensível, quando, de qual IP e com qual resultado.
- Como auditor, quero ler a trilha completa; como editor, quero ler os meus próprios eventos.
- Como engenheiro, quero que a guarda negue por padrão e que cada rota declare o papel mínimo, para que uma rota nova não nasça permissiva.

### Critérios de aceite

- **admin-rbac/AC-01**: A migration cria o tipo `public.admin_role_type` com `'admin'`, `'editor'` e `'revisor'` e a tabela `public.admin_user_roles` (`user_id uuid` chave primária com FK para `auth.users(id)` em cascata, `role`, `assigned_by`, `created_at`, `updated_at`). RLS fica ativa. `authenticated` recebe apenas `SELECT` da própria linha; não existem políticas de INSERT, UPDATE ou DELETE para `authenticated` e `anon`. Escritas acontecem exclusivamente pela função `SECURITY DEFINER` `public.assign_admin_role` ou por `service_role`. Nenhuma política consulta `admin_user_roles` diretamente; a leitura administrativa usa a função `public.is_admin()`. A migration é idempotente e o trigger de `updated_at` reaproveita `public.set_updated_at()`.

- **admin-rbac/AC-02**: `env.adminUserId` é a conta raiz de contingência e resolve sempre como `admin`, mesmo sem linha em `admin_user_roles`; ela não pode ser rebaixada pelo banco. Qualquer outro usuário resolve o papel por consulta indexada à própria linha em `admin_user_roles`. Usuário sem linha é recusado. Falha na consulta do papel fecha o acesso: 503 sanitizado na API e estado de erro seguro na página, nunca fallback silencioso para a raiz. `checkAdminUser()` devolve `role` no resultado autorizado. Nenhuma escrita é disparada em caminho de leitura.

- **admin-rbac/AC-03**: `POST /api/admin/auth/login` aceita credenciais da raiz ou de usuário com papel; usuário sem papel tem a sessão encerrada e recebe a mensagem genérica `invalid_credentials`. Os endpoints e as páginas de matrícula e desafio TOTP (`mfa/enroll`, `mfa/verify`, `mfa/setup`, `mfa/verify`) aceitam a raiz ou usuário com papel em AAL1 e continuam exigindo AAL2 para o painel. A recuperação de senha e o reset de TOTP permanecem exclusivos da raiz (`env.adminEmail` e `env.adminUserId`). Esta spec altera em parte a Spec 0018 (AC-04) e a Spec 0020 (AC-01), que deixam de exigir identidade igual a `ADMIN_USER_ID` e passam a exigir raiz ou papel.

- **admin-rbac/AC-04**: `assertAdminApiAuth(request, requiredRole)` passa a exigir o segundo argumento obrigatório, sem valor padrão. A hierarquia é `admin` > `editor` > `revisor`; `admin` satisfaz qualquer exigência, `editor` satisfaz `editor` e `revisor`, `revisor` satisfaz apenas `revisor`. A ordem é Access, origem/CSRF, sessão, papel, AAL2 e hierarquia. As cinco rotas administrativas existentes são atualizadas explicitamente: `health` exige `revisor`, `refresh-health` exige `editor`, `preview` exige `revisor`, `evidencias` exige `admin` e `avaliar-selo` exige `editor` no caminho de sessão administrativa. `checkAdminUser()` continua sem papel exigido e devolve o papel resolvido para o layout. Testes que mockam a guarda são atualizados para o novo contrato.

- **admin-rbac/AC-05**: A migration cria `public.admin_audit_log` com `id uuid`, `operation_id uuid`, `actor_type` (`admin` ou `system`), `actor_id text`, `actor_email text`, `actor_role public.admin_role_type` (nulo para `system`), `action text`, `resource_type text`, `resource_id text`, `metadata jsonb`, `ip_address text`, `status` (`intent`, `success` ou `failure`) e `created_at`. Não existe FK em `actor_id`, para preservar o ator após exclusão do usuário. Um check garante a coerência entre `actor_type` e `actor_role`, e outro limita o IP a 45 caracteres. Índices cobrem `created_at`, `(actor_id, created_at)` e `(resource_type, resource_id, created_at)`, além de um índice único parcial em `(operation_id, status)` para tornar a conclusão de uma operação idempotente. A tabela tem RLS ativa, leitura administrativa via `public.is_admin()`, leitura do próprio ator via `actor_id = auth.uid()::text`, `SELECT` e `INSERT` para `service_role`, e nenhuma política de UPDATE ou DELETE. `UPDATE`, `DELETE` e `TRUNCATE` são revogados de `service_role`; um trigger `BEFORE UPDATE OR DELETE` levanta exceção. O resultado é WORM lógico (append-only), não WORM físico.

- **admin-rbac/AC-06**: `lib/admin/audit-service.ts` roda apenas no servidor, usa cliente `service_role` sem cookies e expõe `recordAdminAudit(payload)` para eventos simples e `beginAdminOperation(payload)`/`completeAdminOperation(operationId, status, metadata)` para mutações externas em duas fases. Metadados são sanitizados recursivamente: chaves como `password`, `token`, `access_token`, `refresh_token`, `authorization`, `cookie`, `totp`, `code`, `secret` e `key` são mascaradas com `[REDACTED]`; profundidade máxima 3, 50 chaves e 8 KB serializados, com truncamento explícito acima disso. O IP vem exclusivamente de `CF-Connecting-IP`, com limite de 45 caracteres. Falha em evento crítico lança `AdminAuditUnavailableError` e o chamador aborta; falha em evento não crítico é registrada em stderr pelo logger e não derruba a operação. O logger de falha não reinvoca o serviço de auditoria, evitando recursão. Nenhum payload bruto de requisição é aceito.

- **admin-rbac/AC-07**: A função `public.assign_admin_role(p_user_id, p_role, p_actor_id, p_actor_email, p_ip_address)` é `SECURITY DEFINER`, fixa `search_path = ''`, valida que o usuário alvo existe em `auth.users`, faz upsert do papel e grava o evento `user.role_assigned` ou `user.role_changed` na mesma transação. `public.revoke_admin_role` faz o delete e grava `user.role_removed` na mesma transação. Ambas são executáveis apenas por `service_role`. O endpoint mínimo `POST /api/admin/usuarios/papeis` e `DELETE /api/admin/usuarios/papeis/[userId]` exige `admin`, valida UUID e papel, recusa alterar a raiz com 409 e usa as RPCs. Não há UI nesta fase. A autorização do ator é feita pela guarda do servidor; a RPC registra o ator e não confia em papel vindo do corpo da requisição.

- **admin-rbac/AC-08**: `avaliar-selo` continua tendo `price_audit_logs` como registro transacional autoritativo dentro da RPC de ofertas; o evento administrativo complementar em `admin_audit_log` é best-effort e não bloqueia a concessão já auditada. `preview` e `refresh-health` são não críticos e usam auditoria best-effort. `login` e `logout` registram `auth.login` e `auth.logout` best-effort, sem senha, TOTP ou cookie. Mutações editoriais no Sanity ainda não existem; quando existirem, seguem o contrato de duas fases (`intent` antes, `success`/`failure` depois), com aborto antes da chamada externa se o `intent` não puder ser gravado.

- **admin-rbac/AC-09**: Indisponibilidade do banco de papéis em uma API administrativa retorna 503 sanitizado; em página, o acesso falha fechado sem revelar detalhe. Indisponibilidade do banco de auditoria em evento crítico impede a mutação correspondente; em evento não crítico, a operação continua e a falha vai para stderr. Upsert de papel concorrente resolve por `ON CONFLICT`, com um evento de auditoria por operação. Repetição da conclusão de uma operação com o mesmo `operation_id` e `status` é idempotente pelo índice único; o serviço captura `23505` e trata como conclusão já registrada. Sessão AAL1, usuário sem papel e papel insuficiente recebem 403; ausência de sessão recebe 401; configuração ausente continua 500; Access indisponível continua 503.

- **admin-rbac/AC-10**: A entrega inclui pgTAP para schema, RLS, privilégios, ausência de recursão, trigger append-only, leitura por papel e atribuição de papel com auditoria; Vitest para resolução de papel, matriz de guarda, admissão, sanitização, falha crítica e endpoint de papéis; e Playwright para login de delegado, desafio TOTP, acesso permitido e recusa de usuário sem papel. Testes existentes que assumem identidade única são atualizados, não removidos. `pnpm supabase:test` e `pnpm check:all` precisam passar. Ficam fora desta fase: UI e métricas do dashboard (Fase 3), endpoints de mutação editorial no Sanity (Fase 3/4), recuperação de delegados, retenção automatizada de auditoria, WORM físico e migration em produção sem autorização explícita.

---

## 4. Decisões Arquiteturais

### Decisão 1: Tabela separada de papéis, não coluna em `profiles`

**Contexto**: `public.profiles` tem policy `profiles_update_own`, que permite ao usuário alterar a própria linha.

**Decisão**: Papéis vivem em `public.admin_user_roles`, com escrita apenas por RPC `SECURITY DEFINER` ou `service_role`.

**Por que importa**: Uma coluna em `profiles` permitiria autoelevação por chamada direta ao PostgREST. O isolamento físico e a ausência de policy de escrita eliminam essa classe de falha.

**Tradeoff**: toda gestão de papel passa por função ou endpoint; não há edição casual no Table Editor sem `service_role`.

### Decisão 2: Raiz por ambiente como contingência, delegados no banco

**Contexto**: a operação não pode ficar trancada para fora durante a transição, e a única identidade garantida hoje é `ADMIN_USER_ID`.

**Decisão**: `env.adminUserId` é raiz permanente e sempre `admin`; os demais papéis vêm de `admin_user_roles`. A raiz não é rebaixável pelo banco; para trocá-la, altera-se o ambiente.

**Por que importa**: elimina a dependência de provisionamento automático em caminho de leitura e impede que uma promoção ou rebaixamento deixe o portal sem administrador. A raiz continua sendo o break-glass documentado.

**Tradeoff**: a raiz é um superusuário permanente de aplicação. Quem controla o ambiente controla a raiz. A auditoria registra cada uso, mas não impede o uso.

### Decisão 3: Escrita de papéis por RPC `SECURITY DEFINER`, não por policy `FOR ALL`

**Contexto**: uma policy `FOR ALL` em `admin_user_roles` que consulta a própria tabela para saber se o ator é admin entra em recursão infinita no PostgreSQL.

**Decisão**: `admin_user_roles` não tem policy de escrita. A função `public.assign_admin_role` e a `public.revoke_admin_role` rodam como definer, com `search_path = ''`, e são executáveis apenas por `service_role`. A leitura administrativa de auditoria usa `public.is_admin()`, também `SECURITY DEFINER`.

**Por que importa**: evita recursão, centraliza o invariante e deixa o caminho de escrita testável em um único lugar.

**Tradeoff**: o endpoint de papéis depende de cliente `service_role` no servidor. Sem a chave, a gestão de papéis fica indisponível e falha fechada.

### Decisão 4: Auditoria append-only por trigger e privilégio, não apenas por ausência de policy

**Contexto**: `service_role` ignora RLS. Ausência de policy de UPDATE/DELETE não prova imutabilidade.

**Decisão**: além de não criar policies de UPDATE/DELETE, a migration revoga `UPDATE`, `DELETE` e `TRUNCATE` de `service_role` e instala um trigger `BEFORE UPDATE OR DELETE` que levanta exceção. O trigger segue o padrão já aceito em `price_audit_logs`.

**Por que importa**: uma chamada acidental ou um código comprometido com `service_role` não consegue reescrever a trilha. O teste pgTAP prova o bloqueio.

**Tradeoff**: é WORM lógico. O owner do banco ainda pode desabilitar o trigger ou truncar a tabela; WORM físico exigiria storage externo com retenção homologada, fora da Fase 2.

### Decisão 5: Crítico transacional quando possível, duas fases quando a mutação é externa

**Contexto**: não existe transação distribuída entre PostgreSQL e Sanity. A proposta inicial dizia que qualquer falha de auditoria abortaria a mutação, o que não é implementável para efeitos externos.

**Decisão**: mutações cujo único registro é a auditoria usam a RPC transacional. Mutações externas usam `intent` antes e `success`/`failure` depois; se o `intent` falhar, a chamada externa não acontece. A concessão de selo mantém `price_audit_logs` como registro transacional autoritativo e recebe um evento administrativo complementar best-effort.

**Por que importa**: a garantia é honesta e verificável. Um `intent` sem desfecho é detectável e reconciliável, sem inventar uma transação que o sistema não tem.

**Tradeoff**: pode existir `intent` órfão se o processo morrer entre a chamada externa e a conclusão. A UI de auditoria da Fase 3 deve destacar esse estado.

### Decisão 6: Fase 2 entrega backend, não dashboard

**Contexto**: o escopo separa a arquitetura (Fase 2) da UI e métricas (Fase 3).

**Decisão**: esta spec entrega schema, serviços, guarda, admissão, endpoint de papéis e testes. `getDashboardSummaryMetrics()` e a nova casca visual ficam fora. As métricas da Fase 3 reutilizam `getEditorialDashboardData()` e `getCommercialDashboardData()`, que já devolvem `totalPosts` e `totalOffers`.

**Por que importa**: evita duplicar consultas e manter dois contratos de métricas divergentes. Mantém o diff da Fase 2 revisável.

**Tradeoff**: o painel visual continua com os dados atuais até a Fase 3.

---

## 5. Modelo de Dados e SQL

O SQL abaixo é o contrato da migration. O timestamp real é atribuído no `/develop`, depois de `20261016230000`.

```sql
-- 1. Tipo de papel, idempotente para reset local e reaplicação.
do $$
begin
  create type public.admin_role_type as enum ('admin', 'editor', 'revisor');
exception
  when duplicate_object then null;
end
$$;

-- 2. Papéis administrativos, isolados de profiles.
create table if not exists public.admin_user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role_type not null,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_roles enable row level security;
revoke all on table public.admin_user_roles from public, anon, authenticated;
grant select on table public.admin_user_roles to authenticated, service_role;

drop policy if exists "admin_user_roles_select_own" on public.admin_user_roles;
create policy "admin_user_roles_select_own" on public.admin_user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists admin_user_roles_set_updated_at on public.admin_user_roles;
create trigger admin_user_roles_set_updated_at
  before update on public.admin_user_roles
  for each row execute function public.set_updated_at();

-- 3. Helper de leitura administrativa. SECURITY DEFINER evita recursão de RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

-- 4. Trilha append-only.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid,
  actor_type text not null check (actor_type in ('admin', 'system')),
  actor_id text not null check (length(actor_id) between 1 and 128),
  actor_email text check (actor_email is null or length(actor_email) <= 320),
  actor_role public.admin_role_type,
  action text not null check (length(action) between 1 and 120),
  resource_type text not null check (
    resource_type in ('article', 'offer', 'user', 'auth', 'preview', 'system')
  ),
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text check (ip_address is null or length(ip_address) <= 45),
  status text not null default 'success' check (status in ('intent', 'success', 'failure')),
  created_at timestamptz not null default now(),
  constraint admin_audit_actor_shape check (
    (actor_type = 'admin' and actor_role is not null)
    or (actor_type = 'system' and actor_role is null)
  )
);

create unique index if not exists uq_admin_audit_operation_status
  on public.admin_audit_log (operation_id, status) where operation_id is not null;
create index if not exists idx_admin_audit_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_actor
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists idx_admin_audit_resource
  on public.admin_audit_log (resource_type, resource_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;
grant select on table public.admin_audit_log to authenticated;
grant select, insert on table public.admin_audit_log to service_role;
revoke update, delete, truncate on table public.admin_audit_log from service_role;

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin_audit_log_select_own" on public.admin_audit_log;
create policy "admin_audit_log_select_own" on public.admin_audit_log
  for select to authenticated
  using (actor_id = (select auth.uid())::text);

drop policy if exists "admin_audit_log_service_select" on public.admin_audit_log;
create policy "admin_audit_log_service_select" on public.admin_audit_log
  for select to service_role
  using (true);

drop policy if exists "admin_audit_log_service_insert" on public.admin_audit_log;
create policy "admin_audit_log_service_insert" on public.admin_audit_log
  for insert to service_role
  with check (true);

create or replace function public.tg_prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only: UPDATE and DELETE are prohibited'
    using errcode = '55000';
end;
$$;

alter function public.tg_prevent_admin_audit_mutation() owner to postgres;
revoke all on function public.tg_prevent_admin_audit_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists admin_audit_log_prevent_mutation on public.admin_audit_log;
create trigger admin_audit_log_prevent_mutation
  before update or delete on public.admin_audit_log
  for each row execute function public.tg_prevent_admin_audit_mutation();
```

### 5.1 Funções de gestão de papel

```sql
create or replace function public.assign_admin_role(
  p_user_id uuid,
  p_role public.admin_role_type,
  p_actor_id uuid,
  p_actor_email text default null,
  p_ip_address text default null
)
returns public.admin_user_roles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.admin_user_roles;
  v_row public.admin_user_roles;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'admin_user_not_found' using errcode = 'P0002';
  end if;

  select * into v_previous
  from public.admin_user_roles
  where user_id = p_user_id;

  insert into public.admin_user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, p_actor_id)
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_by = excluded.assigned_by
  returning * into v_row;

  insert into public.admin_audit_log (
    operation_id, actor_type, actor_id, actor_email, actor_role,
    action, resource_type, resource_id, metadata, ip_address, status
  ) values (
    gen_random_uuid(),
    'admin',
    p_actor_id::text,
    p_actor_email,
    'admin',
    case
      when v_previous.user_id is null then 'user.role_assigned'
      else 'user.role_changed'
    end,
    'user',
    p_user_id::text,
    jsonb_build_object(
      'previous_role', v_previous.role,
      'new_role', v_row.role
    ),
    p_ip_address,
    'success'
  );

  return v_row;
end;
$$;

create or replace function public.revoke_admin_role(
  p_user_id uuid,
  p_actor_id uuid,
  p_actor_email text default null,
  p_ip_address text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.admin_user_roles;
begin
  delete from public.admin_user_roles
  where user_id = p_user_id
  returning * into v_previous;

  if v_previous.user_id is null then
    raise exception 'admin_role_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (
    operation_id, actor_type, actor_id, actor_email, actor_role,
    action, resource_type, resource_id, metadata, ip_address, status
  ) values (
    gen_random_uuid(),
    'admin',
    p_actor_id::text,
    p_actor_email,
    'admin',
    'user.role_removed',
    'user',
    p_user_id::text,
    jsonb_build_object('previous_role', v_previous.role),
    p_ip_address,
    'success'
  );
end;
$$;

alter function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  owner to postgres;
alter function public.revoke_admin_role(uuid, uuid, text, text)
  owner to postgres;

revoke all on function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.revoke_admin_role(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.assign_admin_role(uuid, public.admin_role_type, uuid, text, text)
  to service_role;
grant execute on function public.revoke_admin_role(uuid, uuid, text, text)
  to service_role;
```

### 5.2 Bootstrap da raiz

A migration não consegue ler `ADMIN_USER_ID`. Um script operacional idempotente (`scripts/admin-bootstrap.mjs`), executado com `service_role`, insere a linha da raiz em `admin_user_roles` quando ela não existe, confirma que o usuário existe em `auth.users` e não imprime o UUID. O app não depende dessa linha para autorizar a raiz, mas as policies RLS de leitura de auditoria dependem dela. Sem o script, a raiz acessa o painel e as APIs pela guarda, mas não lê a trilha pelo cliente autenticado.

---

## 6. Matriz de Autorização

A hierarquia é cumulativa. `admin` satisfaz todas as linhas; `editor` satisfaz as marcadas como editor e revisor; `revisor` satisfaz apenas revisor.

| Superfície                                    | Método   | Papel mínimo | Auditoria                                     | Fase |
| --------------------------------------------- | -------- | ------------ | --------------------------------------------- | ---- |
| `/admin-dashboard`                            | GET      | revisor      | nenhuma                                       | 2    |
| `/api/admin/dashboard/health`                 | GET      | revisor      | nenhuma                                       | 2    |
| `/api/admin/dashboard/rotinas/refresh-health` | POST     | editor       | best-effort                                   | 2    |
| `/api/admin/preview`                          | POST     | revisor      | best-effort `preview.issued`                  | 2    |
| `/api/admin/evidencias/[hash]`                | GET      | admin        | nenhuma                                       | 2    |
| `/api/admin/ofertas/[id]/avaliar-selo`        | POST     | editor       | `price_audit_logs` transacional + best-effort | 2    |
| `/api/admin/usuarios/papeis`                  | POST     | admin        | RPC transacional `user.role_assigned/changed` | 2    |
| `/api/admin/usuarios/papeis/[userId]`         | DELETE   | admin        | RPC transacional `user.role_removed`          | 2    |
| `/api/admin/auth/login`                       | POST     | raiz/papel   | best-effort `auth.login`                      | 2    |
| `/api/admin/auth/logout`                      | POST     | raiz/papel   | best-effort `auth.logout`                     | 2    |
| `/api/admin/auth/mfa/enroll` e `mfa/verify`   | POST     | raiz/papel   | nenhuma                                       | 2    |
| `/api/admin/auth/recovery/*`                  | POST/GET | raiz         | nenhuma                                       | 2    |
| Artigo Sanity: criar, editar, agendar         | futuro   | editor       | duas fases                                    | 3/4  |
| Artigo Sanity: publicar                       | futuro   | editor       | duas fases                                    | 3/4  |
| Artigo Sanity: despublicar                    | futuro   | admin        | duas fases                                    | 3/4  |
| Auditoria: ler todos                          | futuro   | admin        | não se aplica                                 | 3    |
| Auditoria: ler os próprios                    | futuro   | editor       | não se aplica                                 | 3    |
| Ofertas: listar                               | futuro   | revisor      | não se aplica                                 | 3    |

As linhas de artigo e de listagem de ofertas são contrato de autorização, não endpoints existentes. A Fase 2 não cria essas rotas.

---

## 7. Contratos de Serviço

### 7.1 Admissão e guarda (`lib/admin/auth.ts`)

```ts
export type AdminRole = 'admin' | 'editor' | 'revisor';

export type AdminAuthFailureReason =
  | 'access_unavailable'
  | 'config_missing'
  | 'unauthenticated'
  | 'unauthorized'
  | 'role_unavailable'
  | 'mfa_enrollment_required'
  | 'mfa_challenge_required';

export type AdminAuthResult =
  | { ok: true; user: User; role: AdminRole; aal: 'aal2' }
  | {
      ok: false;
      reason: AdminAuthFailureReason;
      user?: User;
      currentAal?: string;
    };

export async function resolveAdminRole(
  supabase: AdminSupabaseClient,
  user: User,
): Promise<AdminRole | null>;

export async function checkAdminUser(
  customClient?: AdminSupabaseClient,
): Promise<AdminAuthResult | Response>;

export function roleSatisfies(actual: AdminRole, required: AdminRole): boolean;

export async function assertAdminApiAuth(
  request: Request | undefined,
  requiredRole: AdminRole,
): Promise<
  { ok: true; user: User; role: AdminRole } | { ok: false; response: Response }
>;
```

Regras:

- `resolveAdminRole` devolve `admin` para `env.adminUserId` sem consultar o banco; para os demais, consulta `admin_user_roles` por `user_id` e valida o valor contra os três papéis. Erro de consulta vira `role_unavailable`, não `null`.
- `checkAdminUser` mantém Access, `getUser()`, raiz/papel e escada MFA. Não recebe papel exigido. Devolve `role` no sucesso.
- `assertAdminApiAuth` exige o segundo argumento. Não existe default. A checagem de papel ocorre depois da sessão e antes ou depois do AAL2? A ordem canônica é sessão, papel e AAL2, para que um usuário sem papel não seja levado a matricular TOTP. A resposta de papel insuficiente é 403 com `Cache-Control: private, no-store`.
- `assertRecoverySessionAuth` permanece exclusivo da raiz e sem AAL2, como na Spec 0019.

### 7.2 Serviço de auditoria (`lib/admin/audit-service.ts`)

```ts
export type AuditActorType = 'admin' | 'system';
export type AuditStatus = 'intent' | 'success' | 'failure';

export interface AdminAuditPayload {
  operationId?: string;
  actorType: AuditActorType;
  actorId: string;
  actorEmail?: string | null;
  actorRole?: AdminRole | null;
  action: string;
  resourceType: 'article' | 'offer' | 'user' | 'auth' | 'preview' | 'system';
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  status?: AuditStatus;
  critical?: boolean;
}

export async function recordAdminAudit(
  payload: AdminAuditPayload,
): Promise<void>;

export async function beginAdminOperation(
  payload: AdminAuditPayload,
): Promise<string>;

export async function completeAdminOperation(
  operationId: string,
  status: 'success' | 'failure',
  metadata?: Record<string, unknown>,
): Promise<void>;
```

Regras:

- `recordAdminAudit` com `critical: true` lança `AdminAuditUnavailableError` se o insert falhar. Sem `critical`, registra em stderr e retorna.
- `beginAdminOperation` gera um `operationId` (`crypto.randomUUID()`), grava `status: 'intent'` e devolve o id; se falhar, lança e o chamador não executa a mutação externa.
- `completeAdminOperation` grava `status: 'success'` ou `'failure'` com o mesmo `operation_id`. Repetição é idempotente pelo índice único.
- O serviço usa `service_role` sem cookies. Sem a chave, eventos críticos falham fechado; eventos não críticos vão para stderr.
- `metadata` passa pelo sanitizador antes do insert. O payload bruto da requisição nunca é aceito.

### 7.3 Gestão de papéis (`lib/admin/roles.ts`)

```ts
export interface AssignAdminRoleInput {
  userId: string;
  role: AdminRole;
  actorId: string;
  actorEmail?: string | null;
  ipAddress?: string | null;
}

export async function assignAdminRole(
  input: AssignAdminRoleInput,
): Promise<void>;
export async function revokeAdminRole(
  input: Omit<AssignAdminRoleInput, 'role'>,
): Promise<void>;
```

O wrapper chama as RPCs com o cliente `service_role`. A rota `POST /api/admin/usuarios/papeis` e a rota `DELETE /api/admin/usuarios/papeis/[userId]` usam `assertAdminApiAuth(request, 'admin')`, validam UUID e papel, recusam `env.adminUserId` como alvo e devolvem JSON sanitizado. A UI de gestão fica para a Fase 3.

### 7.4 Cliente privilegiado

`lib/admin/service-client.ts` expõe `getAdminServiceClient()`, com `server-only`, sem sessão, sem cookies e sem refresh. Ele é usado pela auditoria e pelas RPCs de papéis. Não é exportado para componentes client.

---

## 8. Fluxo de Admissão Multiusuário

1. `POST /api/admin/auth/login`: Access, origem, rate limit, `signInWithPassword`, `resolveAdminRole`. Sem papel, `signOut({ scope: 'local' })` e `invalid_credentials`. Com papel, a escada MFA decide entre setup, verify e painel. Falha do banco de papéis encerra a sessão e responde 503 sanitizado.
2. `GET /admin-dashboard/mfa/setup` e `/mfa/verify`: Access, `getUser()`, `resolveAdminRole`. Sem papel, `notFound()`. O fluxo de TOTP segue o da Spec 0018.
3. `POST /api/admin/auth/mfa/enroll` e `/mfa/verify`: Access, origem, `getUser()`, `resolveAdminRole`. Sem papel, 403. A matrícula e o desafio continuam idênticos.
4. `checkAdminUser` no layout: Access, sessão, raiz/papel, MFA. Sem papel, `forbidden()`. Falha do banco, erro seguro.
5. `assertAdminApiAuth` nas APIs: Access, origem, sessão, raiz/papel, AAL2, hierarquia. Sem papel ou papel insuficiente, 403. Sem AAL2, 403. Sem sessão, 401.
6. Recuperação: `recovery` e `recovery/update-password` continuam aceitando apenas `env.adminUserId` e `env.adminEmail`. Delegados são recuperados pelo procedimento da raiz documentado na Spec 0019.

---

## 9. Value Sourcing

| Valor                    | Fonte                                                          |
| ------------------------ | -------------------------------------------------------------- |
| Papel do usuário         | `admin_user_roles.role`; raiz de `env.adminUserId`             |
| E-mail do ator           | `auth.getUser().user.email` no momento do evento               |
| IP do ator               | `CF-Connecting-IP`, validado e truncado em 45 caracteres       |
| `operation_id`           | `crypto.randomUUID()` no serviço de auditoria                  |
| `resource_id`            | parâmetro de rota ou id da entidade mutada                     |
| Papel anterior e novo    | RPC `assign_admin_role`, lidos antes e depois do upsert        |
| Status do evento         | `intent` antes da chamada externa; `success`/`failure` depois  |
| Autor da mutação         | `assertAdminApiAuth` no servidor; nunca do corpo da requisição |
| Data e hora              | `now()` do PostgreSQL                                          |
| Total de artigos/ofertas | serviços existentes da Fase 3, não desta spec                  |

---

## 10. Plano de Construção

- **Lote 1, banco e RLS**: migration com enum, `admin_user_roles`, `is_admin()`, `admin_audit_log`, trigger append-only e RPCs de papel; pgTAP em `supabase/tests/database/admin_rbac.test.sql` cobrindo schema, privilégios, recursão, leitura por papel, trigger e atribuição auditada; `pnpm supabase:reset` e `pnpm supabase:test`.
- **Lote 2, guarda e admissão**: `resolveAdminRole`, `checkAdminUser` com papel, `assertAdminApiAuth(request, requiredRole)`, atualização dos cinco call sites, login, MFA enroll/verify e páginas de MFA; testes Vitest da matriz de papéis e da admissão; atualização dos testes existentes que assumem identidade única.
- **Lote 3, auditoria e papéis**: `lib/admin/service-client.ts`, `lib/admin/audit-service.ts`, `lib/admin/roles.ts`, endpoint de papéis, eventos best-effort de preview, login, logout e avaliar-selo; testes de sanitização, falha crítica, duas fases, idempotência e RPC.
- **Lote 4, fechamento**: script `scripts/admin-bootstrap.mjs`, atualização de specs e índice, Playwright de delegado, `pnpm check:all`, revisão de segurança estática e `pnpm security:all`.
- **Fora de escopo**: UI e métricas do dashboard (Fase 3), endpoints de mutação editorial no Sanity (Fase 3/4), recuperação de delegados, retenção automatizada, WORM físico e migration em produção sem autorização.

**Rascunhos a substituir:** existem dois arquivos não rastreados criados antes desta revisão, `supabase/migrations/20261019210000_admin_rbac_and_audit_log.sql` e `supabase/tests/database/admin_rbac.test.sql`. Eles não são o contrato: a policy `admin_user_roles_admin_all` consulta a própria tabela (recursão de RLS) e o grant de `INSERT` em `admin_audit_log` para `authenticated` permite forjar eventos. O `/develop` deve substituí-los pelo SQL desta spec, no mesmo caminho ou em migration nova com timestamp posterior, e remover o rascunho; nunca aplicar os dois.

Cada tarefa deve citar o AC que satisfaz no relatório do `/develop`.

---

## 11. Riscos e Limites

1. **Teto de CPU de 10 ms**: a raiz evita a consulta de papel; delegados fazem uma consulta indexada de uma coluna. O serviço de auditoria faz um insert por evento. Nenhuma rota nova deve fazer N+1. O limite do plano Cloudflare continua sendo o risco operacional registrado em `check/editorial-sanity/2026-10-19-1655/DEBUG.md`.
2. **Migration em produção**: a criação das tabelas e funções exige autorização e rollback documentado. O rollback remove dados de auditoria; por isso a migration de produção não roda sem aceite explícito.
3. **Raiz permanente**: a raiz não pode ser rebaixada pelo banco. A troca exige mudança de ambiente. É o preço da contingência.
4. **Auditoria sem transação distribuída**: mutações no Sanity usam duas fases; um `intent` órfão é possível e deve ser visível na Fase 3.
5. **PII e retenção**: `actor_email` e `ip_address` são dados pessoais. A Fase 2 não apaga nem expira linhas. A política de retenção e base legal ficam para a Fase 5.
6. **WORM lógico**: o owner do banco pode desabilitar o trigger. A prova é operacional, não física.
7. **Chave de serviço ausente**: auditoria crítica e gestão de papéis falham fechado. O dashboard e as APIs de leitura continuam funcionando conforme o papel.
8. **Supersessão parcial**: a Spec 0018 AC-04 e a Spec 0020 AC-01 precisam de nota de alteração parcial para que o `/check` não as trate como violadas.
9. **Dependência de script de bootstrap**: sem a linha da raiz em `admin_user_roles`, a leitura de auditoria pela raiz via RLS fica indisponível. O script é operacional e idempotente, não um caminho de leitura.

---

## 12. Decisões Pendentes de Aceite

1. **Raiz permanente**: manter `env.adminUserId` como administrador permanente de contingência, sem rebaixamento pelo banco (recomendado), ou exigir linha em `admin_user_roles` e aceitar o risco de lockout.
2. **Matriz de papéis**: manter `editor` publica e `revisor` apenas lê (recomendado, alinhado à auditoria), ou reservar publicação a `admin`.
3. **Gestão de papéis na Fase 2**: incluir o endpoint mínimo `POST/DELETE /api/admin/usuarios/papeis` (recomendado), ou deixar apenas SQL/script até a Fase 3.
4. **Auditoria crítica de ofertas**: manter `price_audit_logs` como registro transacional autoritativo e o evento administrativo como best-effort (recomendado), ou exigir fail-closed também em `avaliar-selo`, o que obriga a alterar a RPC aceita da Spec 0017.
5. **Limite da Fase 2**: manter UI e métricas do dashboard na Fase 3 (recomendado), ou antecipar `getDashboardSummaryMetrics()` para esta entrega.

---

## 13. Referências

- `docs/scope/2026-10-19-2030-auditoria-backend-login-dashboard.md`
- `docs/scope/2026-10-14-2135-backend-auth-operacoes.md`
- `docs/specs/2026-10-14-2150-0018-ambiente-local-login-mfa.md`
- `docs/specs/2026-10-16-1115-0019-recuperacao-administrativa.md`
- `docs/specs/2026-10-16-1650-0020-dashboard-operacional-aal2.md`
- `docs/specs/2026-10-14-1115-0017-fatia4-retencao-worm-endpoints-adendo.md`
- `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`
- `docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md`
- `lib/admin/auth.ts`, `app/api/admin/auth/login/route.ts`, `app/api/admin/auth/mfa/*`, `app/admin-dashboard/mfa/*`
- `supabase/migrations/20261013000000_modulo_ofertas_historico_precos.sql` (trigger append-only)
- `supabase/migrations/20261013030000_modulo_ofertas_pipeline_selo_cupons.sql` (RLS e `service_role`)
- `supabase/tests/database/offers_module.test.sql` (padrão pgTAP)
- `check/editorial-sanity/2026-10-19-1655/DEBUG.md` (limite de CPU)
