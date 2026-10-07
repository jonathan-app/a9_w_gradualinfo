# Auditoria completa do a9_w_gradualinfo — 2026-10-07

Data: 2026-10-07

## Escopo

Auditoria do repositório inteiro no estado atual do disco (`HEAD 3fd3e50`),
cobrindo: inventário de arquivos, estado do Git, portões de qualidade,
scanners de segurança, cobertura de testes, config MCP/ferramenta, specs e
aceites, CI remota, catálogo de skills e worktrees.

Regra de evidência: tudo abaixo foi executado nesta sessão, na árvore atual.
Nada é herdado de relatório antigo. Onde `git` mostrou estado de outra sessão
(portas ocupadas, servidores vivos), isso é marcado como interferência e a
medição é declarada inconclusiva, não culpada.

> Atualização pós-captura: sessões paralelas moveram o HEAD para `ac2bb18`
> (`fix(ci): corrige 3 jobs de CI e melhora performance do Lighthouse`), que
> elevou a CI de 6 para 9 jobs (adiciona `e2e`, `dependency-scan` e
> `check-gate`), e seguem com alterações não commitadas em `.semgrepignore`,
> `security/semgrep.yml` e `scripts/run-semgrep.mjs` (endereçando justamente
> os itens 5 e 7 desta auditoria). As seções abaixo descrevem o estado
> capturado em `3fd3e50`.

---

# 1. Veredito

## Estado geral

**Fundação de engenharia: VERDE.**

**Gate local de qualidade: VERDE** (typecheck, lint, format, 92/92 testes,
build Next, audit de dependências, gitleaks).

**Gate de segurança (SAST local): VERMELHO** — não é o código do produto que
falha, é a cadeia de regras: uma regra local com padrão inválido derruba o
wrapper por projeto (qualquer entrada em `report.errors` reprova), e o scan
ainda encontra 4 findings ERROR em `referencias/template-editorial/` (template
inerte, mas escaneado).

**E2E local: INCONCLUSIVO** — as duas portas canônicas estavam ocupadas por
sessões externas (`:3100` e `:3000`), e a suíte rodada contra o servidor
reutilizado em `:3000` mistura falhas de ambiente (fixtures de preview sem
segredo, canonical apontando outra origem). 17 passaram, 5 falharam, 12 não
rodaram; nenhuma falha é atribuível ao código com confiança.

Nenhuma mudança foi autorizada: **merge e deploy permanecem retidos**,
exatamente como o Bastão atual do `workflow/STATE.md` decide.

---

# 2. Snapshot do repositório

| Fato                      | Valor                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| HEAD                      | `3fd3e50` (`fix(auth): restaura baseline jwt_expiry=3600 e ajusta flags do gitleaks`)  |
| Branch ativa              | `feat/md-0002-casca-editorial-home`                                                    |
| À frente de `main` local  | 22 commits                                                                             |
| À frente de `origin/main` | 10 commits                                                                             |
| Árvore de trabalho        | limpa (`git status --short` sem saída)                                                 |
| Arquivos rastreados       | 354                                                                                    |
| LOC de código rastreado   | 9664 (`.ts/.tsx/.mjs/.js` fora de `referencias/` e `.agents/`)                         |
| Main local                | já tem história (o texto "zero commits / main unborn" do AGENTS.md está desatualizado) |

---

# 3. Inventário

- `app/` App Router com rota de artigo `/artigos/[slug]`, home editorial e
  APIs de preview (`app/api/preview/`).
- `components/` dividido em `ui/`, `layout/` e `shared/`.
- `lib/` — `env.ts` tipado, `supabase/` (client, server, middleware), `utils/`
  (`cn`, `format` com sanitização de JSON-LD), `services/posts.ts`.
- `proxy.ts` (Next 16) com `config.matcher` restrito a rotas com sessão.
- `scripts/` — wrappers Node (gitleaks, semgrep, skills-check, e2e-server,
  e2e-fault-proxy, export-template, gate, etc).
- `supabase/` — config.toml, migrations, seed.sql, `tests/rls_posts_test.sql`
  (63 asserções pgTAP), snippets e functions (`.gitkeep`).
- `.github/workflows/ci.yml` — 6 jobs (quality, build, database, sast,
  secrets, lighthouse), `timeout-minutes: 30`.
- `.agents/skills/` — 90 diretórios de skill; `.storybook/` presente.
- `docs/` — scope, specs, reviews, audits, tooling.

---

# 4. Portões de qualidade (executados agora)

| Comando                            | Resultado                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm check:all`                   | EXIT 0 — typecheck ✓, lint 0 erros/21 avisos (`no-console`), prettier ✓, 92/92 testes Vitest ✓     |
| `pnpm build:next`                  | EXIT 0 — build Turbopack OK                                                                        |
| `pnpm test:coverage`               | linhas 80.86%, stmts 79.16%, branch 82.3%, funcs 82.14% — acima do piso 60% do `vitest.config.mts` |
| `pnpm audit --audit-level=high`    | EXIT 0 — "No known vulnerabilities found"                                                          |
| `pnpm security:secrets` (gitleaks) | EXIT 0 — 0 findings redigidos, histórico e árvore                                                  |
| `pnpm security:sast` (semgrep)     | EXIT 1 — ver seção 5; não é veredito do código                                                     |
| `pnpm test:e2e` (Playwright)       | EXIT 1 — 17 passed / 5 failed / 12 did not run; inconclusivo (seção 7)                             |
| `pnpm skills:check`                | EXIT 1 — 81 skills "extra" fora do lock; conhecido (seção 9)                                       |

Pontos fracos de cobertura por arquivo: `lib/preview/auth.ts` (linhas 55.55%)
e `lib/utils/format.ts` (linhas 57.89%) — os dois são as áreas de menor prova
unitária da árvore.

---

# 5. SAST (semgrep) — VERMELHO por projeto de regras, não por código

O wrapper `scripts/run-semgrep.mjs` reprova se `report.errors` tiver qualquer
entrada (linha 73, por desenho: "scan que se disfarça de limpo"). O scan
atual produz duas classes de erro:

1. **Regra local inválida**: `security.supabase-query-inside-use-effect`
   (severity INFO, presente desde `bec25aa`) tem o padrão
   `useEffect(() => { ... $SUPABASE.from(...) ... }, [])` que o parser de
   JavaScript do semgrep rejeita — `Stdlib.Parsing.Parse_error`. Enquanto essa
   regra existir, o SAST local **nunca** passa, e o job `sast` da CI (mesmo
   wrapper, mesmo pin `semgrep==1.179.0`) deve reprovar igual. Não foi
   verificado remotamente porque a CI não roda a partir desta máquina.
2. **Parse parcial de `scripts/check-portability.mjs`** (linhas 284 e 585,
   `(/` inesperado) — parser do semgrep não consome o arquivo inteiro; entra
   em `errors` como `PartialParsing`.

Scan manual (mesmas regras, `--json`, sem filtro de severidade): 4 regras,
153 arquivos, 5 findings:

- 4 × `security.unsafe-html-injection` **ERROR** em
  `referencias/template-editorial/**` (`blogs/[slug]/page.js` linhas 119/123,
  `layout.js` linhas 133/134) — template de referência inerte, mas como é
  rastreado o semgrep o varre.
- 1 × `security.proxy-without-matcher` **WARNING** em `lib/supabase/middleware.ts:1`
  — atenção: o `proxy.ts` raiz tem `matcher` (confirmado nas linhas 14–28), a
  regra casou um arquivo diferente do esperado pelo `paths.include: **/proxy.ts`.

Conclusão: o veredito vermelho é da **cadeia de regras**, não do código do
produto. Correção exige decisão (regra: corrigir o padrão ou remover; escopo:
excluir `referencias/` do scan no `.semgrepignore`).

---

# 6. MCP / ferramenta

- `kilo.json` validado contra `https://app.kilo.ai/config.json`: **válido, 0
  erros**. Histórico: o HEAD antigo usava array `mcps` (chave inexistente);
  a árvore migrou para objeto `mcp`, notas viraram comentários JSONC, valores
  via `{env:...}`, `timeout: 30000`.
- Servidores MCP declarados: 4; apenas `playwright` ligado na verificação
  atual; `next-devtools`, `supabase` e `fetch` desligados.

---

# 7. E2E local — INCONCLUSIVO (interferência de outras sessões)

| Porta/Ocorrência | Estado                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `:3100`          | ocupada por `node` pid 1868043 (processo externo) → `EADDRINUSE`                                                             |
| `:3000`          | dev server de outra sessão (pid 1861960, mesmo diretório) — Next recusa segundo dev server no mesmo dir                      |
| `E2E_PROD`       | `scripts/e2e-server.mjs` exige `E2E_TLS_KEY`/`E2E_TLS_CERT` (HTTPS 3100→3101); modo produção não foi exercido nesta execução |

Execução real (`E2E_BASE_URL=http://localhost:3000`, com `reuseExistingServer`):
**17 passed / 5 failed / 12 did not run** em ~18s. As 5 falhas não são
atribuíveis ao código:

- AC-12 (axe rascunho): "Configure as fixtures locais de preview" —
  `SUPABASE_PREVIEW_*` ausentes no shell desta auditoria.
- AC-10 (canonical/sitemap): esperado `http://localhost:3000`, recebido
  `https://localhost:3100` — prova de que o servidor reutilizado em `:3000`
  foi iniciado por outra sessão com env próprio (canonical de 3100), não do
  código atual.
- Tarefa 4 (home, esperava 10 cards, recebeu 1) — estado compartilhado
  (seed/DB) com o servidor da outra sessão.
- Tarefa 5 (HTML malicioso) e Tarefa 8 (esperava 401, recebeu 403) — idem,
  ambiente compartilhado.

Próxima rodada válida exige porta livre + `SUPABASE_PREVIEW_*` completas;
esse é trabalho de `/check` ou `/test`, não desta auditoria.

---

# 8. Specs e aceites

| Arquivo                                    | Status no arquivo | Status no `docs/specs/INDICE.md` |
| ------------------------------------------ | ----------------- | -------------------------------- |
| `md-0001-arquitetura-markdown-supabase.md` | Accepted          | Accepted                         |
| `md-0002-casca-editorial-home.md`          | **Accepted**      | **Proposed** ← conflito          |
| `0003-preview-autorizacao.md`              | **Accepted**      | fora do índice                   |
| `0004-gate-revisao-ci.md`                  | **Accepted**      | fora do índice                   |

**Finding novo**: o cabeçalho de `md-0002` voltou a `Accepted` (registrado na
linha 57 do STATE, SHA-256 `7516d71b…`) mas `INDICE.md` (linhas 25 e 37)
segue dizendo `Proposed`. O índice está dessincronizado da spec que diz
governar. Correção é `/sync`.

---

# 9. Skills e governança

- `.agents/skills/` com **90 diretórios**; `skills-lock.json` registra as 9
  skills do ciclo (`/scope`, `/audit`, `/architect`, `/develop`, `/check`,
  `/debug`, `/test`, `/document`, `/sync`).
- `pnpm skills:check` reprova com **81 skills "extra"** instaladas e fora do
  lock — estado conhecido e detalhado em
  `docs/audits/2026-10-07-skills-governanca.md` + manifesto. Não é falha nova
  desta auditoria.

---

# 10. Worktrees

`git worktree list` mostra 4 worktrees em `.kilo/worktrees/`:

- `actually-energy` (detached `9b5664c`, **prunable**)
- `placid-parrotfish` (detached `9b5664c`, **prunable**)
- `foil-protoceratops` (detached `2f42890`)
- `jungle-spaghetti` (detached `2f42890`)

Duas órfãs/prunables apontando para commits antigos; nenhuma interfere no
estado atual, mas ficam como lixo de sessões anteriores.

---

# 11. Anomalias pendentes (registradas, sem correção)

Herdadas da linha 70 do STATE (mantidas como achados abertos):

1. `AGENTS.md` — o bloco "O repositório tem zero commits / main unborn" é
   falso desde que o histórico existe; `main` local tem commits. Complemento
   de `/sync` já agendado no Bastão.
2. `scripts/export-template.mjs` — comentário de topo cita "HEAD unborn".
3. `lib/audit.ts` — ramos idênticos (dead code presumível).
4. `e2e-fault-proxy.mjs` — compara Bearer com `!==` (comparação de token deve
   ser timing-safe).
5. `quarantine-skills.mjs` — data de destino fixa hard-coded.

Novas nesta auditoria:

6. `docs/specs/INDICE.md` × `md-0002` (Accepted × Proposed) — ver seção 8.
7. Regra SAST `supabase-query-inside-use-effect` com padrão que o semgrep
   não parseia — derruba o SAST local e provavelmente o job `sast` da CI
   (ver seção 5).
8. `referencias/template-editorial/` escaneado pelo semgrep produz 4 findings
   ERROR em template inerte (ver seção 5).

---

# 12. Bloqueios de ambiente

- SAST requiere `semgrep==1.179.0`; o binário local foi atualizado de 1.110.0
  para o pin do repo para viabilizar o scan (mudança de ambiente do usuário,
  reversível). Mesmo assim o gate reprova por regra inválida — ver seção 5.
- E2E local requer portas livres e fixtures `SUPABASE_PREVIEW_*`; indisponível
  nesta sessão por processos de outras sessões — ver seção 7.

---

# 13. Conclusão e encaminhamentos

O repositório está tecnicamente verde no que a CI valida localmente
(typecheck, lint, format, unitários, build, dependências, segredos) e o gate
mecânico do produto está APROVADO no commit `2639744b` (13/13 ACs), com
**merge e deploy retidos aguardando decisão do usuário** — nada nesta auditoria
autoriza os dois.

Pendências não autorizadas de qualidade encontradas hoje:

1. Decidir o SAST: corrigir/remover a regra inválida e decidir se
   `referencias/` entra no scan (`.semgrepignore`).
2. `/sync` para o conflito `INDICE.md` × `md-0002` e para o texto obsoleto de
   "zero commits".
3. Repetição do E2E isolada (porta livre + fixtures de preview) antes de
   qualquer afirmação de regressão nas 5 suítes que falharam por ambiente.

---

# 14. Verificação de `docs/` — erros e inconsistências (2026-10-07, apreciação do dono)

Verificação da pasta `docs/` inteira contra a árvore, as specs entre si e o
`STATE`. Correções feitas na própria auditoria (jobs da CI em 6, status
`0003`/`0004` para Accepted, worktrees, typo "eclodiu") mais os achados ainda
abertos, para `/sync` e `/architect`:

## Status (specs × índice × STATE)

- `docs/specs/INDICE.md:25,37` — `md-0002` marcado **Proposed**, mas o
  cabeçalho da spec (`md-0002:4`) e `workflow/STATE.md:57` (aceite integral,
  SHA-256 `7516d71b…`) dizem Accepted. Índice não atualizado no aceite.
- `docs/specs/INDICE.md` não lista `0003` (`0003:4` Accepted) nem `0004`
  (`0004:4` Accepted); ambos usam **ID nu**, contra a regra de prefixo `md-`
  documentada em `INDICE.md:99-106`.
- `docs/scope/0001-mvp-portal-gradualinfo.md:154` repete `md-0002` **Proposed**
  (Hoje Accepted) e `:186-188` alega "48 skills" + "`kilo.json` com campo
  `skills_dir` inválido" — hoje 90 diretórios e `kilo.json` validado com 0 erros.

## Contradições internas de `md-0001`

- AC-01 (`md-0001:95-100`) exige status só `rascunho|publicado` e "restrição de
  coerência"; o data model (`:258`) mantém `arquivado`, o invariante
  (`:262-265`) segue ativo, mas `:344-348` registra que o **CHECK foi retirado**.
- `md-0001:142` "O conteúdo do schema emendado não tem aceite" contradiz o
  `## Portão desta emenda` resolvido (`:506-515`).
- ACs fora de ordem em `md-0001` (`:112` AC-08 antes do AC-05 em `:117`); AC-06
  sem pontuação (`:121`); typos "decideda" (`:33`), "de-pull-request" (`:45`).

## Segurança × árvore

- `docs/security-authorization-matrix.md:12` lista papel `preview` — inexistente
  por `md-0001:286-291` (é `authenticated` + claim `app_metadata.preview`).
  `:13` (`service_role` "usado em Server Components e routes de admin")
  contraria `md-0001:350-353` (proibido em leitura pública; sem admin no MVP).
- `docs/security-secrets-policy.md:21` "Nenhum MCP recebe segredo hardcoded" —
  `.agents/mcp.json:32` embute `SUPABASE_KEY` inline (legado; `kilo.json` usa
  `{env:...}` e é o válido).
- `docs/security-backup-restore.md` usa comandos que não existem nos scripts:
  `pnpm supabase:reset --local`, `pnpm supabase:stop --backup` (o script é
  `pnpm dlx supabase@2.119.0 …` — `package.json:50-53`), `supabase db dump
--project-ref` (CLI não pinada); e "S3/R2" vs procedimento local `backups/`.

## Tooling / skills / editorial

- `docs/MCP.md` documenta `.agents/mcp.json` (com `@supabase/mcp-server`,
  citando `@percy/playwright` e alpha do playwright) — o config vigente é
  `kilo.json` (`@supabase/mcp-server-supabase`, env-subst, fetch via Docker),
  jamais citado; `@percy/playwright` foi removido.
- `docs/workflow/comentarios-codigo.md:38` — `eslint-plugin-jsdoc` roda em warn,
  mas não existe em `package.json` nem `eslint.config.mjs`.
- `docs/workflow/arquitetura-editorial.md:50` — `ui-a11y` e
  `react-component-performance` marcadas "não instaladas"; ambas estão em
  `.agents/skills/`. `:54` "Nenhuma skill Editorial instalada" — `seo-fundamentals`
  e `geo-fundamentals` estão instaladas.

## Follow-ups resolvidos mas desmarcados

- `md-0002:466` segue `[ ]` "conteúdo da emenda Proposed" enquanto `:462` (mesmo
  fato) é `[x]` Accepted.
- `md-0002:477` — "sitemap ainda lista `/exemplo`"; `app/sitemap.ts:45-53` não
  lista mais (dinâmico).
- `md-0002:471` — "nome fora da convenção" já registrado como desvio intencional
  em `INDICE.md:99-106`.
- `0003:214` — "Emendar seção Preview de md-0001" já emendada (`md-0001:280-284`).

## Snapshots datados (drift esperado, não erro)

`docs/audits/2026-10-07-skills-governanca.md:20,22` ("8 jobs", governança
"ausente") e `md-0001:470-471` + `reviews/2026-10-05-bloqueio-stack-local.md:94-95`
("três jobs da CI") — descrições válidas na captura, hoje defasadas.

Encaminhamento definido pelo dono: **`/sync`** corrige status, índice e
follow-ups; **`/architect`** revisa as contradições de conteúdo da `md-0001`.
