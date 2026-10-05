# GradualInfo Editorial

Portal editorial sobre tecnologia e consumo digital — **GradualInfo · gradualinfo.com.br**.

Identificador técnico: `gradualinfo-editorial`. Branch de trabalho: `chore/reconciliar-scope-spec-gates` (base `0275021`).

## Stack Principal (versões reais, fixadas)

| Peça         | Versão              | Observação                                                 |
| ------------ | ------------------- | ---------------------------------------------------------- |
| Next.js      | 16.3                | App Router, Turbopack, `proxy.ts`                          |
| React        | 19.3.0              | Fixo via `overrides` no `pnpm-workspace.yaml`              |
| TypeScript   | 6.0.3               | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` |
| Tailwind CSS | 4.3                 | Configuração em CSS (`@theme` em `app/globals.css`)        |
| Supabase     | SSR 0.12 + JS 2.117 | CLI **pinada em 2.119.0** nos wrappers                     |
| OpenNext     | 1.20                | Adaptação p/ Cloudflare Workers                            |
| Sentry       | 11.4                | `instrumentation.ts` / `instrumentation-client.ts`         |
| Vitest       | 4.1                 | Unitários e componentes (jsdom)                            |
| Playwright   | 1.63                | E2E em Chromium                                            |
| pnpm         | 12.5.1              | `packageManager` no `package.json`                         |
| Node         | 22                  | `.nvmrc` + `engines.node >= 22`                            |

## Estado Atual (2026-10-05)

| Spec               | Status                     | Detalhe                                                                                                                                   |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `md-0001`          | **Implemented & Verified** | Schema editorial (3 migrations), RLS com preview (`app_metadata`), pgTAP **63 asserções**, seed com 4 fixtures, `check:all` **68 testes** |
| `md-0002`          | **Accepted**               | 10 tarefas; **Tarefa 1 concluída** (`formatDate` com `timeZone` opcional, 3 testes, PASS 68/63); Tarefas 2–10 pendentes                   |
| `md-0002` Tarefa 1 | **Done**                   | `formatDate` aceita `timeZone?`, sem parâmetro mantém fuso do ambiente; 3 testes Vitest novos; gates verdes                               |

**Verificação local:** `pnpm check:all` (68 testes) + `pnpm supabase:test` (63 asserções pgTAP) — **PASS**.

## Referência Visual

`referencias/template-editorial/` — template de blog versionado por `git mv` (119 arquivos, cores/fontes/breakpoints intactos). Design preservado; identidade de agência removida.

## Comandos Principais

```bash
# Stack local (podman)
pnpm supabase:start           # sobe 12 containers
pnpm supabase:reset --local   # migrations + seed (4 fixtures)
pnpm supabase:test            # pgTAP 63 asserções
pnpm supabase:stop            # para stack (preserva volumes)

# Quality gate
pnpm check:all                # typecheck + lint + prettier + 68 testes
pnpm test:run                 # só Vitest
pnpm build:next               # build Next.js (7 rotas)
pnpm build                    # build p/ Cloudflare (OpenNext)

# Template visual
pnpm template:export          # empacota referencias/template-editorial/
```

## Estrutura do Projeto

```
app/               # App Router, Server Components, CSS global (@theme)
components/
  ui/              # Design system (variantes, data-slot)
  layout/          # Header, Footer
  shared/          # Tema, marca
referencias/
  template-editorial/  # Referência visual (git mv de template-aqua/)
lib/
  env.ts           # Variáveis tipadas (padrão local p/ build sem .env)
  supabase/        # 3 clientes: browser, server, proxy
  utils/           # Funções puras (cn, formatDate, etc.)
hooks/             # Hooks React
supabase/
  migrations/      # 5 migrations (0000 profiles, 0001 posts, 0002 schema, 0003 RLS, 0004 comment)
  seed.sql         # 4 fixtures (publicado, rascunho, arquivado, agendado)
  tests/
    rls_posts_test.sql  # pgTAP 63 asserções (acesso efetivo por papel)
proxy.ts           # Renovação de sessão Supabase (middleware Node)
instrumentation.ts # Sentry server
workflow/
  STATE.md         # Fila de delegação entre agentes
.github/
  workflows/ci.yml # 4 jobs: quality, build, database (30min, CLI 2.119.0), security
```

## Variáveis de Ambiente

```bash
cp .env.example .env.local
```

`lib/env.ts` lê com tipagem e defaults locais; build e CI rodam sem `.env`.

| Variável                    | Obrigatória | Descrição                           |
| --------------------------- | ----------- | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Sim         | Origem pública (canonical, sitemap) |
| `SUPABASE_URL`              | Sim         | URL do projeto Supabase             |
| `SUPABASE_ANON_KEY`         | Sim         | Chave anônima                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim         | Para migrations/seed                |
| `SUPABASE_PREVIEW_TOKEN`    | Preview     | Token p/ rota de preview (md-0002)  |

## CI / GitHub Actions

| Job        | Timeout    | Detalhe                                                              |
| ---------- | ---------- | -------------------------------------------------------------------- |
| `quality`  | 15 min     | `pnpm check:all`                                                     |
| `build`    | 20 min     | `pnpm build` (OpenNext)                                              |
| `database` | **30 min** | `supabase:start` → `reset --local` → `test` (CLI **2.119.0 pinada**) |
| `security` | 10 min     | `pnpm audit --audit-level=high` + gitleaks                           |

## Branches Protegidas

- `main` — deploy automático via OpenNext/Cloudflare
- `chore/reconciliar-scope-spec-gates` — branch de trabalho atual

## Backup Periódico

Script: `/tmp/kilo/backup.sh` (git bundle → fetch → reset --hard na branch de trabalho)  
Cron: `*/30 * * * *` — logs em `/tmp/kilo/backup-*.log` (limpeza > 24h)

## Próximos Passos (md-0002)

1. **Tarefa 2** — Confirmar schema `posts` + RLS + índice (`/check` → `/develop`)
2. **Tarefa 3** — Camada de leitura única (`lib/posts.ts`: publicados ordenados/limitados + busca por slug + checagem preview)
3. **Tarefa 4** — Card + Home (esboço + grade 9 + estado vazio + `loading.tsx`)
4. **Tarefa 5** — `/artigos/[slug]` com `notFound()` + `react-markdown`
5. **Tarefa 6** — `generateMetadata` + JSON-LD seguro (escape entidades Unicode)
6. **Tarefa 7** — `sitemap.ts` dinâmico (`no-store`, `lastModified = updated_at`)
7. **Tarefa 8** — Rota de preview (usuário dedicado, `timingSafeEqual`, expiração, logout, `no-store`/`noindex`)
8. **Tarefa 9** — Testes E2E + axe + JSON-LD malicioso
9. **Tarefa 10** — Renderizar `fontes_citadas` (seção "Fontes", links absolutos, vazio = sem seção)

---

**Merge, push e deploy continuam sem autorização.** O trabalho segue no clone local e na branch `chore/reconciliar-scope-spec-gates`.
