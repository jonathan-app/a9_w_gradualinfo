# GradualInfo Editorial

Portal editorial sobre tecnologia e consumo digital: **GradualInfo, gradualinfo.com.br**.

Identificador técnico: `gradualinfo` (o nome no `package.json`).
Branch de trabalho atual: `feat/transicao-editorial-sanity`.

Como o projeto está montado hoje:

- **Sanity** é a fonte editorial única (artigos, autores, editorias, fontes, mídia).
- **Supabase** cuida da autenticação e dos dados da aplicação.
- **Cloudflare Workers** publica o site, com OpenNext adaptando o Next.js para lá.

As decisões ficam em `AGENTS.md` e em `docs/specs/`. O que está na fila agora fica em `workflow/STATE.md`.

## Stack (versões reais, lidas do `package.json`)

| Peça         | Versão     | Observação                                                    |
| ------------ | ---------- | ------------------------------------------------------------- |
| Next.js      | 16.4       | App Router, Turbopack, `proxy.ts` no lugar de `middleware.ts` |
| React        | 19.3.0     | Fixo pelo `overrides` em `pnpm-workspace.yaml`                |
| TypeScript   | 6.0.3      | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`    |
| Tailwind CSS | 4.3        | Configuração em CSS (`@theme` em `app/globals.css`)           |
| Supabase     | ssr 0.12.7 | CLI **pinada em 2.119.0** nos wrappers                        |
|              | js 2.117.3 |                                                               |
| Sanity       | sem SDK    | Content Lake via HTTP e GROQ em `lib/sanity/client.ts`        |
| OpenNext     | 1.20.9     | Adapta o Next.js para o Worker da Cloudflare                  |
| Wrangler     | 4.148      | `wrangler deploy --dry-run` valida o Worker                   |
| Sentry       | 11.5       | `instrumentation.ts` e `instrumentation-client.ts`            |
| Vitest       | 5.0        | Unitários e componentes (jsdom)                               |
| Playwright   | 1.63       | E2E em Chromium                                               |
| jose         | 6.2.12     | Validação do JWT do Cloudflare Access                         |
| pnpm         | 12.5.1     | `packageManager` no `package.json`                            |
| Node         | 22         | `.nvmrc` e `engines.node >= 22`                               |

Duas travas que não são enfeite:

- React e `playwright-core` são fixados por `overrides` no `pnpm-workspace.yaml`. Duas cópias de React quebram hooks, e um alpha do Playwright satisfaz peer dep frouxa.
- `pnpm-workspace.yaml` é a fonte única desses ajustes. O campo `pnpm` do `package.json` é ignorado pelo pnpm 10 em diante.

## Estado das specs (2026-10-10)

| Spec      | Status         | O que cobre                                                                     |
| --------- | -------------- | ------------------------------------------------------------------------------- |
| `md-0001` | Accepted       | Schema editorial, RLS com preview, pgTAP 63 asserções                           |
| `md-0002` | Accepted       | Home, página de artigo e SEO básico (entregue)                                  |
| `0003`    | Accepted       | Autorização e prazo do preview                                                  |
| `0004`    | Accepted       | Gate mecânico vinculado à revisão                                               |
| `0005`    | Accepted       | Diretriz de evolução Sanity + Supabase (documentação)                           |
| `0006`    | Accepted       | Transição editorial para Sanity; AC-06 PASS (resposta real 503 + bloco honesto) |
| `0007`    | Accepted       | Painel `/admin-dashboard`, Supabase Auth e MFA                                  |
| `0008`    | Accepted       | Checklist de segurança de IA (referência)                                       |
| `0842`    | Accepted       | Endurecimento do login, origem, cookies e matrícula MFA                         |
| `0009`    | Accepted       | Admissão pelo Cloudflare Access antes das quotas                                |
| `0852`    | **Superseded** | Rate limiting administrativo, substituída pela `0009`                           |

O índice completo está em `docs/specs/2026-10-08-2228-INDICE.md`.

## Gates locais (medido em 2026-10-10, HEAD `62adba6`)

| Comando                     | Resultado                                                      |
| --------------------------- | -------------------------------------------------------------- |
| `pnpm check:all`            | **exit 0**: typecheck, lint, formatação, 510 testes            |
| `pnpm build:next`           | exit 0, 18 rotas                                               |
| `pnpm build` (OpenNext)     | exit 0, gera `.open-next/worker.js`                            |
| `wrangler deploy --dry-run` | exit 0, bindings `PREVIEW_SESSION_DO` e `ADMIN_RATE_LIMIT_DO`  |
| `pnpm security:sast`        | exit 0, zero findings ERROR (regras em `security/semgrep.yml`) |
| `pnpm security:secrets`     | exit 0, zero findings (gitleaks, histórico e árvore)           |

Detalhes dessa rodada: linhas 186 a 191 de `workflow/STATE.md`.

O que **não** está coberto por esses gates: E2E conectado, as provas reais de Cloudflare Access e de MFA no Supabase controlado, e a validação do Worker publicado.

## Referência visual

`referencias/template-editorial/` é a referência visual versionada por `git mv` (119 arquivos, cores, fontes e breakpoints intactos). A identidade de agência do template original foi removida.

## Comandos

```bash
# Stack local (podman)
pnpm supabase:start           # sobe a stack
pnpm supabase:reset --local   # migrations + seed
pnpm supabase:test            # pgTAP, 63 asserções
pnpm supabase:stop            # para a stack preservando volumes

# Portão de qualidade (mesma ordem da CI)
pnpm check:all                # typecheck + lint + formatação + 319 testes
pnpm test:run                 # só o Vitest
pnpm format:check             # prettier --check . (não use `pnpm prettier --check`)

# Builds, um de cada vez (o OpenNext chama build:next por dentro)
pnpm build:next               # build do Next.js
pnpm build                    # build completo para a Cloudflare
pnpm exec wrangler deploy --dry-run   # valida o Worker sem publicar

# Segurança
pnpm security:secrets         # gitleaks
pnpm security:sast            # semgrep

# E2E
pnpm test:e2e                 # sobe o servidor sozinho

# Template visual
pnpm template:export          # empacota referencias/template-editorial/
```

## Estrutura

```
app/                App Router, rotas, Server Components e CSS global (@theme)
components/
  ui/               Design system (variantes, data-slot)
  layout/           Header e footer
  shared/           Tema, marca, analytics
  admin/            Peças do painel administrativo
e2e/                Playwright (site, painel, acessibilidade, Sanity)
hooks/              Hooks React
lib/
  env.ts            Variáveis tipadas, incluindo o leitor do Access
  admin/             Acesso, autorização, rate limit (Durable Object), cookies
  preview/           Sessão de preview assinada e Durable Object de revogação
  sanity/            Cliente do Content Lake via GROQ
  services/          Camada de leitura (posts)
  supabase/          3 clientes: browser, servidor e proxy
  utils/             Funções puras
supabase/
  migrations/        5 migrations (profiles, posts, schema editorial, RLS, comentário)
  seed.sql           4 fixtures
  tests/             rls_posts_test.sql, 63 asserções pgTAP
scripts/             Gates, scanners e utilitários
check/               Evidência de verificação, por área e data
docs/
  scope/             O que construir e em que ordem
  specs/             Contratos, com status e fonte das decisões
  reviews/           Verificação e revisão
  audits/            Auditorias
  operations/        Procedimentos operacionais
  workflow/          Governança e convenções
workflow/
  STATE.md           Fila de delegação entre agentes
security/            Regras do semgrep e allowlists
.github/workflows/   CI
proxy.ts             Renovação de sessão (proxy do Next 16)
scripts/cloudflare-worker.ts Ponto de entrada do Worker: admissão Access e DOs
DESIGN.md            Design system (tokens em oklch)
AGENTS.md            Contexto durável do projeto
```

Todo artefato exportado em `docs/` nasce com data e hora no nome, no formato `YYYY-MM-DD-HHmm-<nome>.md`, para ordenação cronológica e identificação do relatório mais recente.

## Variáveis de ambiente

```bash
cp .env.example .env.local
```

`lib/env.ts` lê com tipagem e defaults locais, então build e CI rodam sem `.env`. Nenhum `process.env` espalhado pelo código.

| Variável                               | Obrigatória | Descrição                                                      |
| -------------------------------------- | ----------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Sim         | Origem pública (canonical, sitemap)                            |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sim         | URL do projeto Supabase                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Sim         | Chave anônima                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | Servidor    | Migrations e seed; nunca com prefixo `NEXT_PUBLIC_`            |
| `SUPABASE_PREVIEW_TOKEN`               | Preview     | Segredo de entrada da rota de preview                          |
| `SANITY_PROJECT_ID`                    | Sim         | Projeto Sanity (aceita também `NEXT_PUBLIC_SANITY_PROJECT_ID`) |
| `SANITY_DATASET`                       | Sim         | Dataset (aceita também `NEXT_PUBLIC_SANITY_DATASET`)           |
| `SANITY_API_READ_TOKEN`                | Sim         | Token de leitura, só no servidor                               |
| `NEXT_PUBLIC_SANITY_STUDIO_URL`        | Opcional    | URL do Studio                                                  |
| `ADMIN_ACCESS_ISSUER`                  | Servidor    | Issuer do Cloudflare Access, lido pelo Worker                  |
| `ADMIN_ACCESS_AUD`                     | Servidor    | Audience administrativa                                        |
| `ADMIN_ACCESS_OWNER_EMAIL`             | Servidor    | E-mail exato do proprietário                                   |
| `ADMIN_ACCESS_HOSTS`                   | Servidor    | Hostnames em minúsculas, separados por vírgula                 |
| `NEXT_PUBLIC_SENTRY_DSN`               | Opcional    | Vazio desliga o Sentry no build                                |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`        | Opcional    | Padrão `G-7JVZ7JS4MX`                                          |
| `NEXT_PUBLIC_GTM_ID`                   | Opcional    | Padrão `GTM-TQVMR8TN`                                          |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Opcional    | Search Console                                                 |

As variáveis do Sanity já estão no `.env.example` (linhas 167 a 169). A nota de que precisavam ser acrescentadas à mão foi retirada em 2026-10-10.

Nunca coloque valor de segredo em chat, log, relatório ou commit. Use o nome da variável e, se precisar marcar um valor, `[REDACTED]`.

## CI (`.github/workflows/ci.yml`)

| Job               | O que roda                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `quality`         | `pnpm check:all`                                                 |
| `build`           | `pnpm build` (OpenNext)                                          |
| `database`        | `supabase:start` → `reset --local` → `test` (CLI 2.119.0 pinada) |
| `sast`            | `pnpm security:sast`                                             |
| `secrets`         | `pnpm security:secrets` (gitleaks)                               |
| `dependency-scan` | `pnpm audit --audit-level=high`                                  |
| `lighthouse`      | Orçamento de performance                                         |
| `check-gate`      | `scripts/check-gate.mjs`, amarra aprovação a um SHA              |

## Governança

- **Merge e deploy seguem sem autorização.** Publicação é decisão do dono, separada do gate mecânico.
- O gate mecânico aprova um SHA e uma árvore exata. Aprovação não atravessa fronteira de commit.
- Fontes: `AGENTS.md` (convenções), `workflow/STATE.md` (fila), `docs/scope/` (o que construir), `docs/specs/` (contratos), `docs/reviews/` (verificação).

## Próximos passos

1. `/check verify` da spec `0009`, com decisão única amarrada ao hash da árvore testada.
2. Provas conectadas: Cloudflare Access e MFA no Supabase controlado (as sete ACs de MFA seguem `UNVERIFIABLE`).
3. Validar o Worker publicado, que ainda serve um build antigo.

## Estado do deploy (2026-10-10)

A versão publicada é `b04f70c0-1f16-49fc-96c3-d0aa6139f9f9`, lançada em 11:38:47Z.
Ela 500 em `/`, `/api/health`, `/robots.txt` e `/favicon.ico` com `error code: 1101`
e corpo `Unexpected loadManifest(/.next/server/preview-props.json) call!`.

**Causa:** o adaptador OpenNext 1.20.9 inlina `loadManifest()` no bundle em tempo de
build, e o glob que coleta os manifests é `**/{*-manifest,required-server-files,prefetch-hints}.json`.
O arquivo `preview-props.json` não termina em `-manifest`, então nunca é coletado, e a função
joga o erro em toda requisição. O Next.js 16.4 moveu os dados de draft mode para esse arquivo e
chama `getPreviewProps()` de forma incondicional na construção do `NextNodeServer`, antes de
qualquer rota. O upstream resolve o mesmo defeito no PR #1356, ainda não lançado.

**Correção:** `pnpm patch @opennextjs/cloudflare@1.20.9` adicionando `preview-props` ao glob,
em `patches/@opennextjs__cloudflare@1.20.9.patch` e `pnpm-lock.yaml` via `patchedDependencies`.
Verificada localmente com `wrangler dev` no mesmo ambiente: `HEAD /api/health` 200 JSON,
`GET /` 200 com `link rel=canonical`, `GET /artigos/guia-notebook` 404.

**Por que o deploy ainda não tem a correção:** a versão `b04f70c0` foi publicada antes do
commit `c3af31a` que traz o patch. O remote não rebuildou. O dry-run local passou, mas o
dry-run empacota o Worker sem executá-lo em runtime, então não detecta o problema.

**Bloqueio de atualização:** `pnpm update -r` falha com `ERR_PNPM_UNUSED_PATCH` porque o
registry configurado no ambiente (npm público) não publica `@opennextjs/cloudflare@1.20.9`
— `pnpm view` mostra que o público vai até `1.9.2`. A versão 1.20.9 vem de um registry interno
ao qual este sandbox não tem acesso. O `pnpm-lock.yaml` não foi alterado pela falha e
`pnpm install --frozen-lockfile` passa, então o repositório continua estável. Qualquer
atualização que troque o adaptador por uma versão pública perde a patch e o app volta a 500.
A correção entra em produção quando o upstream lançar uma versão pública ou quando houver
acesso ao registry interno para rodar o build.
