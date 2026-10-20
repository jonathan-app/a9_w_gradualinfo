# AGENTS.md — contexto durável do projeto

> Este arquivo é gerado e mantido pelo fluxo de Engenharia Agêntica
> (`/audit` cria, `/sync` mantém). Ele guarda fatos do repositório, não
> opinião. `CLAUDE.md` é apenas um ponteiro para cá.

## O que este projeto é

Portal editorial GradualInfo (tecnologia e consumo digital) em Next.js na
Cloudflare Workers, com Supabase como backend de aplicação. O repositório
nasceu como boilerplate e hoje carrega domínio de produto (editorial e
ofertas).

## Arquitetura editorial

**Estado atual do MVP:**

- Seleção de fontes por configuração (não por fallback de falha): o Sanity é a fonte primária quando configurado no ambiente (`isSanityConfigured`); `EDITORIAL_LOCAL=1` ativa o catálogo local exclusivamente em desenvolvimento (`NODE_ENV=development` em loopback); o Supabase permanece como fallback legado apenas quando o Sanity não estiver configurado. Falhas em tempo de execução no Sanity acionam 503 no proxy ou banner honesto de indisponibilidade (Spec 0006), nunca substituição silenciosa pelo catálogo local em produção.
- Corpo editorial em Markdown.
- Preview e publicação seguem os contratos atuais.

## Administração e auditoria

A conta raiz em `ADMIN_USER_ID` é sempre `admin`. Outros operadores entram por
`admin_user_roles` com os papéis `admin`, `editor` e `revisor`; a hierarquia é
cumulativa e as APIs de negócio exigem papel mínimo em `assertAdminApiAuth`.
Eventos administrativos são gravados em `admin_audit_log`, uma trilha append
only (WORM) com operações em duas fases para ações críticas.

**Arquitetura-alvo aprovada:**

- Sanity será a fonte editorial única após migração autorizada (artigos, autores, editorias, fontes, mídia).
- Supabase permanecerá responsável pela camada de aplicação/autenticação.
- A migração exige spec própria, validação e rollback.
- Não manter duas fontes editoriais ativas após a transição.

## Stack (versão real, não aproximada)

| Peça         | Versão                    | Por quê importa                                                      |
| ------------ | ------------------------- | -------------------------------------------------------------------- |
| Next.js      | 16.4                      | App Router, `proxy.ts` no lugar de `middleware.ts`, build Turbopack  |
| React        | 19.3.1 (fixo)             | Ver `overrides` em `pnpm-workspace.yaml` — duas cópias quebram hooks |
| TypeScript   | 6.0.3                     | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`           |
| Tailwind CSS | 4.3                       | Configuração em CSS (`@theme`), não em `tailwind.config.js`          |
| Supabase     | ssr 0.12 + js 2.117       | Sessão em cookie, renovada no `proxy.ts`                             |
| OpenNext     | 1.20.10                   | Adapta a saída do Next para o runtime de Workers                     |
| Sentry       | 11.7                      | A v11 tira o `withSentryConfig`: init em `instrumentation*.ts`       |
| Vitest       | 5.0.4                     | Unidade e componente, em jsdom                                       |
| next-themes  | 1.0.0-beta.0              | A 0.4.x injeta `<script>` no provider e o React 19 não executa       |
| Playwright   | 1.64                      | Ponta a ponta, em Chromium                                           |
| Node         | 22 (`.nvmrc`)             | `engines.node >= 22`                                                 |
| pnpm         | 12.5.1 (`packageManager`) | Lockfile e `overrides` dependem disso                                |

## Build approach

Tracer Bullet — vertical end to end slices, thin but complete through every layer

## Render e cache

A home usa renderização incremental (ISR) com `revalidate = 300`; o cache do
OpenNext fica no KV `NEXT_INC_CACHE_KV`, não no cache de borda. O
`Cache-Control: no-store` em `next.config.ts` é intencional e não desliga o ISR.

## Comandos que importam

```bash
pnpm dev              # desenvolvimento com Turbopack
pnpm build:next       # build do Next (validação local e CI)
pnpm build            # build completo para a Cloudflare (OpenNext)
pnpm check:all        # typecheck + lint + formatação + testes
pnpm test:run         # testes unitários, uma vez
pnpm test:e2e         # ponta a ponta (sobe o servidor sozinho)
pnpm test:editorial   # Playwright editorial isolado (porta 3200, sem credenciais)
pnpm supabase:start   # stack local do Supabase
pnpm supabase:reset   # migrations + seed
pnpm supabase:test    # pgTAP no Supabase local (RLS e ofertas)
pnpm security:secrets # gitleaks sobre o histórico e a árvore atual
pnpm security:sast    # semgrep com as regras em security/semgrep.yml
```

## Mapa de pastas

```
app/            App Router. Rotas, Server Components e o CSS global.
  admin-dashboard/  Painel administrativo (TailAdmin), guards, MFA, preview dispatch.
  api/            Rotas de API: admin (auth, dashboard, evidências, ofertas, preview), health, ofertas, out e preview.
  artigos/        Página de artigo `/artigos/[slug]` com render Markdown.
  busca/          Busca pública por título, resumo, editoria e corpo.
components/
  ui/             Design system. Componente com variante e data-slot.
  layout/         Header e footer da aplicação.
  home/           Componentes da home editorial (hero, destaques 2×2, últimas leituras, seções).
  editorial/      Componentes do leitor (corpo do artigo e compartilhamento).
  shared/         Reutilizável entre features (tema, marca, editorial-cover, editorial-story).
  admin/          Componentes do painel (header, shell, sidebar, MFA enrollment, dashboard operacional).
lib/
  env.ts          Leitura tipada das variáveis, com padrão para build sem .env.
  supabase/       Três clientes: browser, servidor e o que roda no proxy.
  sanity/         Cliente GROQ para leitura editorial (Sanity como fonte única).
  seo/            Dados estruturados (JSON-LD) e construção do sitemap em índice.
  editorial/      Catálogo local de rascunhos e lógica de leitura dos artigos.
  offers/         Módulo de ofertas: selo verificado, cupons, WORM e canonização.
  admin/          Conta raiz, papéis, auditoria WORM, MFA AAL2, rate limit DO, guards e sessão.
  preview/        Durable Object para sessões de preview (criação, revogação, verificação).
  errors/         Erros tipados (ContentUnavailableError) — contrato entre camadas.
  services/       Queries de posts (Sanity), leitura do dashboard e suporte editorial.
  editorial-images.ts  Resolução de capas locais e do CDN do Sanity.
  utils/          Funções puras (cn, formatação).
  audit.ts        Logger de auditoria para ações administrativas.
  logger.ts       Logger estruturado.
hooks/          Hooks que dependem de React.
proxy.ts          O antigo middleware.ts. Renova a sessão a cada requisição. Probe de disponibilidade Sanity.
instrumentation.ts
                  Sentry. O `instrumentation-client.ts` inicializa no cliente.
scripts/        Wrappers Node por trás de `security:*`, preinstall e validação Access.
supabase/       config.toml, migrations/, seed.sql e tests/ (pgTAP).
e2e/            Testes Playwright.
__tests__/      Testes Vitest (unit/ guarda a árvore).
security/       Regras de SAST do Semgrep.
workflow/       Fila de delegação (STATE.md) e check-targets.json.
check/          Artefatos dos gates /check por feature (results.json e evidências).
patches/        Patch do OpenNext aplicado pelo pnpm no install.
.storybook/     Catálogo de componentes (`.stories.tsx` ao lado do componente).
.github/        A CI em `workflows/ci.yml`: quality, security, e2e, database, lighthouse e check-gate.
next.config.ts, open-next.config.ts, wrangler.jsonc
                  Next, adaptação para o Worker e o worker em si.
DESIGN.md       O design system do produto (tokens em oklch, tipografia); build de UI segue ele.
```

## Convenções que este projeto já decidiu

1. **Comentário explica o porquê, não o quê.** Arquivo de config deste repo é
   comentado em português; o padrão é dizer o que a escolha evita, não
   descrever a sintaxe.
2. **`proxy.ts`, nunca `middleware.ts`.** O Next 16 depreciou o segundo, e os
   dois no mesmo projeto é erro de build.
3. **`auth.getUser()` para autorização; `getSession()` só para exibir.** A
   diferença é confiança: `getSession()` lê o cookie que o cliente controla.
4. **Toda `className` condicional passa por `cn()`.**
5. **Server Component por padrão.** `'use client'` só em folha interativa —
   um componente client no topo da árvore puxa a árvore inteira para o cliente.
6. **Tailwind se configura em CSS, não em arquivo.** Tokens em
   `app/globals.css`, no `@theme`. O `tailwind.config.ts` existe de propósito e
   está vazio: ele só impede que uma ferramenta que importa esse nome por
   automático quebre. Nenhum token vive ali.
7. **Variáveis de ambiente tipadas em `lib/env.ts`.** Nenhum `process.env`
   espalhado pelo código.
8. **RLS ligada em toda tabela nova**, com policy por operação.
9. **`pnpm build` só funciona porque `buildCommand` está no topo de
   `open-next.config.ts`.** `defineCloudflareConfig()` descarta chaves globais,
   e o padrão do OpenNext é rodar `pnpm build` — que aqui é o próprio OpenNext.
10. **Todo arquivo de código nasce documentado — e um arquivo tocado que não
    tenha cabeçalho ganha um.** Topo do arquivo com
    `/** @fileoverview ... @module ... @description ... @dependencies ... */`,
    JSDoc (`@param`/`@returns`) em cada export e comentário de porquê onde a
    lógica não se explica sozinha; tudo em pt-BR e **somente adições de
    comentário** — documentar nunca altera linha de código. A fonte de estilo é
    a skill `code-documenter` e o exemplo `scripts/check-env-leak.mjs`;
    `referencias/` e `.agents/` ficam de fora. Baseline: 97 arquivos rastreados
    cobertos em 2026-10-07 (linha 70 de `workflow/STATE.md`).
11. **Nunca expor tokens ou segredos.** Regra permanente para todos os agentes:
    nunca expor tokens ou segredos em chat, comandos visíveis, logs,
    relatórios, testes, commits ou PRs. Usar apenas nomes das variáveis e
    `[REDACTED]`; conferir saídas antes de compartilhá-las.
12. **Todo artefato exportado em `docs/` nasce com data e hora no nome.**
    Formato `YYYY-MM-DD-HHmm-<nome>.md` (ou a mesma estrutura de prefixo
    temporal em `.json`, `.log`, `.patch`). Aplica-se a relatórios de
    auditoria, verificação, revisão e evidência em qualquer subpasta de
    `docs/` — `audits/`, `reviews/`, `evidence/`, `operations/`,
    `tooling/`, `security-*` e futuras. O prefixo permite ordenação
    cronológica e identificação imediata do último relatório gerado, e
    evita colisões entre execuções do mesmo dia. A regra está formalizada
    em `docs/audits/2026-10-09-0735-auditoria-completa.md` (seção 5).
13. **Ponytail & YAGNI para todo agente.** Todo agente de codificação
    (Antigravity, Claude Code, Cursor, Codex, OpenCode, Kilo) deve priorizar o
    menor diff funcional que resolve a tarefa integralmente. Não criar wrappers,
    abstrações prematuras ou dependências dispensáveis quando helpers existentes
    ou a biblioteca padrão atendem ao requisito. Nunca cortar validação em
    fronteiras de confiança ou segurança. Atalhos conscientes são documentados
    com `shortcut: <limite>, <quando refatorar>`.

## Regra Universal de Delegação (handoff entre agentes)

Independente do agente (Kilo, Claude Code, Codex, OpenCode, Antigravity,
Cursor, qualquer outro), **toda tarefa que muda ou decide algo termina com
delegação explícita**. Agentes diferentes não compartilham memória de chat: o
que sobrevive à troca é arquivo no repositório.

1. **Atualizar a fila.** Grave o que foi feito, por qual artefato, em
   `workflow/STATE.md`, como **uma linha nova no histórico**. O histórico é
   registro; a fonte canônica do próximo passo é a seção **Bastão atual** do
   mesmo arquivo. Nem a linha do histórico nem o bloco de delegação da sua
   resposta substituem aquela seção.
2. **Escolher o destino.** Nomeie a habilidade que deve assumir, entre as que
   existem de fato neste repo: `/scope`, `/architect`, `/develop`, `/check`,
   `/debug`, `/test`, `/document`, `/sync`, `/audit`. Se o passo for de
   segurança, não existe skill para isso neste repo: os comandos são
   `pnpm security:secrets` (gitleaks) e `pnpm security:sast` (semgrep, regras
   em `security/semgrep.yml`); se usar ferramenta externa, diga qual executou.
3. **Fechar a resposta com o bloco de delegação** (formato no fim desta seção),
   com o prompt exato e o caminho do artefato esperado.
4. **Sem próximo passo, encerre.** Quando não houver trabalho legítimo a
   passar, o bloco vai com `Próxima etapa: nenhuma` e o STATE marcado como
   `encerrado`. Delegação inventada para "continuar" é o que transforma um
   repositório em fila que nunca esvazia.
5. **Travado em decisão humana, pergunte.** Quando houver trabalho mas ele
   depender de uma decisão que nenhum agente pode tomar — o caso canônico é
   `/scope`, que precisa saber o que o produto faz — o bloco vai com
   `Próxima etapa: decisão do usuário` e a **pergunta exata** a fazer, não o
   nome de uma skill. Inventar skill para obedecer à regra é o mesmo defeito
   de inventar fila.
6. **Sem mudança, sem fila.** Tarefa de leitura, inspeção ou pergunta — que não
   muda estado no repositório e não decide nada — não gera linha nova nem
   delegação. A resposta curta é o produto; bloco de delegação nesse caso é
   ruído.

O `STATE.md` tem dois lugares, **Bastão atual** e **histórico**, e só o
primeiro é o slot de próxima delegação. Os dois são ponto de colisão: dois
agentes escrevendo ao mesmo tempo se sobrescrevem. Releia o arquivo
imediatamente antes de escrever e faça edição cirúrgica (append de linha),
nunca reescrita — a mesma disciplina de concorrência que o `/scope` já aplica
em `docs/scope/`.

Formato obrigatório do bloco final:

```text
==================================================
🔄 DELEGAÇÃO
==================================================
✅ Concluído: <o que foi feito, em uma linha>
📂 Artefatos: <arquivos que o próximo agente vai ler>
➡️ Próxima etapa: <skill | decisão do usuário | nenhuma> (motivo em uma linha)

📋 PROMPT PARA O PRÓXIMO AGENTE:
"<instrução completa, com caminhos de arquivo e o que gravar>"
==================================================
```

## Onde as coisas quebram com mais frequência

- **`NEXT_PUBLIC_*` é inlinado no build.** Referência direta vira literal no
  bundle. No Worker, as variáveis do Supabase são lidas por colchetes em
  `readRuntimeEnv` (`lib/env.ts`), então o valor vem do binding ou segredo em
  runtime. Não use `process.env.NEXT_PUBLIC_*` direto no código de produção.
- **Cookie não salvo em Server Component.** `setAll` é ignorado ali; o
  refresh acontece no `proxy.ts`. É esperado, e o `try/catch` em
  `lib/supabase/server.ts` existe por isso.
- **`cn()` fora de ordem.** `cn('p-2', cond && 'p-4')` sem o `twMerge`
  resolve para `p-2`. O helper já faz a ordem correta.
- **Erro de hidratação com tema.** `suppressHydrationWarning` no `<html>` e o
  botão do tema renderizando vazio antes de montar são o padrão, não bug.
- **`pnpm-workspace.yaml` é a casa dos ajustes do pnpm.** O campo `pnpm` do
  package.json é ignorado pelo pnpm 10+ e emite aviso a cada instalação.
- **Tema sem `next-themes@0.4.x`.** Aquela versão injecta `<script>` como filho
  do provider; o React 19 não executa script dentro de componente, o log fica
  em branco e a hidratação inteira é refeita no cliente — o sintoma é a página
  abrir e nenhum botão responder.
- **`allowedDevOrigins` em `next.config.ts` não é enfeite.** Sem ele, o dev
  server bloqueia `/_next/hmr` pedido por `127.0.0.1` (o baseURL do Playwright),
  e o sintoma é uma página que abre sem nenhuma interação.
- **O proxy roda no runtime Node, e a Cloudflare avisa.** O Next 16 fixa o proxy
  em Node e proíbe declarar `runtime` no arquivo; o OpenNext rotula o suporte
  a middleware Node como experimental. Aviso conhecido, não bug do projeto.
- **Sessões paralelas se escrevem por cima umas das outras.** `main` já tem
  história, mas mudanças ainda não commitadas de outra sessão são
  indistinguíveis das suas, e duas sessões escrevendo ao mesmo tempo se
  sobrescrevem. A única forma de detectar colisão é comparar o mtime e o
  conteúdo de um arquivo que você leu antes de escrever nele, por isso o `stat`
  antes do `edit`.
- **Preview Durable Object não publicado.** Rotas de preview e logout falham
  com 503 se o `PreviewSessionDO` não estiver publicado na Cloudflare com
  migration aplicada. Verificar `wrangler migrations list` e `wrangler deploy`.
- **Cloudflare Access não configurado.** Guards admin devolvem 403/503 sem
  issuer/AUD/hosts válidos em `wrangler.jsonc` ou secrets. Provisionar antes
  de testar rotas protegidas.
- **Sanity dataset sem conteúdo.** Home e artigo devolvem estado vazio ou 404
  se o dataset `production` não tem artigos publicados. AC-02 da spec 0006
  exige conteúdo real.
- **Piso de SEO do Lighthouse é só para página indexável.** O `lighthouserc.cjs`
  scopa `categories:seo` via `assertMatrix` porque `/busca` é noindex de
  propósito (seo/AC-06); adicionar URL nova ao `collect.url` sem revisar o
  padrão reprova o job por `is-crawlable`.

## Portão de qualidade

`pnpm check:all` é o que a CI e os ganchos locais rodam, na mesma ordem:
typecheck, lint, formatação, testes e segurança estática (Gitleaks e Semgrep via `security:all`). Hook de commit roda a checagem de vazamento de env, a
formatação dos arquivos staged e o typecheck; commit não pode custar minutos.
O hook de pré-push (`.husky/pre-push`) e o comando `pnpm deploy:full` bloqueiam
qualquer envio caso `check:all` ou a segurança estática falhem.
A CI tem seis jobs: quality (check:all, typecheck E2E, `pnpm audit
--audit-level=high` e OSV scan), security (gitleaks sobre o histórico
inteiro e semgrep), e2e, database (pgTAP), lighthouse e check-gate. Ela roda
em pull requests para a main e em execução manual (`workflow_dispatch`);
PR que só toca `docs/`, `workflow/`, `check/` ou arquivos `.md` não aciona
a CI, e o gatilho de `push` saiu para caber no plano Free (2.000
minutos/mês) sem rodar a mesma árvore duas vezes.

Limites de cobertura estão em `vitest.config.mts` e `test-preferences.json`:
Piso de branches em 80 (subiu de 60 em 2026-10-10); as outras dimensões
ficam em 60. Medido em 2026-10-19: 902 testes em 88 suites Vitest (sendo 2 testes de paridade editorial de Markdown local em `__tests__/unit/editorial-parity.test.ts`, 6 testes de componentes SVG nativos em `__tests__/unit/components/icons.test.tsx`, 3 de ThemeToggle, 134 testes no módulo de ofertas, 16 de integração Auth real, 14 de integração Recuperação/Contingência, 12 de componentes/serviços do Dashboard operacional, 15 de SEO, 12 de busca e tolerância a erros, 10 de utilitários de stream e respostas de erro da API e 5 de integração de concorrência e idempotência com banco de dados real local), 197 testes pgTAP em 7 arquivos no banco local Supabase,
26 testes Playwright Editorial (2 suites), 7 testes Playwright Admin Auth/Recovery real (3 Auth e 4 Recovery), 1 teste Playwright Admin Operational Dashboard exit 0, 4 testes Playwright de auditoria de SEO em `e2e/seo-audit.spec.ts` contra build de produção e 7 testes Playwright de busca e recorte em `e2e/search-flow.spec.ts` (totalizando 45 testes Playwright). Subir o piso acima do que o
projeto mede esconde o número em vez de avisar.

## Skills de Engenharia Agêntica

`skills-lock.json` é versionado e registra as origens das skills do ciclo.
`.agents/skills/` é instalação local, ignorada pelo Git; seu conteúdo não é
versionado. Instalação, descoberta pelo cliente e execução são estados
diferentes, que devem ser conferidos no ambiente utilizado. O ciclo inclui
`/scope`, `/architect`, `/audit`, `/develop`, `/check`, `/debug`, `/test`,
`/document` e `/sync`. Atualizar: `npx skills@latest update`.

- [`architect`](.agents/skills/architect/SKILL.md): `JavaScript-Mastery-Pro/skills` — decisões load-bearing, specs, trade-offs.
- [`audit`](.agents/skills/audit/SKILL.md): `JavaScript-Mastery-Pro/skills` — cria/preenche AGENTS.md, inventário de código.
- [`check`](.agents/skills/check/SKILL.md): `JavaScript-Mastery-Pro/skills` — validação empírica (verify) e auditoria imparcial (review).
- [`debug`](.agents/skills/debug/SKILL.md): `JavaScript-Mastery-Pro/skills` — root cause com evidência observável.
- [`develop`](.agents/skills/develop/SKILL.md): `JavaScript-Mastery-Pro/skills` — build a partir de spec aceita.
- [`document`](.agents/skills/document/SKILL.md): `JavaScript-Mastery-Pro/skills` — PR, changelog, release note, postmortem.
- [`scope`](.agents/skills/scope/SKILL.md): `JavaScript-Mastery-Pro/skills` — plano grosseiro em docs/scope/, reconciliação.
- [`sync`](.agents/skills/sync/SKILL.md): `JavaScript-Mastery-Pro/skills` — AGENTS.md, scope, STATE.md cirúrgicos.
- [`test`](.agents/skills/test/SKILL.md): `JavaScript-Mastery-Pro/skills` — suíte de testes após build.
- [`jwt-validate`](.agents/skills/jwt-validate/SKILL.md): `jsonwebtoken/jwt-skills` (Okta, Apache-2.0) — validação de JWT: assinatura, `algorithms` allowlist, `iss`/`aud`/`exp`/`nbf`/`iat`, 60s de tolerância e JWKS. Complementar, não substitui a autorização por `ADMIN_USER_ID`, papéis e AAL2 em `lib/admin/auth.ts`.

Quem escreve o quê, para ninguém gravar estado no lugar errado:

| Arquivo             | Dono            | O que é                                 |
| ------------------- | --------------- | --------------------------------------- |
| `docs/scope/`       | `/scope`        | O que construir e em que ordem          |
| `docs/specs/`       | `/architect`    | O contrato de cada feature              |
| `docs/reviews/`     | `/check`        | Verificação e revisão do que foi feito  |
| `workflow/STATE.md` | qualquer agente | A fila de delegação (ver a regra acima) |

As pastas `docs/scope/`, `docs/specs/` e `docs/reviews/` já contêm escopo,
índice, specs, templates e relatórios. Consulte os artefatos vigentes e seus
estados; a presença de um arquivo não comprova aprovação ou execução.

## Context files

- [lib/admin/AGENTS.md](lib/admin/AGENTS.md) (Access, MFA AAL2, papéis e auditoria WORM, rate limit DO, guards admin)
- [lib/editorial/AGENTS.md](lib/editorial/AGENTS.md) (catálogo de rascunhos locais e lógica de leitura dos artigos)
- [lib/offers/AGENTS.md](lib/offers/AGENTS.md) (módulo de ofertas, selo verificado, cupons, WORM e canonização RFC 8785)
- [lib/preview/AGENTS.md](lib/preview/AGENTS.md) (cookie de preview e PreviewSessionDO)
- [lib/sanity/AGENTS.md](lib/sanity/AGENTS.md) (cliente GROQ e fonte editorial primária quando configurada)
- [lib/seo/AGENTS.md](lib/seo/AGENTS.md) (dados estruturados JSON-LD, sitemap em índice e SEO)
- [supabase/AGENTS.md](supabase/AGENTS.md) (migrations, testes pgTAP e RLS do banco)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
