# Check: md-0002-casca-editorial-home — relatório de /check

> Saída da skill `/check` (modo verify + modo review). O veredito abaixo é a
> transcrição literal da saída de `scripts/check-decision.mjs` sobre o artefato
> estruturado; nada aqui foi escrito à mão como decisão.

## Identidade

- Spec: `docs/specs/md-0002-casca-editorial-home.md` (status **Accepted**, revisão 2; sha256 `266d40cb169edc222c2ba6ae95d7587724d146646fc5b0ed815b386b9c5c8564`)
- Branch/PR: `feat/md-0002-casca-editorial-home` → PRs #22 e #23 (já mergeados em `origin/main`, merge de cabeça `f888d05`)
- SHA verificado: `2bcea1ddb429c1988b211923a17eb25df9dbaa48` (árvore `2ac9eb05cda26c90dd25f7925799a1c175bb9bff`; o relatório só vale para ESTE hash)
- Data: 2026-10-08; Verificador: agente `/check` (opencode, big-pickle)
- Árvore no momento do artefato: **suja** (11 modificados + 10 untracked — bump de dependências da sessão paralela, correções P0 de segredos desta sessão e os próprios artefatos do check). Manifesto com hashes: `docs/reviews/evidence/2026-10-08-md0002-revalidacao/manifesto-trabalho.json`.
- Ambiente de prova: stack Supabase descartável com `GOTRUE_JWT_EXP=60` (expiração real de sessão observável), build de produção OpenNext + Worker em portas 3100/3101/3110. Stack encerrada ao final do check; volumes preservados.

## Modo VERIFY — cada AC, provado

| AC    | Prova (comando/saída/evidência)                                                                                                                                                                                                  | Resultado esperado                                        | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| AC-01 | `pnpm test:e2e` → teste da tarefa 4 "cards completos, destaque e limite": grade com no máximo 10 cards, ordenada por data, sem rascunho nem data futura — PASS (`ac-01.json`, `e2e.log`)                                         | Grade ≤10, ordenada, só publicados                        | ✅     |
| AC-02 | Mesmo teste: todo card exibe capa, editoria, título, resumo e data — PASS (`ac-02.json`)                                                                                                                                         | Card completo com os 5 campos                             | ✅     |
| AC-03 | Testes "estado vazio" (0 publicados → mensagem própria, sem seção Fontes) e "falha de transporte" (mensagem distinta) — 2/2 PASS (`ac-03.json`)                                                                                  | Estados vazio e de erro com mensagens distintas           | ✅     |
| AC-04 | Teste do mais recente em destaque (esboço no topo, fora da grade) + limite da grade em 10 — PASS (`ac-04.json`)                                                                                                                  | Destaque no topo; limite só na grade                      | ✅     |
| AC-05 | Teste da tarefa 5 "HTML malicioso": `<h1>` único na página e corpo Markdown convertido sem sintaxe crua — PASS (`ac-05.json`)                                                                                                    | h1 único; Markdown como HTML limpo                        | ✅     |
| AC-06 | Mesmo teste: conteúdo hostil permanece **dado**, não executa (PASS) + inspeção de caminhos: única ocorrência de `dangerouslySetInnerHTML` é `app/artigos/[slug]/page.tsx:145` alimentando o JSON-LD permitido (`ac-06.json`)     | Renderização inofensiva; exceção só JSON-LD               | ✅     |
| AC-07 | Teste "404 estrito": slug inexistente, rascunho sem sessão e artigo agendado devolvem `toBe(404)` — PASS (`ac-07.json`)                                                                                                          | 404 sem vazamento para os três casos                      | ✅     |
| AC-08 | Tarefa 8, 11/11 PASS: anônimo 404 / sessão 200 no rascunho / revogação por claims / expiração **real** sob JWT de 60s (teste de 1,4 min) / logout 503 / cookies HTTPS (`ac-08.json`)                                             | Portão de preview correto nos dois lados + expiração real | ✅     |
| AC-09 | Teste "JSON-LD sob fechamento de tag": JSON-LD `Article` parseável com valores preservados — PASS (`ac-09.json`)                                                                                                                 | JSON-LD íntegro sob conteúdo hostil                       | ✅     |
| AC-10 | Teste "canonical + sitemap": canonical absoluto de `SITE_ORIGIN` e sitemap só com públicos (`lastModified = published_at`) — PASS (`ac-10.json`)                                                                                 | SEO canônico e sitemap público                            | ✅     |
| AC-11 | `pnpm supabase:test` → pgTAP **63/63 PASS** (RLS para anon); `pnpm security:sast` → Semgrep **0 findings**; grep: nenhuma ocorrência de `service_role` em `app/ lib/ components/ hooks/` (`ac-11.json`, `pgtap.log`, `sast.log`) | service_role fora do alcance do leitor; RLS provada       | ✅     |
| AC-12 | `axe` 0 violações nas duas páginas (home e artigo publicado/rascunho com sessão) + navegação por teclado com foco visível — 6/6 PASS (`ac-12.json`)                                                                              | Acessibilidade AA e teclado                               | ✅     |
| AC-13 | Teste "jornada das fontes": seção Fontes ao final com links absolutos; lista vazia → sem seção e sem erro — PASS (`ac-13.json`)                                                                                                  | Fontes absolutas; vazio tratado                           | ✅     |

Cobertura de AC: **13/13**. Reprovações: **nenhuma** (0 FAIL, 0 UNVERIFIABLE, 0 com evidência ausente).

Corridas de apoio: E2E run 2 = **34/34 PASS** (`e2e.log`, `e2e-results.json`); pgTAP = 63/63; unit = 104/104. A 1ª corrida do E2E (12 failed / 10 skipped) foi **invalidada** por parada da stack Supabase no meio do run (colisão com a sessão paralela) e está preservada como `e2e-run1-parada-de-stack.log` — não conta como prova.

## Modo REVIEW — auditoria do diff

Contexto: `origin/main...HEAD` contém **apenas `docs.zip`** — o código da feature já está em `origin/main` via PRs #22/#23; a auditoria abaixo cobre a árvore de `2bcea1d` inteira no que toca os critérios.

- [x] TypeScript estrito, sem `any` implícito. (`pnpm typecheck` ✓; `rg ': any|as any'` em `app/ lib/ components/ hooks/` → 0)
- [x] Server Component por padrão; `'use client'` só em folha interativa. (`'use client'` só em `components/shared/theme-toggle.tsx`, `components/shared/theme-provider.tsx` e `app/error.tsx`; em `app/layout.tsx` é menção em comentário)
- [x] `auth.getUser()` para autorização; `getSession()` só para exibir. (`getSession(` em `app/ lib/ components/ hooks/` só em comentários/explicações; autorização via `getUser()` em `lib/supabase/middleware.ts`)
- [x] Toda `className` condicional passa por `cn()`. (nenhum template literal condicional cru em `className` de `app/ components/`)
- [x] Nenhum `process.env` espalhado — tudo por `lib/env.ts`. (única ocorrência fora de `env.ts`: comentário em `lib/utils/format.ts`)
- [x] Tabela nova tem RLS + policy por operação. (md-0002 não cria tabela; RLS das tabelas de md-0001 provada por pgTAP 63/63)
- [x] Função SECURITY DEFINER tem `SET search_path = ''` + grant explícito. (`is_post_public`, `set_post_updated_at` e demais em `supabase/migrations/*.sql` — todas com `set search_path = ''`)
- [ ] **Nenhum segredo commitado** — `pnpm security:sast` passou (0 findings), mas `pnpm security:secrets` **falhou (exit 1, 11 findings)** → BLOCKER #2 abaixo.
- [x] Comentários explicam o porquê, atualizados (não mentem).
- [x] Sem código morto / debug (`console.log` de debug) sobrando. (única saída é `console.info` em `lib/audit.ts`, intencional e documentado como ponto único de saída de auditoria)

Observações de review:

1. `docs/specs/INDICE.md:25` lista `md-0002` como `Proposed` enquanto a própria spec está `Accepted` (linha 4) — índice desatualizado (WARNING do artefato).
2. `docs.zip` (o único arquivo novo de `2bcea1d` sobre `main`) duplica 63 arquivos de `docs/` em binário; decisão do dono é mantê-lo — varredura do ZIP extraído por padrões de segredo: 0 achados.
3. O artefato anterior `2026-10-07-check-producao-local-axe-decisao.json` (13/13 para `2639744b`) aponta evidências para caminhos externos (`/home/jonathan/.gemini/...`) — não serve como prova; substituído por esta execução, cujas evidências vivem em `docs/reviews/evidence/2026-10-08-md0002-revalidacao/`.
4. Correção desta sessão: `scripts/run-gitleaks.mjs` agora usa `git ls-files -z` com divisão por NUL (bloco A do check paralelo `2026-10-08-0003`); escopo git atual tem 0 caminhos não-ASCII, sem delta de findings atribuível à correção.

## Regressão

- `pnpm check:all`: **falhou** — typecheck ✓, lint ✗ (exit 2: eslint 10.12.0 quebra com eslint-plugin-react 7.37.5, `resolveBasedir`/`detectReactVersion`), formatação ✓, testes 104/104 ✓.
- `pnpm build:next`: passou. `pnpm build` (OpenNext/Workers): passou. `wrangler dry-run`: passou. `pnpm audit --audit-level=high`: 0 vulnerabilidades.
- `pnpm test:e2e`: **passou** (34/34, run 2). Run 1 invalidada por parada da stack (colisão de sessão paralela), preservada em log.
- `pnpm supabase:test` (pgTAP, migrações/RLS): **passou** (63/63).
- `pnpm security:sast`: passou (0 findings). `pnpm security:secrets`: **falhou** (exit 1, 11 findings — ver BLOCKER #2).

## Veredito

- [ ] **Aprovado** — ACs cobertos, review limpo, regressão verde. Merge liberado.
- [x] **Reprovado** — motivo: saída literal de `scripts/check-decision.mjs`:

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

1. **P0 — compatibilidade eslint:** reverter `eslint` a 9.x ou atualizar `eslint-plugin-react` para versão compatível com eslint 10; rodar `pnpm check:all` completo até exit 0.
2. **P0 — forço + rotação (decisão do usuário):** forçar o push de `origin/feat/md-0002-casca-editorial-home` (hoje em `10eecbc`, com segredos) e rotacionar `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_PREVIEW_*`; repetir `pnpm security:secrets` até exit 0.
3. **P1:** atualizar `docs/specs/INDICE.md` (`md-0002` → `Accepted`).

## Artefato do gate (copiar e preencher)

- Decisão gerada por: `node scripts/check-decision.mjs docs/reviews/2026-10-08-md0002-revalidacao-resultado.json` → exit 1, saída transcrita acima (contrato `schemaVersion: 1`, 13 ACs com evidência e hash conferidos).
- `node scripts/check-gate.mjs docs/reviews/2026-10-08-md0002-revalidacao-resultado.json --commit "$(git rev-parse HEAD)" --repo ...` → **Bloqueado: Árvore suja: a revisão não representa o código avaliado.** (exit 1). Mesmo com árvore limpa o gate recusaria: `Decisão ... REPROVADA` — `approved: false`.
- Evidências (arquivos + `sha256` em cada `ac-NN.json`): `docs/reviews/evidence/2026-10-08-md0002-revalidacao/`.

## Hash binding

Este relatório vale apenas para o SHA declarado (`2bcea1ddb429c1988b211923a17eb25df9dbaa48`). Qualquer commit novo invalida a aprovação — e aqui não há aprovação a invalidar: o veredito é REPROVADO.
