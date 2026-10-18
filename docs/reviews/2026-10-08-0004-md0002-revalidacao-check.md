# Check: md-0002-casca-editorial-home — relatório de /check (2ª execução)

> Saída da skill `/check` (modo verify + modo review), reexecutada em 2026-10-08
> ~12:55 sobre o mesmo SHA. É o relatório canônico para este commit; a primeira
> execução do mesmo dia está em `2026-10-08-md0002-revalidacao-check.md`.
> O veredito abaixo é transcrição literal da saída de `scripts/check-decision.mjs`.

## Identidade

- Spec: `docs/specs/2026-10-07-1350-md-0002-casca-editorial-home.md` (status **Accepted**, revisão 2; sha256 `266d40cb169edc222c2ba6ae95d7587724d146646fc5b0ed815b386b9c5c8564`)
- Branch/PR: `feat/md-0002-casca-editorial-home` → PRs #22 e #23 (mergeados em `origin/main`, cabeça `f888d05`)
- SHA verificado: `2bcea1ddb429c1988b211923a17eb25df9dbaa48` (árvore `2ac9eb05cda26c90dd25f7925799a1c175bb9bff`; o relatório só vale para ESTE hash)
- Data: 2026-10-08; Verificador: agente `/check` (opencode, big-pickle)
- Árvore no momento do artefato: **suja** (13 modificados + 11 untracked — bump de dependências e correções de outra sessão, correções P0 de segredos desta sessão e os artefatos do próprio check). Manifesto: `docs/reviews/evidence/2026-10-08-md0002-revalidacao/2026-10-08-2228-manifesto-trabalho.json`.

## Modo VERIFY — cada AC, provado

**Proveniência da evidência de runtime (reuso justificado):** nenhum arquivo de `app/ lib/ components/ hooks/ e2e/ supabase/ scripts/ __tests__` tem mtime posterior ao `e2e.log` do run 34/34 — o código exercitado é byte a byte o código atual. As mudanças novas desde o run são apenas documentais (`AGENTS.md`, `docs/scope/0001`, `docs/specs/2026-10-08-2228-INDICE.md`, `workflow/STATE.md`), sem impacto nos ACs. Gates de estática/build foram **reexecutados agora** (seção Regressão).

| AC    | Prova (comando/saída/evidência)                                                                                                                                                                            | Resultado esperado                             | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| AC-01 | `pnpm test:e2e` → teste da tarefa 4: grade ≤10, ordenada, sem rascunho nem data futura — PASS (`ac-01.json`, `e2e.log`, run 34/34)                                                                         | Grade ≤10, ordenada, só publicados             | ✅     |
| AC-02 | Mesmo teste: capa, editoria, título, resumo e data em todo card — PASS (`ac-02.json`)                                                                                                                      | Card completo com os 5 campos                  | ✅     |
| AC-03 | "Estado vazio" + "falha de transporte", mensagens distintas — 2/2 PASS (`ac-03.json`)                                                                                                                      | Estados vazio e de erro distintos              | ✅     |
| AC-04 | Destaque do mais recente no topo, limite só na grade — PASS (`ac-04.json`)                                                                                                                                 | Destaque no topo; limite só na grade           | ✅     |
| AC-05 | Tarefa 5: `<h1>` único e Markdown convertido sem sintaxe crua — PASS (`ac-05.json`)                                                                                                                        | h1 único; HTML limpo                           | ✅     |
| AC-06 | Conteúdo hostil permanece dado (PASS) + inspeção: única ocorrência de `dangerouslySetInnerHTML` é `app/artigos/[slug]/page.tsx:145` (JSON-LD) (`ac-06.json`)                                               | Renderização inofensiva; exceção só JSON-LD    | ✅     |
| AC-07 | `toBe(404)` estrito para inexistente, rascunho sem sessão e agendado — PASS (`ac-07.json`)                                                                                                                 | 404 sem vazamento nos três casos               | ✅     |
| AC-08 | Tarefa 8: 11/11 PASS (anon 404 / sessão 200 / claims / expiração real sob JWT 60s / logout 503 / cookies HTTPS) (`ac-08.json`)                                                                             | Portão correto nos dois lados + expiração real | ✅     |
| AC-09 | JSON-LD `Article` parseável sob fechamento de tag — PASS (`ac-09.json`)                                                                                                                                    | JSON-LD íntegro sob conteúdo hostil            | ✅     |
| AC-10 | Canonical absoluto de `SITE_ORIGIN` + só públicos no sitemap (`lastModified = published_at`) — PASS (`ac-10.json`)                                                                                         | SEO canônico e sitemap público                 | ✅     |
| AC-11 | `pnpm supabase:test` pgTAP **63/63 PASS**; `pnpm security:sast` **0 findings** (reexecutado agora); grep: 0 `service_role` em `app/ lib/ components/ hooks/` (`ac-11.json`, `pgtap.log`, `sast-rerun.log`) | RLS provada; service_role fora do leitor       | ✅     |
| AC-12 | axe 0 violações (home, artigo publicado, rascunho com sessão) + teclado com foco visível — 6/6 PASS (`ac-12.json`)                                                                                         | Acessibilidade e teclado                       | ✅     |
| AC-13 | Fontes ao final com links absolutos; lista vazia sem seção/erro — PASS (`ac-13.json`)                                                                                                                      | Fontes absolutas; vazio tratado                | ✅     |

Cobertura de AC: **13/13**. Reprovações: **nenhuma** (0 FAIL, 0 UNVERIFIABLE, 0 sem evidência).

Corridas de apoio: E2E produção local run 2 = **34/34 PASS** (`e2e.log`, `e2e-results.json`); pgTAP 63/63. Run 1 (12 failed/10 skipped) **invalidada** por parada da stack em colisão com sessão paralela — preservada como `e2e-run1-parada-de-stack.log`, não conta como prova.

## Modo REVIEW — auditoria do diff

Contexto: `origin/main...HEAD` contém apenas `docs.zip` (feature já em `main` via PRs #22/#23); auditoria sobre a árvore de `2bcea1d`. Bateria reexecutada agora sobre o diff real:

- [x] TypeScript estrito, sem `any` implícito. (`tsc --noEmit` ✓ no `check-all-rerun.log`; `rg ': any|as any'` → 0)
- [x] Server Component por padrão; `'use client'` só em folha interativa. (só `theme-toggle`, `theme-provider`, `app/error.tsx`)
- [x] `auth.getUser()` para autorização; `getSession()` só para exibir. (ocorrências de `getSession(` são comentário/explicação)
- [x] Toda `className` condicional passa por `cn()`. (nenhum template literal condicional cru)
- [x] Nenhum `process.env` espalhado — tudo por `lib/env.ts`.
- [x] Tabela nova tem RLS + policy por operação. (md-0002 não cria tabela; pgTAP 63/63)
- [x] Função SECURITY DEFINER tem `SET search_path = ''` + grant explícito. (`supabase/migrations/*.sql`, 4 funções)
- [ ] **Nenhum segredo commitado** — sast ✓ (0 findings, reexecutado), secrets ✗ (exit 1, 11 findings) → BLOCKER #2.
- [x] Comentários explicam o porquê, atualizados.
- [x] Sem código morto / debug. (`console.info` em `lib/audit.ts` é saída de auditoria documentada)

Observações de review (WARNINGs/INFOs do artefato):

1. `docs/specs/2026-10-08-2228-INDICE.md` (linha 25, ainda editada hoje às 12:40) lista `md-0002` como `Proposed` × spec `Accepted` (linha 4) — índice desatualizado.
2. Árvore suja: 13 modificados + 11 untracked (manifesto com hashes); evidências de runtime vêm do run anterior porque o código não mudou (proveniência acima).
3. Artefato anterior `2026-10-07-check-producao-local-axe-decisao.json` aponta caminhos externos (`/home/jonathan/.gemini/...`) — não serve como prova; substituído por esta execução.
4. `docs.zip` duplica 63 arquivos de `docs/` em binário (decisão do dono: manter); ZIP extraído: 0 segredos.
5. `scripts/run-gitleaks.mjs` corrigido nesta sessão (`git ls-files -z`); escopo git com 0 caminhos não-ASCII, sem delta de findings.

## Regressão (reexecutada agora)

- `pnpm check:all`: **falhou** — typecheck ✓, lint ✗ exit 2 (eslint 10.12.0 × eslint-plugin-react 7.37.5), formatação ✓ (execução isolada), testes **104/104** ✓ (execução isolada). Log: `check-all-rerun.log`, `format-and-tests-rerun.log`.
- `pnpm build:next`: passou (exit 0). `pnpm build` (OpenNext): passou (exit 0). `wrangler deploy --dry-run`: passou (exit 0).
- `pnpm audit --audit-level=high`: 0 vulnerabilidades (exit 0).
- `pnpm test:e2e`: passou (34/34, run 2; proveniência acima). `pnpm supabase:test` (pgTAP): passou (63/63).
- `pnpm security:sast`: passou (0 findings, reexecutado). `pnpm security:secrets`: **falhou** (exit 1, 11 findings).

## Veredito

- [ ] **Aprovado** — ACs cobertos, review limpo, regressão verde. Merge liberado.
- [x] **Reprovado** — motivo: saída literal de `scripts/check-decision.mjs` (reexecutado agora):

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 13,
    "PASS": 13,
    "FAIL": 0,
    "UNVERIFIABLE": 0,
    "missingEvidence": 0,
    "BLOCKER": 2,
    "WARNING": 3
  },
  "reasons": [
    "BLOCKER: pnpm check:all falha (exit 2): eslint 10.12.0 quebra com eslint-plugin-react 7.37.5 (resolveBasedir/detectReactVersion) — bump unstaged de package.json de 2026-10-08 09:58. typecheck, format:check e testes (104/104) passam isoladamente; build e wrangler dry-run passam. Corrigir a compatibilidade (reverter eslint a 9.x ou atualizar o plugin) e repetir o gate completo.",
    "BLOCKER: pnpm security:secrets termina exit 1 com 11 findings, todos do commit 10eecbc alcançável apenas via refs/remotes/origin/feat/md-0002-casca-editorial-home (não ancestral de HEAD 2bcea1d nem de origin/main); o commit em si está limpo, mas as chaves SUPABASE_SERVICE_ROLE_KEY e SUPABASE_PREVIEW_* seguem vivas. Forço do branch e rotação das chaves são decisão do usuário."
  ]
}
```

Itens a corrigir antes de novo `/check`:

1. **P0 — /develop:** compatibilidade do eslint (reverter a 9.x ou atualizar `eslint-plugin-react`); repetir `pnpm check:all` até exit 0.
2. **P0 — decisão do usuário:** forço de `origin/feat/md-0002-casca-editorial-home` + rotação de `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_PREVIEW_*`; repetir `pnpm security:secrets` até exit 0.
3. **P1:** `docs/specs/2026-10-08-2228-INDICE.md` (`md-0002` → `Accepted`).

## Artefato do gate

- `node scripts/check-decision.mjs docs/reviews/2026-10-08-2228-2026-10-08-md0002-revalidacao-resultado.json` → exit 1, saída transcrita acima (13 ACs com evidência + hash conferidos, contrato `schemaVersion: 1`).
- `node scripts/check-gate.mjs … --commit 2bcea1d…` → **Bloqueado: Árvore suja** (exit 1); mesmo com árvore limpa recusaria por `Decisão … REPROVADA`.
- Evidências: `docs/reviews/evidence/2026-10-08-md0002-revalidacao/` (13 `ac-NN.json`, manifesto, logs `*-rerun.log` e corridas de apoio).

## Hash binding

Este relatório vale apenas para `2bcea1ddb429c1988b211923a17eb25df9dbaa48`. Não há aprovação a invalidar: o veredito é REPROVADO.
