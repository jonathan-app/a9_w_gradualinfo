# AGENTS.md — contexto durável do projeto

> Este arquivo é gerado e mantido pelo fluxo de Engenharia Agêntica
> (`/audit` cria, `/sync` mantém). Ele guarda fatos do repositório, não
> opinião. `CLAUDE.md` é apenas um ponteiro para cá.

## O que este projeto é

Boilerplate de aplicação Next.js hospedada na Cloudflare Workers, com Supabase
como backend. É ponto de partida para produto novo, não um app com domínio.

## Stack (versão real, não aproximada)

| Peça         | Versão                    | Por quê importa                                                      |
| ------------ | ------------------------- | -------------------------------------------------------------------- |
| Next.js      | 16.3                      | App Router, `proxy.ts` no lugar de `middleware.ts`, build Turbopack  |
| React        | 19.3.0 (fixo)             | Ver `overrides` em `pnpm-workspace.yaml` — duas cópias quebram hooks |
| TypeScript   | 6.0.3                     | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`           |
| Tailwind CSS | 4.3                       | Configuração em CSS (`@theme`), não em `tailwind.config.js`          |
| Supabase     | ssr 0.12 + js 2.117       | Sessão em cookie, renovada no `proxy.ts`                             |
| OpenNext     | 1.20                      | Adapta a saída do Next para o runtime de Workers                     |
| Sentry       | 11.4                      | A v11 tira o `withSentryConfig`: init em `instrumentation*.ts`       |
| Vitest       | 4.1                       | Unidade e componente, em jsdom                                       |
| next-themes  | 1.0.0-beta.0              | A 0.4.x injeta `<script>` no provider e o React 19 não executa       |
| Playwright   | 1.63                      | Ponta a ponta, em Chromium                                           |
| Node         | 22 (`.nvmrc`)             | `engines.node >= 22`                                                 |
| pnpm         | 12.5.1 (`packageManager`) | Lockfile e `overrides` dependem disso                                |

## Comandos que importam

```bash
pnpm dev              # desenvolvimento com Turbopack
pnpm build:next       # build do Next (validação local e CI)
pnpm build            # build completo para a Cloudflare (OpenNext)
pnpm check:all        # typecheck + lint + formatação + testes
pnpm test:run         # testes unitários, uma vez
pnpm test:e2e         # ponta a ponta (sobe o servidor sozinho)
pnpm supabase:start   # stack local do Supabase
pnpm supabase:reset   # migrations + seed
pnpm security:secrets # gitleaks sobre o histórico e a árvore atual
```

## Mapa de pastas

```
app/            App Router. Rotas, Server Components e o CSS global.
components/
  ui/           Design system. Componente com variante e data-slot.
  layout/       Header e footer da aplicação.
  shared/       Reutilizável entre features (tema, marca).
lib/
  env.ts        Leitura tipada das variáveis, com padrão para build sem .env.
  supabase/     Três clientes: browser, servidor e o que roda no proxy.
  utils/        Funções puras (cn, formatação).
hooks/          Hooks que dependem de React.
proxy.ts        O antigo middleware.ts. Renova a sessão a cada requisição.
instrumentation.ts
                Sentry. O `instrumentation-client.ts` inicializa no cliente.
scripts/        Wrappers Node por trás de `security:*` e preinstall.
supabase/       config.toml, migrations/ e seed.sql.
e2e/            Testes Playwright.
__tests__/      Testes Vitest (unit/ guarda a árvore).
security/       Regras de SAST do Semgrep.
.storybook/     Catálogo de componentes (`.stories.tsx` ao lado do componente).
.github/        A CI em `workflows/ci.yml`: quality, build e security.
next.config.ts, open-next.config.ts, wrangler.jsonc
                Next, adaptação para o Worker e o worker em si.
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
- **O repositório tem zero commits.** `main` está unborn, então até o primeiro
  commit uma mudança de outra sessão é indistinguível da sua: `git status`
  mostra a árvore inteira como untracked, sem autoria nem hora. A única forma
  de detectar colisão é comparar o mtime e o conteúdo de um arquivo que você
  leu antes de escrever nele — por isso o `stat` antes do `edit`.

## Portão de qualidade

`pnpm check:all` é o que a CI roda, na mesma ordem: typecheck, lint,
formatação, testes. Hook de commit roda apenas formatação e typecheck —
commit não pode custar minutos. O build é job separado na CI, e um terceiro
job roda `pnpm audit --audit-level=high` e o gitleaks sobre o histórico inteiro.

Limites de cobertura estão em `vitest.config.mts` e `test-preferences.json`:
60% hoje, para virar gate real a cobertura precisa passar de 80% primeiro.
Subir o piso acima do que o projeto mede esconde o número em vez de avisar.

## Skills de Engenharia Agêntica

`skills-lock.json` é versionado e registra as origens das skills do ciclo.
`.agents/skills/` é instalação local, ignorada pelo Git; seu conteúdo não é
versionado. Instalação, descoberta pelo cliente e execução são estados
diferentes, que devem ser conferidos no ambiente utilizado. O ciclo inclui
`/scope`, `/architect`, `/audit`, `/develop`, `/check`, `/debug`, `/test`,
`/document` e `/sync`. Atualizar: `npx skills@latest update`.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
