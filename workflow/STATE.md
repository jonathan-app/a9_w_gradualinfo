# workflow/STATE.md — fila de delegação

> Este arquivo é a **memória de passagem de bastão** entre agentes. O contexto
> do projeto (stack, convenções, o que já foi resolvido) está em `AGENTS.md`.
> O que construir está em `docs/scope/`. Aqui mora só uma coisa: **quem faz o
> quê, e o que está na fila agora**.

## Como usar

1. Toda tarefa que muda ou decide algo acrescenta **uma linha** no histórico.
2. A linha do **histórico** é registro. Quem manda no próximo passo é a seção
   **Bastão atual**: ela é a fonte canônica, e o bloco de delegação da
   resposta não a substitui.
3. Ao terminar, feche a resposta com o bloco de delegação descrito em
   `AGENTS.md`.
4. Sem trabalho legítimo sobrando, marque `encerrado` — não invente fila para
   "continuar".
5. Tarefa que só lê, inspeciona ou pergunta não acrescenta linha nem delega.

Concorrência: releia o arquivo imediatamente antes de escrever e use append de
linha. O slot de próxima delegação é a seção **Bastão atual**; reescrever o
arquivo inteiro perde o handoff de quem estiver escrevendo ao mesmo tempo.

## Bastão atual

**Passo 1 do Plano (Scope Reconciliado)**: encerrado.** O arquivo de escopo `0001-mvp-portal-gradualinfo.md` foi atualizado para alinhar-se com a visão editorial: conteúdo Markdown via Supabase, `/template-aqua` mantido como referência, e público direcionado. Próxima etapa desta tarefa: nenhuma. As pendências anteriores do produto e das branches seguem abaixo.

**Aberto.** O scope está na **revisão 2**, reconciliado com as decisões do dono.
Nenhum código foi escrito. **Antes de qualquer escrita: resolver a concorrência
de agentes abaixo.**

- **Decisões do dono (2026-10-04), já gravadas no scope:** artigo no **Supabase
  com corpo Markdown** (não MDX, não Velite, não CMS); `template-aqua` como
  **referência visual** a portar para TypeScript, sem vestígio de Velite/MDX;
  público inicial **estudantes de programação**; primeira jornada = guia
  "manter, melhorar ou comprar um notebook para estudar programação"; **sem
  painel editorial** (publicação por migration versionada); fora de escopo:
  histórico de preços, Selo "Oferta Verificada", painel, RAG e comunidade — cada
  um em spec própria.
- **Bloqueio de sequência:** a spec de supersessão **já existe** em `main`
  (`md-0001-arquitetura-markdown-supabase.md`, Accepted, 2026-10-04 20:34) e está
  coerente com a decisão do dono. Não escrever outra. O que falta é a
  **colisão de ID** entre `main` e a branch, e a `md-0002-casca-editorial-home.md`
  (Proposed), que cobre as fatias 2, 3 e 4 do scope e precisa ser reconciliada
  com elas em vez de duplicada.
- **Concurrency blocker:** às 00:08 de 2026-10-05 havia **três outras sessões de
  agente ativas nesta máquina** — Copilot (PID 6895), Antigravity/`agy` (PID
  7207) e Codex (PID 7640), todos desde ~16:50, mais um `test-server` do
  Playwright morto (PID 7274). Efeito observável: 17 arquivos de
  `template-aqua/` apagados da árvore de trabalho sem stagear, `dist/.gitkeep`
  apagado, `.git/FETCH_HEAD` tocado. **A atribuição das exclusões a esses
  processos não está provada** — presença de processo é risco de concorrência,
  não causa. `.git/index` está intacto desde 13:07, então nada foi commitado.
  **Nenhum agente deve editar esta árvore até que os três parem.** O worktree
  `.kilo/worktrees/gem-roadway/` existe para exatamente isso e não está sendo
  usado.
- **`/check` NÃO está mais bloqueado — retificação.** Outra sessão criou
  `scripts/check-decision.mjs` e `scripts/check-gate.mjs` (2026-10-04, 20:39) e
  eu verifiquei por execução: os cinco casos de reprovação — lista de ACs vazia,
  `UNVERIFIABLE`, `PASS` sem evidência, `BLOCKER` — saem com código 1 e
  `approved: false`; o caso válido sai com 0 e `true`. **A regra "sem autoridade,
  então BLOQUEADO" deixou de valer.** O Finding 8 da auditoria está superado e
  precisa ser corrigido lá também. Pendência real que sobra: nenhum script do
  `package.json` chama `check-decision.mjs`, então `pnpm check:all` **não
  executa o gate** — só ele roda à mão.
- **Kilo: configuração presente; descoberta não verificada.** `kilo.json`
  existe, e o campo que ele usa é `skills_dir`, que **não é do esquema do Kilo** —
  o esquema é `{ "skills": { "paths": [".agents/skills"] } }`. As duas coisas
  valem ao mesmo tempo, e por isso a formulação é esta: **não afirmamos que as
  skills carregam nem que não carregam.** O que sabemos é o arquivo estar
  presente e o campo não ser reconhecido. Descobrir o resto exige sessão
  reiniciada, porque `skills.paths` é lido no startup — e essa verificação está
  pendente, não concluída.
- **Colisão de ID de spec:** `0001` e `0002` nomeam documentos **diferentes**
  dependendo da branch. Em `main`: `md-0001-arquitetura-markdown-supabase.md`
  (Accepted) e `md-0002-casca-editorial-home.md` (Proposed). Na branch
  `feat/identidade-portal-gradualinfo`: `0001-blog-template-aqua.md` e
  `0002-mvp-portal-gradualinfo.md` (premissa MDX, revogada). A spec de
  supersessão **já existe** — não escrever outra. Resolver a colisão por caminho
  completo e revisão, não por ID.
- **Onde está:** `AGENTS.md` (contexto), `README.md` (uso), este arquivo (fila),
  `docs/scope/0001-mvp-portal-gradualinfo.md` (o que construir e em que ordem),
  `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` (inventário de skills
  e estrutura), `docs/reviews/2026-10-05-manifesto-captura.md` (isolamento),
  `docs/reviews/2026-10-05-auditoria-estado-entrega.md` (estado contra o
  checklist de agência).
- **Estado da entrega, em uma frase:** a fundação de engenharia está pronta e
  verificada; **0 das 9 fatias** do produto estão entregues. É o primeiro dia de
  produto com base pronta — não um produto a 55%. O número veio de uma média
  que não fecha: 595 ÷ 17 = **35,0%**, e o "~55%" declarado é a média excluindo
  os oito zeros.
- **Páginas legais (LGPD) é a única lacuna que eu defenderia** fora do checklist
  de produto: publicar para leitor no Brasil e coletar e-mail depois exige
  privacidade e termos. É piso de compliance, não melhoria.
- **Trabalho isolado em clone:** `a9_w_gradualinfo__iso`, branch
  `chore/reconciliar-scope-spec-gates`, staged e **sem commit** porque o
  pre-commit reprova sempre (gate herdado, não desta tarefa).
- **Produto:** portal de tecnologia em pt-BR, cinco editorias, foco em
  cauda longa. Diferencial é o Selo "Oferta Verificada", que é a fatia de maior
  risco (fatia 7) porque depende de fonte de preço de terceiro e de janela de
  30 dias.
- **Provedor do dado:** `docs/scope/0001-mvp-portal-gradualinfo.md` (**revisão
  3**). Nove fatias de lançamento: schema do artigo → home → página de artigo →
  **SEO básico** → publicação por migration → referência visual → primeira
  jornada → SEO aprofundado → busca. **Comentários e conta saíram** para
  pós-MVP, junto com comunidade. Specs existentes: `main:0001` (Accepted,
  supersessão) e `main:md-0002-casca-editorial-home.md` (Proposed, cobre as fatias
  2, 3 e 4).
- **Estado real do produto:** `main` não tem nenhuma rota de produto. Tudo que
  existe está em 9 branches não mergeadas; a mais advanced é
  `feat/identidade-portal-gradualinfo` (`/blogs`, `/editorias/[slug]`,
  `/radar-de-ofertas`, `/sobre`, 5 tabelas com RLS, `content/blogs/**` em MDX).
  Qualquer afirmação de "entregue" tem que dizer em qual branch.
- **Skills: instaladas, mas desligadas do Kilo.** Retificação: duas linhas deste
  arquivo já afirmaram o contrário e estavam erradas. As skills **estão** em
  `.agents/skills/` — eram 37 às 18:28 e são **48** agora, porque outro agente
 outro agente ter instalado mais 11 (`cloudflare-workers-expert`, `cloudflare-security-audit`,
  `sentry-automation`, `playwright-skill`, `vitest-skill`, `shadcn`, `hono`,
  `tailwind-design-system`, `tailwind-patterns`, `semgrep-rule-creator`,
  `nextjs-supabase-auth`). Somem de qualquer varredura baseada em git porque
  `.agents/` está no `.gitignore` (linha 58). Sobre descoberta: **configuração
  presente, descoberta não verificada** — `kilo.json` existe e usa campo fora do
  esquema, então nenhuma afirmação sobre carga de skill é sustentável até uma
  sessão reiniciada contar o que carrega. Auditoria completa em
  `docs/reviews/2026-10-04-auditoria-skills-estrutura.md`.
- **Outros dois riscos de estrutura:** `Skills-base/` (4.235 `SKILL.md`, 185 MB)
  **não está mais na máquina** — foi migrado e podado por outra sessão (ver
  linha 21 do histórico): ~11 skills escolhidas foram para `.agents/skills/` e o
  resto da pasta foi apagado. As 4.235 só existem no ZIP. E
  `.kilo/worktrees/gem-roadway/` é worktree órfão em detached HEAD, sem
  `.kilo/agent-manager.json`.
- **`AGENTS.md` erra sobre skills:** afirma que `.agents/skills/` é *versionado*.
  Não é — `skills-load-config.md` está certo ao dizer que não é. O dono de
  `AGENTS.md` é o `/sync`.
- **Bloqueio conhecido:** o build e a CI rodam sem `.env` porque `lib/env.ts`
  tem padrão local. A autenticação só funciona depois de `.env.local` e
  `pnpm supabase:start`.
- **Limite do gate:** `workflow/STATE.md` está no `.prettierignore`. A fila é
  append-only por regra, e o realinhamento de tabela do Prettier fazia cada
  linha nova reprovar o `format:check`.
- **Fila paralela (independe do `/scope`):** 10 branches de trabalho prontas,
  mapeadas em `BRANCHES.md` com a ordem de merge. Cada uma é 1 PR com `/check`
  antes do merge, e a branch `audit/mcp-sdd-skills-comentarios-check` entra por
  último (branch 10, adiciona os docs que as outras consomem). Merge exige ação
  humana no GitHub.

## Histórico

| #   | Data       | Habilidade                               | Artefato principal                                                                                                                 | Estado    |
| --- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 01  | 2026-10-04 | bootstrap (fora do fluxo de skill)       | `package.json`, `next.config.ts`, `open-next.config.ts`, `app/`, `lib/`, `proxy.ts`, `.github/workflows/ci.yml`, `.agents/skills/` | concluído |
| 02  | 2026-10-04 | protocolo de delegação                   | `AGENTS.md`, `workflow/STATE.md`                                                                                                   | em curso  |
| 03  | 2026-10-03 | manutenção (fora do fluxo de skill)      | `eslint.config.mjs`, `open-next.config.ts`, `components/shared/theme-toggle.tsx`                                                   | concluído |
| 04  | 2026-10-03 | /sync                                    | `AGENTS.md`, `README.md`, `workflow/STATE.md`                                                                                      | concluído |
| 05  | 2026-10-04 | teste do protocolo (delegação 1 de 2)    | `workflow/STATE.md`                                                                                                                | concluído |
| 06  | 2026-10-04 | correção do protocolo (delegação 2 de 2) | `AGENTS.md`, `workflow/STATE.md`                                                                                                   | em curso  |
| 07  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `.gitattributes`, `scripts/sync-gitattributes.mjs`, `dist/.gitkeep`, `package.json`                                              | concluído |
| 08  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `scripts/export-template.mjs`, `package.json` (`template:export`)                                                                 | concluído |
| 09  | 2026-10-03 | auditoria (fora do fluxo de skill)       | branch `audit/mcp-sdd-skills-comentarios-check`: `.agents/mcp.json`, `docs/MCP.md`, templates em `docs/`, `GUIA-RAPIDO-SKILLS.md`, `skills-load-config.md`, `exemplos/`, `docs/workflow/comentarios-codigo.md`, `.gitignore` (`!.agents/mcp.json`) | concluído |
| 10  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `.prettierignore` (fila do STATE fora do `format:check`)                                                                            | concluído |
| 11  | 2026-10-04 | /check da auditoria (fora do fluxo de skill) | branch `audit/mcp-sdd-skills-comentarios-check`: `docs/reviews/_TEMPLATE.md` (`pnpm security:env` inexistente → `security:secrets`), `skills-load-config.md` + `GUIA-RAPIDO-SKILLS.md` (23 skills listadas que não existem no lock), `docs/MCP.md` (referência de domínio removida; devDeps do MCP fora), `package.json` (devDeps removidas e ordenadas), `pnpm-workspace.yaml` (override `playwright-core: 1.63.0`), `pnpm-lock.yaml` (ressincronizado), `prettier --write` nos 8 arquivos da branch | concluído |

| 12  | 2026-10-04 | manutenção e /sync (sem contexto a sincronizar) | `.gitignore` (ambientes, caches, relatórios de segurança, sessões Playwright e skills versionáveis), `workflow/STATE.md`; 21 caminhos validados com `git check-ignore --no-index` | encerrado |
| 13  | 2026-10-04 | manutenção (fora do fluxo de skill)             | `.gitattributes` (`/dist export-ignore` para o `pnpm template:export`)                                                                                                        | concluído |
| 14  | 2026-10-04 | manutenção (fora do fluxo de skill)             | Vários arquivos: renomeado "Aqua9" para "Gradualinfo" e o dev para "Jonathan Simão"                                                                                           | concluído |
| 15  | 2026-10-04 | /scope                                    | `docs/scope/0001-mvp-portal-gradualinfo.md` (11 fatias ordenadas por valor, fora de escopo explícito, decisões assumidas com padrão), `workflow/STATE.md`                                                              | concluído |
| 16  | 2026-10-04 | correção do /scope (conflito com specs aceitas) | `docs/scope/0001-mvp-portal-gradualinfo.md` (artigo em MDX/Velite e não em `posts`; rota `/blogs/[slug]`; fatia 4 virou fluxo por PR; spec da fatia 1 passa de `0001` para `0003`), `workflow/STATE.md`                               | concluído |
| 17  | 2026-10-04 | auditoria de inventário (fora do fluxo de skill)  | `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` (37 skills instaladas e não ligadas ao Kilo; `Skills-base/` 185 MB sem gitignore; worktree órfão; registro com nome antigo), `workflow/STATE.md` | concluído |
| 18  | 2026-10-04 | achado de concorrência (fora do fluxo de skill)   | `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` Finding 0; `workflow/STATE.md`                                                                             | concluído |
| 19  | 2026-10-04 | revisão da própria auditoria (correções aceitas)   | `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` (atribuição das exclusões rebaixada a não provada; Finding 8 sobre `check-decision.mjs` ausente; `gitignore` não desindexa rastreado; correção do `kilo.json` marcada como não testada), `workflow/STATE.md` | concluído |
| 20  | 2026-10-04 | regra de comportamento do `/check` (sem código)      | `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` (Finding 8: enquanto o script não existir o veredito é BLOQUEADO, nunca aprovação; ordem spec → develop → test com casos de reprovação), `workflow/STATE.md` | concluído |
| 21  | 2026-10-04 | manutenção (fora do fluxo de skill)             | Migração cirúrgica de skills de `Skills-base/` para `.agents/skills/` (Tailwind, Supabase, Cloudflare, Hono, Playwright, Vitest, etc) e limpeza da pasta residual | concluído |
| 22  | 2026-10-04 | arquitetura de domínio (fora do fluxo de skill) | Definição da Arquitetura Editorial Agêntica (Engineering Core + Specialist Base + Editorial System) com mapeamento P0/P1 gravada em `docs/workflow/arquitetura-editorial.md` | concluído |
| 23  | 2026-10-04 | /scope                                    | `docs/scope/0001-mvp-portal-gradualinfo.md` refatorado para decisões MVP: Supabase+Markdown (em vez de MDX), público inicial de estudantes, `/template-aqua` visual e inserção de dados sem painel admin | concluído |
| 24  | 2026-10-05 | /scope revisão 2 (reconciliação com o dono) | `docs/scope/0001-mvp-portal-gradualinfo.md` (9 fatias: schema do artigo, home, página de artigo, publicação por migration, referência visual, primeira jornada do guia do notebook, SEO, busca, comentários; bloco MDX fora de escopo; seção "Specs a substituir"), `workflow/STATE.md` (decisões do dono, bloqueio de supersessão de `0001`/`0002`, contagem de skills corrigida para 48) | concluído |
| 25  | 2026-10-05 | /scope revisão 3 + retificação da auditoria | `docs/scope/0001-mvp-portal-gradualinfo.md` (SEO básico vira fatia 4; comentários saem para pós-MVP; Markdown reexplicado — não bloqueia calculadoras/selos; publicação por migration com AC de reaplicação; seção "Specs: as que existem e as que precisam de identificador livre"), `docs/reviews/2026-10-04-auditoria-skills-estrutura.md` (Finding 8 superado com prova por execução; Finding 3 retificado — `kilo.json` existe com campo inválido), `workflow/STATE.md` (`/check` desbloqueado; colisão de ID `0001`/`0002`) | concluído |
| 26  | 2026-10-05 | isolamento em clone + auditoria de entrega | `docs/reviews/2026-10-05-manifesto-captura.md` (origem `bec25aa`, 9 artefatos com SHA-256 em dois passos, commit barrado por gate herdado), `docs/reviews/2026-10-05-auditoria-estado-entrega.md` (checklist de agência: média declarada ~55% não fecha — a real é 35,0%; SEO está em `main`, não só em branches; auth tem infra e zero páginas; 0 de 9 fatias do produto entregues; 3 das 7 branches propostas conflitam com decisão do dono; páginas legais é a única lacuna real, por LGPD), `workflow/STATE.md` | concluído |

### Evidência da linha 01

Verificado nesta máquina, com o código no estado atual:

| Comando                     | Resultado                                      |
| --------------------------- | ---------------------------------------------- |
| `pnpm check:all`            | passa (typecheck, lint, prettier, 18 testes)   |
| `pnpm build:next`           | passa; Next 16 reconhece `proxy.ts` como Proxy |
| `pnpm test:e2e`             | 5/5 no Chromium                                |
| `pnpm build`                | passa; `.open-next/worker.js` gerado           |
| `wrangler deploy --dry-run` | worker válido, 20 assets, 2 bindings           |

Cinco defeitos foram encontrados e corrigidos durante o bootstrap; estão
registrados em `AGENTS.md`, em "Onde as coisas quebram com mais frequência".
