# supabase: banco local, migrations e testes pgTAP

## Overview

Esta área guarda o schema do banco em migrations versionadas, o seed do stack
local e as suítes pgTAP que provam RLS, as funções do módulo de ofertas, os
papéis administrativos e a trilha de auditoria. O job `database` da CI repete
as suítes em um stack descartável.

## Key files

| File                                                     | Owns                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `config.toml`                                            | Stack local; cadastro fechado por padrão.                                   |
| `migrations/`                                            | Schema, RLS, triggers e funções em ordem cronológica.                       |
| `migrations/20261019210000_admin_rbac_and_audit_log.sql` | Papéis, RLS, trigger WORM e RPCs de `admin_user_roles` e `admin_audit_log`. |
| `seed.sql`                                               | Conteúdo inicial do banco local.                                            |
| `tests/database/*.test.sql`                              | Suítes pgTAP das ofertas (outliers, frete, cupons).                         |
| `tests/database/admin_rbac.test.sql`                     | 26 asserções de papéis, WORM e RPCs administrativas.                        |
| `tests/rls_posts_test.sql`                               | Suíte pgTAP das policies de posts.                                          |

## Conventions

- Migration nova recebe timestamp próprio no formato `YYYYMMDDHHMMSS_nome.sql`;
  migration já aplicada não se edita.
- RLS ligada em toda tabela nova, com policy por operação (regra 8 do root).
- `admin_audit_log` aceita INSERT e leitura; UPDATE, DELETE e TRUNCATE são
  bloqueados por trigger. `admin_user_roles` tem RLS e leitura do próprio papel.
- As RPCs `assign_admin_role` e `revoke_admin_role` são `SECURITY DEFINER` com
  `search_path` fixo e auditoria na mesma transação.
- Função `SECURITY DEFINER` fixa `search_path = ''` e recebe `REVOKE` e `GRANT`
  explícitos.
- Cada suíte pgTAP declara `plan(N)` e mantém a contagem em sincronia com as
  asserções.
- Validação empírica roda no Supabase local com `pnpm supabase:reset` e
  `pnpm supabase:test`.

## Gotchas

- Os comandos `pnpm supabase:*` usam `pnpm dlx supabase@2.119.0`, sem instalação
  global.
- Produção nunca recebe `supabase db reset`; o stack local é descartável.

## Related specs

- `docs/specs/2026-10-13-1710-0017-modulo-ofertas-historico-precos.md`
- `docs/specs/2026-10-14-1115-0017-fatia4-retencao-worm-endpoints-adendo.md`
- `docs/specs/2026-10-19-2050-0032-backend-administrativo-rbac-auditoria.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a
line stops matching this draft, later runs treat it as curated and will flag
rather than overwrite it._
