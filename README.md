# GradualInfo

Portal editorial sobre tecnologia e consumo digital, desenvolvido com Next.js e publicado na Cloudflare Workers. O código da aplicação, os contratos de produto e o estado das entregas vivem neste repositório.

## Começar

Requisitos: Node.js 22, pnpm 12.5.1 e, para a stack local, Podman ou Docker com Supabase CLI disponível pelos scripts do projeto.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Abra `http://localhost:3000`. Preencha em `.env.local` apenas as variáveis necessárias ao fluxo que deseja testar. O modelo atualizado está em [`.env.example`](.env.example); nunca versione valores de segredos. Sem conteúdo publicado no dataset Sanity, a home pode mostrar o estado de indisponibilidade previsto pelo contrato editorial.

Para inspecionar os seis artigos Markdown locais sem depender de Sanity ou Supabase:

```bash
pnpm dev:editorial
```

Esse catálogo é um ambiente de revisão. A fonte editorial da aplicação publicada é o Sanity; rascunhos locais e documentos `drafts.*` não equivalem a artigos publicados.

## Arquitetura

- **Next.js 16.4 e React 19.3:** App Router, Server Components por padrão e Tailwind CSS 4 configurado em `app/globals.css`.
- **Sanity:** leitura editorial por GROQ em `lib/sanity/`; artigos, autores, editorias, fontes e mídia. O conteúdo precisa estar publicado para aparecer na leitura pública.
- **Supabase:** autenticação e dados de aplicação. `proxy.ts` renova a sessão; autorização administrativa usa usuário autenticado e MFA.
- **Cloudflare Workers e OpenNext:** `scripts/cloudflare-worker.ts` é o ponto de entrada do Worker. Cloudflare Access protege a admissão administrativa; Durable Objects sustentam preview e rate limit.
- **Sentry:** instrumentação de servidor e cliente nos arquivos `instrumentation*.ts`.

Decisões e contratos estão em [AGENTS.md](AGENTS.md), [docs/specs/](docs/specs/) e [DESIGN.md](DESIGN.md). A fila de trabalho e as verificações mais recentes estão em [workflow/STATE.md](workflow/STATE.md) e [docs/reviews/](docs/reviews/).

## Comandos principais

| Comando                                                              | Uso                                       |
| -------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm dev`                                                           | Servidor de desenvolvimento com Turbopack |
| `pnpm dev:editorial`                                                 | Catálogo local dos artigos Markdown       |
| `pnpm editorial:sync`                                                | Sincroniza o conteúdo editorial local     |
| `pnpm check:all`                                                     | Typecheck, ESLint, Prettier e Vitest      |
| `pnpm test:e2e`                                                      | Playwright em Chromium                    |
| `pnpm test:editorial`                                                | Playwright para o catálogo local          |
| `pnpm build:next`                                                    | Build do Next.js                          |
| `pnpm build`                                                         | Build OpenNext para Cloudflare Workers    |
| `pnpm exec wrangler deploy --dry-run`                                | Valida o pacote do Worker sem publicar    |
| `pnpm security:sast` / `pnpm security:secrets`                       | Semgrep / gitleaks                        |
| `pnpm supabase:start` / `pnpm supabase:reset` / `pnpm supabase:test` | Stack local, migrations e pgTAP           |

`pnpm build` já chama o build do Next.js; execute os builds em sequência. Os demais scripts estão em [`package.json`](package.json).

## Ambiente e publicação

[`lib/env.ts`](lib/env.ts) centraliza a leitura tipada das variáveis. O [`.env.example`](.env.example) lista os nomes atuais, incluindo configuração pública, Sanity, preview, admin e observabilidade. Os valores privados pertencem ao ambiente local ou aos Worker Secrets, nunca ao Git, a logs ou a artefatos compartilhados.

O build local e o dry run não provam o comportamento do Worker publicado. Antes de promover uma versão, consulte os critérios da spec aplicável e o relatório de `/check verify` correspondente em `docs/reviews/`. Publicação de conteúdo no Sanity e implantação do Worker são operações distintas.

## Estrutura

```text
app/                 Rotas e páginas do App Router
components/          UI, layout, home e peças editoriais
lib/sanity/          Cliente GROQ
lib/services/        Leitura editorial da aplicação
lib/supabase/        Clientes de autenticação e dados
lib/admin/           Guardas administrativos e rate limit
lib/preview/         Sessões de preview e revogação
supabase/            Migrations, seed e testes pgTAP
e2e/                 Testes ponta a ponta
__tests__/           Testes unitários e de integração
scripts/             Ferramentas de build, segurança e editorial
docs/scope/          Escopo do produto
docs/specs/          Contratos e critérios de aceite
docs/reviews/        Evidências e decisões de verificação
workflow/STATE.md    Bastão atual e histórico de trabalho
```

Todo relatório exportado em `docs/` recebe prefixo `YYYY-MM-DD-HHmm-` no nome. Para saber o próximo passo, leia primeiro a seção **Bastão atual** de `workflow/STATE.md`; resultados históricos não substituem uma verificação da árvore atual.
