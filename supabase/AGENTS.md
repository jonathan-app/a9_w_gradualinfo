# supabase: banco local, migrations e testes pgTAP

## Overview

Esta área guarda o schema do banco em migrations versionadas, o seed do stack
local e as suítes pgTAP que provam RLS e as funções do módulo de ofertas. O job
`database` da CI repete as suítes em um stack descartável.

## Key files

| File                        | Owns                                                  |
| --------------------------- | ----------------------------------------------------- |
| `config.toml`               | Stack local; cadastro fechado por padrão.             |
| `migrations/`               | Schema, RLS, triggers e funções em ordem cronológica. |
| `seed.sql`                  | Conteúdo inicial do banco local.                      |
| `tests/database/*.test.sql` | Suítes pgTAP das ofertas (outliers, frete, cupons).   |
| `tests/rls_posts_test.sql`  | Suíte pgTAP das policies de posts.                    |

## Conventions

- Migration nova recebe timestamp próprio no formato `YYYYMMDDHHMMSS_nome.sql`;
  migration já aplicada não se edita.
- RLS ligada em toda tabela nova, com policy por operação (regra 8 do root).
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

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a
line stops matching this draft, later runs treat it as curated and will flag
rather than overwrite it._
