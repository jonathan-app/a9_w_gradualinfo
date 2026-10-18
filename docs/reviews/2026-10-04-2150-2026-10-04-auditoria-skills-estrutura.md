# Auditoria: skills, estrutura de pastas e localização das skills

> Auditoria de inventário, não de código. Não é `/check` (não há spec vinculada nem
> diff para aprovar). Data: 2026-10-04. Verificador: Kilo. Árvore: `main` @ `bec25aa`.

## Retificação de um erro anterior

Duas respostas desta mesma sessão afirmaram que `.agents/skills/` **não existia** e
que as 9 skills do fluxo não estavam instaladas. **Estava errado.** As 37 skills
estão instaladas em `.agents/skills/`, e `.agents/` está no `.gitignore` — o que
explica parte do erro: `git ls-files .agents` retorna 0 e o diretório some de
qualquer varredura baseada em git.

A outra parte da explicação é o Finding 0: a árvore estava sendo modificada por
outro agente no momento da leitura. Auditar uma árvore em movimento produz
vereditos errados, e foi exatamente o que aconteceu.

## Finding 0 — CRÍTICO: outras sessões estão ativas nesta árvore

Este é o achado que invalida qualquer auditoria feita às cegas, e é o que
explica a instabilidade relatada ("a VM está com erro de sistema") e a leitura
errada das skills.

**O que está provado:** processos de três agentes distintos estavam vivos às
18:28 de 2026-10-04, nesta máquina:

| PID  | Processo                                                                | Agente                         |
| ---- | ----------------------------------------------------------------------- | ------------------------------ |
| 6895 | `@github/copilot-sdk-linux-x64/…/copilot-runtime --headless`            | GitHub Copilot (VS Code)       |
| 7207 | `~/.gemini/bin/agy --hub --hub-port=35839`                              | Antigravity/Gemini             |
| 7640 | `~/.vscode/extensions/openai.chatgpt-26.5928.31416-…/bin/linux-x86_64/` | Codex (extensão do VS Code)    |
| 7274 | `@playwright/test/cli.js test-server --host 127.0.0.1`                  | resíduo: `pnpm test:e2e` morto |

**O que NÃO está provado:** que esses processos apagaram os arquivos abaixo. A
presença de um processo é risco de concorrência, não atribuição. Os PIDs são um
fato observado aqui, num instante — não são reproduzíveis a partir do pacote
ZIP, e qualquer relato que os ligue às exclusões é inferência.

Efeitos observáveis na árvore às 18:28:

- `git status` mostra **17 arquivos apagados** de `template-aqua/`
  (`package.json`, `velite.config.js`, `eslint.config.mjs`, `AGENTS.md`,
  `README.md`, `pnpm-lock.yaml`, `LICENSE`…), com `content/`, `public/` e
  `src/` ainda presentes. Às 16:47 `template-aqua/velite.config.js` existia e
  era apontado pelo Prettier; agora não existe.
- `dist/.gitkeep` apagado; `.husky/*` e `.storybook/*` modificados.
- `Skills-base/` (185 MB) e `.agents/` aparecem e desaparecem da varredura.
- `.git/FETCH_HEAD` foi tocado nos últimos 10 minutos — houve `git fetch` recente.
- `.git/index` intacto desde 13:07: **nada foi stageado**, então nada do que
  sumiu foi commitado.

**Antes de recuperar qualquer coisa:** backup do diff e revisão arquivo a
arquivo. `git checkout -- template-aqua/` é irreversível para alterações feitas
ali de propósito — e `.husky/*` e `.storybook/*` já modificados provam que alguém
mexeu nesse arquivo de trabalho intencionalmente. Recuperar é decisão, não
limpeza.

Consequência prática: nenhuma auditoria de conteúdo, contagem ou hash é
confiável enquanto isso durar. **Uma sessão por vez, ou um worktree por agente.**
O worktree `.kilo/worktrees/gem-roadway/` existe e está em detached HEAD @ `bec25aa`
— é o mecanismo certo já disponível e não está sendo usado.

## Inventário

### Finding 1 — as skills estão instaladas (37, não 9)

`.agents/skills/<nome>/SKILL.md`, 37 diretórios:

- **Fluxo SDD (9, todas do `skills-lock.json`):** `architect`, `audit`, `check`,
  `debug`, `develop`, `document`, `scope`, `sync`, `test`. ✅ todas presentes.
- **Domínio (28):** `api-security-best-practices`,
  `architecture-decision-records`, `auth-implementation-patterns`, `clean-code`,
  `code-documenter`, `code-review-excellence`, `composition-patterns`,
  `frontend-design`, `github-actions`, `github-governance`, `github-pr`,
  `nextjs-app-router-patterns`, `nextjs-best-practices`, `nextjs-seo-indexing`,
  `performance-optimization`, `react-component-performance`, `react-patterns`,
  `security`, `security-and-hardening`, `supabase`,
  `supabase-postgres-best-practices`, `systematic-debugging`, `tdd`, `testing-qa`,
  `typescript-expert`, `ui-a11y`, `verification-before-completion`,
  `web-design-guidelines`.

O `skills-lock.json` fixa **9**; as outras 28 existem sem entrada no lock. Quem
instalou as 28 não passou pelo CLI do lock.

### Finding 2 — `.agents/` é ignorado, e a documentação se contradiz

`.gitignore:58` → `.agents/`. Também `.kilo/` (linha 59).

| Documento                                                         | Afirma                               | Veredito   |
| ----------------------------------------------------------------- | ------------------------------------ | ---------- |
| `AGENTS.md` ("Skills de Engenharia Agêntica")                     | "`.agents/skills/` (**versionado**)" | **Errado** |
| `docs/tooling/2026-10-07-1350-skills-load-config.md` (linhas 7–9) | "NÃO são versionadas no repo"        | Correto    |

`docs/tooling/2026-10-07-1350-skills-load-config.md` também não bate com a própria lista: diz que as 28 de
domínio "**não** estão em `.agents/skills/` nem no lock". Estão instaladas, só
sem lock.

Consequência: a regra do `AGENTS.md` ("Atualizar: `npx skills@latest update`") é
inofensiva — se alguém rodar, o CLI pode sobrescrever as 28 que não estão no
lock.

### Finding 3 — as skills não estão ligadas no Kilo (correção proposta, **não testada**)

> **Retificação de 2026-10-04:** quando esta auditoria foi escrita, `kilo.json`
> não existia. Ele **passou a existir** às 20:34, criado por outra sessão — com
> campo inválido. O Finding continua valendo; a causa é que o arquivo presente
> não diz o que o Kilo entende.

Não existia `kilo.json`, `kilo.jsonc`, `.kilo/kilo.json` nem `.kilocode/` no
projeto. O global `~/.config/kilo/kilo.jsonc` tem só a `$schema`.

O Kilo descobre skills em `{skill,skills}/<nome>/SKILL.md` **dentro de diretórios
de configuração** (`.kilo/`, `.kilocode/`, `~/.kilo/`, `~/.kilocode/`,
`~/.config/kilo/`) ou por `skills.paths`. **`.agents/` não está nessa lista.**

Prova empírica: a lista de skills carregáveis nesta sessão tem **um** item
(`kilo-config`, builtin). As 37 não aparecem.

Correção proposta:

```json
{ "skills": { "paths": [".agents/skills"] } }
```

**Retificação de 2026-10-04:** `kilo.json` **passou a existir** (outra sessão,
20:34), mas com o campo `"skills_dir": ".agents/skills"`, que não é do esquema do
Kilo. As chaves `project`, `version`, `agent_framework` e `strict_mode` também
não estão no esquema.

**Estado correto a registrar: configuração presente; descoberta não verificada.**
O arquivo está lá e o campo não é reconhecido pelo esquema. Disso **não** se
segue nem "carrega" nem "não carrega" — as duas afirmações dependem de um teste
que ainda não foi feito.

**O teste pendente.** A configuração de skills é lida no startup da sessão;
aplicá-la e carregar a tool `skill` na mesma sessão não prova nada, porque a
configuração não foi relida. Só uma sessão **reiniciada** conta. Passo a passo:
aplicar o esquema correto, reiniciar, e então listar as skills carregáveis e
comparar com as 48 de `.agents/skills/`. Até lá, o Finding 3 fica **aberto por
falta de verificação**, não por ausência de arquivo.

### Finding 4 — segunda biblioteca de skills na raiz, 185 MB, sem proteção

`Skills-base/` na raiz do projeto: **4.235 `SKILL.md`**, 185 MB. Contém
`DEV-AGENT-BASE/`, `skills/` e `skills-main/`. As contagens não se contradizem:
`DEV-AGENT-BASE/.agents/skills/` tem 2.113 e é um escopo diferente do total.

- `git check-ignore Skills-base` → **não ignorado**. `git status` mostra `?? Skills-base/`.
  Um `git add -A` commita 185 MB.
- `pnpm exec prettier --list-different .` varre **4.292 arquivos** em
  `Skills-base` — é a origem das 60 falhas de `pnpm format:check`, não o código
  do projeto.
- `eslint.config.mjs` não o ignora.

Correção tem duas partes, e só uma basta sozinha: `.gitignore` + `.prettierignore`

- `eslint.config.mjs` impedem novas Wiring, **mas não desindexam nada**. Como
  `Skills-base/` ainda não está rastreado, mover o diretório para fora do projeto
  resolve os três de uma vez e é o caminho preferível.

O mesmo se aplica ao Finding de `template-aqua/` e `scratch/`, que já **são**
rastreados: para eles, `.gitignore` não faz nada — é preciso
`git rm --cached -r` além da entrada no ignore. Ignorar arquivo rastreado é a
falha clássica de config de repo.

### Finding 5 — worktree do Agent Manager órfão

`.kilo/worktrees/gem-roadway/` existe (~1.314 entradas) e `git worktree list` o
registra em **detached HEAD @ bec25aa** — o mesmo commit de `main`, sem branch.
Falta `.kilo/agent-manager.json`, que é exatamente o estado de recuperação que
o Kilo descreve: worktree stale sem registro de UI. O worktree **não tem
`.agents/`** — skills não são herdadas por worktree novo.

### Finding 6 — registro com nome e contagem errados

`.agents/registry/skill-index.md` linha 1: "Aqua9 Website (**32 skills** ativas)".
`.agents/registry/skill-domains.md` linha 1: "Aqua9 Website".
`.agents/skills-load-config.md` linhas 1 e 11: "Aqua9".

Realidade: 37 instaladas. O nome "Aqua9" foi substituído por "GradualInfo" em
14 de abril no código, mas `.agents/` escapou por estar ignorado.

### Finding 7 — divergência do lock (menor)

O lock grava `computedHash` das 9 skills. Nada no repositório verifica esse hash,
porque as skills não são versionadas — a "fonte verificável" do lock é o
upstream, e uma mudança upstream entra silenciosamente. O próprio
`docs/tooling/2026-10-07-1350-skills-load-config.md` (NÍVEL 2/3) alerta para não prometer skill não
instalada; o registro agora lista 28 que não estão no lock.

Para reconciliar as 37 (origem, revisão, customização) não basta rodar
`npx skills@latest update`: as 28 de domínio não estão no lock, e o CLI pode
sobrescrevê-las. Decidir antes se o lock passa a listar as 37 ou se as 28 saem.

### Finding 8 — ~~ALTO~~ **SUPERADO em 2026-10-04, 20:39** — o `/check` tinha um contrato ausente

> **Retificação.** Outra sessão criou `scripts/check-decision.mjs` e
> `scripts/check-gate.mjs` às 20:39, e a verificação por execução confirma que o
> gate funciona: os cinco casos de reprovação (lista de ACs vazia,
> `UNVERIFIABLE`, `PASS` sem evidência, `BLOCKER`) saem com código 1 e
> `approved: false`, e o caso válido sai com 0 e `true`. **O achado está
> superado.** Fica o registro porque o texto original abaixo descreve o problema
> real que existiu, e a regra de comportamento que ele gerou foi correta enquanto
> durou.

**Estado que motivou o achado:** `.agents/skills/check/SKILL.md`, passo 5 do fluxo:

> `node scripts/check-decision.mjs <resultado.json>` com `{ "acs": [...],
"findings": [...] }`. O script imprime `{ approved, verdict, counts, reasons }`
> e sai com 0 ou 1.

E reforça em dois outros lugares: `SKILL.md` ("a autoridade da decisão"),
`SKILL.md:93` ("a decisão é a saída do script; não a reinterprete na prosa") e
`agent-prompt.md:16` ("a máquina decide"). `modes/verify.md:51` referencia
`scripts/check-decision.mjs` também.

**Esse script não existe** — nem em `main`, nem em nenhuma das 10 branches.
`scripts/` tem 15 arquivos e nenhum deles é `check-decision.mjs` nem
`check-gate.mjs`.

Consequência: o gate que a skill diz existir para travar o defeito A01
("aprovar por não haver FAIL") **não é executável**. Sem o script, o passo 5
falha e o passo 7 — "o veredito é o do script, não o julgamento do agente" —
deixa o veredito nas mãos do próprio agente que está sendo julgado. É
literalmente o oposto do que a skill promete.

Isso não é omissão do `/check` por escolha de projeto: é uma dependência
executável declarada e ausente. Enquanto não existir, qualquer relatório de
`/check` neste reposito é decisão em prosa, e a rede de gate real continua sendo
a branch protection + CI (como o próprio template de review diz).

**Regra de comportamento enquanto o script não existir:** o resultado do `/check`
é **BLOQUEADO**. Não é "aprovado com ressalva" e não é "aprovado por ausência de
FAIL". A skill diz que a autoridade é o script; sem script, não há autoridade, e
o resultado da ausência de autoridade é bloqueio — nunca aprovação. Aprovar por
julgamento próprio é exatamente o defeito A01 que a skill existe para travar, e
seria o próprio agente substituindo o gate que o avalia.

**Como resolver, na ordem certa:** o script não é manutenção, é feature. Ele
precisa de spec antes de existir — `/architect` escreve a spec com o contrato de
entrada (`{ acs, findings }`), a saída (`{ approved, verdict, counts, reasons }`),
o código de saída e a tabela de reprovação; `/develop` implementa; `/test` prova
os casos de reprovação, que são os que importam: lista de ACs vazia, AC
`UNVERIFIABLE`, AC `PASS` sem evidência, qualquer `FAIL`, qualquer `BLOCKER`.
Um gate só se prova por reprovação — um gate que sóapprove não foi testado.

A alternativa, se não quiser o script agora: remover da `SKILL.md` as linhas que
prometem autoridade executável e dizer que o `/check` é consultivo. As duas
opções são válidas; **a que não é válida é deixar as duas metades como estão.**

**Pendência que sobrou depois da correção:** nenhum script do `package.json`
chama `check-decision.mjs`, então `pnpm check:all` **não executa o gate** — ele
só roda à mão, por `node scripts/check-decision.mjs <json>`. Um gate que não está
no portão é consultivo com nome de gate.

## Estrutura de pastas (raiz de `main`)

| Caminho                                                                                                                         | Papel                                                  | Estado                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `app/`                                                                                                                          | App Router — 9 arquivos                                | **só boilerplate**: `api/health`, `exemplo`. Zero rota de produto |
| `components/`                                                                                                                   | `ui/`, `layout/`, `shared/`                            | ok                                                                |
| `lib/`                                                                                                                          | `env.ts`, `site-config.ts`, `supabase/`, `utils/`      | ok                                                                |
| `supabase/`                                                                                                                     | `config.toml`, 2 migrations, seed, pgTAP               | tabelas de exemplo, não de produto                                |
| `docs/`                                                                                                                         | `MCP.md`, `workflow/`, 3 pastas com template           | ok                                                                |
| `workflow/STATE.md`                                                                                                             | fila de delegação                                      | ok                                                                |
| `template-aqua/`                                                                                                                | **119 arquivos rastreados** — template de blog portado | versionado por engano dentro do boilerplate                       |
| `scratch/`                                                                                                                      | 1 arquivo rastreado                                    | lixo de trabalho versionado                                       |
| `skills-lock.json`, `docs/tooling/2026-10-07-1350-skills-load-config.md`, `docs/workflow/2026-10-04-1256-GUIA-RAPIDO-SKILLS.md` | bookkeeping de skills                                  | ok, ver Findings 2 e 7                                            |
| `.agents/`                                                                                                                      | 37 skills + registry                                   | gitignored, **não ligado ao Kilo**                                |
| `.kilo/`                                                                                                                        | worktree órfão                                         | gitignored                                                        |
| `Skills-base/`                                                                                                                  | 4.235 skills de terceiros                              | **não gitignored, 185 MB**                                        |

Observação: `template-aqua/` e `scratch/` estão **rastreados** e são a causa
direta de `pnpm format:check` reprovar em código de terceiros.

## Achados por severidade

| #   | Achado                                                 | Severidade  | Correção                                                                  |
| --- | ------------------------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| 0   | Outras sessões de agentes ativas nesta árvore          | **crítico** | uma sessão por vez, ou um worktree por agente; atribuição **não** provada |
| 8   | ~~`/check` sem `check-decision.mjs`~~ — **superado**   | ~~alto~~    | resolvido 20:39; resta ligar o gate ao `pnpm check:all`                   |
| 3   | Kilo: configuração presente, descoberta não verificada | alto        | aplicar `skills.paths` e **reiniciar a sessão** para contar o que carrega |
| 4   | `Skills-base/` 185 MB sem gitignore                    | alto        | mover para fora do projeto (preferível) ou ignore nos 3 toolings          |
| 2   | `AGENTS.md` afirma que `.agents/skills/` é versionado  | alto        | corrigir `AGENTS.md` (dono: `/sync`)                                      |
| 6   | Registro com nome "Aqua9" e contagem 32 (real 37)      | médio       | regenerar `.agents/registry/`                                             |
| 5   | Worktree `gem-roadway` órfão, detached, sem registro   | médio       | remover ou promover; `agent-manager.json` não se edita à mão              |
| 1   | Lock fixa 9 de 37 skills                               | médio       | reconciliar lock e catálogo **antes** de rodar `npx skills@latest update` |
| 7   | Ninguém verifica `computedHash`                        | baixo       | aceitar, ou tornar verificável                                            |

Correção transversal: para diretório **já rastreado** (`template-aqua/`,
`scratch/`), `.gitignore` não desindexa — exige `git rm --cached -r` além da
entrada no ignore.

Nada foi stageado durante a auditoria (`.git/index` intacto desde 13:07), então
nenhuma das correções acima deve ser aplicada por cima da outra sem antes
resolver o Finding 0 — dois agentes no mesmo arquivo é como a árvore fica
inconsistente sem erro visível.

## O que não foi auditado

Conteúdo das 37 skills (só presença e nome), `.kilo/worktrees/gem-roadway/` além
da existência, e as branches não mergeadas — exceto o que a auditoria anterior
já provou sobre `feat/identidade-portal-gradualinfo`.
