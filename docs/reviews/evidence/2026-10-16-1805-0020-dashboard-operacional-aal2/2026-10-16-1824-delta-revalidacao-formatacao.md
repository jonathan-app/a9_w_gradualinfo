# Delta de revalidação: formatação e portão de qualidade (Spec 0020)

**Data**: 2026-10-16 18:24 (America/Sao_Paulo)
**Escopo**: revalidação independente do /check da Spec 0020, executada após o fechamento do relatório `docs/reviews/2026-10-16-1805-0020-dashboard-operacional-aal2.md` (versão de 18:16:05, com as limitações explícitas do AC-02) e do `check/0020-dashboard-aal2/results.json` (versão de 18:15:36). Preserva o veredito APROVADO vigente e registra o delta de formatação e as divergências residuais para o `/sync`.

## 1. Correção aplicada (cosmética)

`pnpm exec prettier --write` nos três arquivos que reprovavam `format:check`:

| Arquivo                                                | SHA-256 antes                                                      | SHA-256 depois                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `e2e/admin-operational-dashboard.spec.ts`              | `6eabff943c7b16ebc4c5ff934ec504ecc0e0d7f1a9f03fb0a6b189212a6b00ae` | `df50a414b506bca13c5893041412706a3ab2e4e9877b2ee69152118bfb63485d` |
| `scripts/seed-e2e-offers.mjs`                          | `6978f032a0ebe8799fc63ecba746599498f0836bb7354c309067b4dc76935dd7` | `373d78a8859ff6e1fff2673449bca5ed0489dca4231b2d3d8fe0814773e983d8` |
| `docs/reviews/2026-10-16-1805-0020-dashboard-operacional-aal2.md` | `21ad4ba0862102c2db8a061eaadedd6ab39e7053cae13f2708ba2787d0edd7bb` | `3b5d7698c03c778476531292e154f142b82ca5d78dcbf0cae885cb88f71e973a` |

As três alterações são rewrap de linhas e ajuste de tabela markdown (comparação com `diff -w` sem mudança de tokens). Nenhum valor, string, asserção ou comportamento foi alterado; a suíte Playwright não foi reexecutada por esse motivo, já que `pnpm check:all` cobre typecheck, lint, formatação e Vitest. O manifesto do relatório de check cita os hashes anteriores para os dois arquivos de código; a atualização canônica é este delta.

## 2. Revalidação

- `pnpm check:all` exit 0 em 2026-10-16 18:23: `tsc --noEmit`, `eslint .`, `prettier --check .` e Vitest 765/765 PASS em 75 arquivos. Log bruto: `2026-10-16-1823-check-all-pos-formatacao.log` (neste diretório).
- `node scripts/check-decision.mjs check/0020-dashboard-aal2/results.json --spec docs/specs/2026-10-16-1650-0020-dashboard-operacional-aal2.md` reexecutado em 2026-10-16 18:18: exit 0, APROVADO (8/8 PASS), com o `results.json` já contendo a evidência AC-02 revisada (hash `ef042f8ba386545927ec6136bd948f4add1790f1aa9341252be3a084fbc66bef`).

## 3. Divergências residuais (não alteram os 8 PASS)

1. **WARNING (AC-02, precisão de evidência)**: a evidência `ac-02-mesa-editorial-sanity.md` (item 4) e o Bastão atual afirmam que o E2E "utilizou o catálogo local (`isLocalEditorialMode`)". Com a configuração congelada do harness isso não procede: `isLocalEditorialMode` exige `NODE_ENV=development` e `EDITORIAL_LOCAL=1` (`lib/env.ts:28`), condições ausentes no Worker (build de produção, flag não definida), enquanto `isSanityConfigured` permanece verdadeiro pelas vars do `wrangler.jsonc` (`SANITY_PROJECT_ID`/`DATASET`). O bloco editorial do E2E é tolerante por construção: aceita mensagem de não configurado, coluna "Título", lista vazia ou o próprio cabeçalho "Mesa Editorial" (`e2e/admin-operational-dashboard.spec.ts`, linhas 170 a 187) e não asserta badges "Rascunho"/"Publicado" nem títulos. A ressalva de que o Sanity remoto não foi consultado end to end está correta; a frase sobre o catálogo local deve ser corrigida na reconciliação.
2. **INFO (AC-05, números do relatório)**: a seção "1. Bloco comercial" dos esclarecimentos diverge do seed congelado no manifesto: cita outlier com `price_cents = 199900` (o script usa `100000`) e "Mouse Sem Fio Ergonômico E2E" a R$ 120,00 (o script, o E2E e a linha 211 do spec usam "Mouse Sem Fio Ultra Leve E2E" a R$ 150,00). As provas comportamentais permanecem válidas.
3. **WARNING (regra 10 do AGENTS.md)**: os quatro testes novos da 0020 não têm cabeçalho `@fileoverview`: `__tests__/unit/admin-dashboard-routes.test.ts`, `__tests__/unit/lib/commercial-dashboard.test.ts`, `__tests__/unit/lib/editorial-dashboard.test.ts` e `__tests__/unit/lib/health-dashboard.test.ts` (a árvore tem 72 de 76 arquivos de teste com o cabeçalho). Débito para rodada corretiva ou reconciliação.
4. **WARNING (AC-08, acessibilidade)**: o modal de preview (`components/admin/dashboard/action-hub.tsx`) implementa `role="dialog"`, `aria-modal` e fechamento por Escape, mas não prende o foco nem devolve o foco ao gatilho; a evidência AC-08 menciona "controle via teclado", que não cobre gestão de foco.

## 4. Encaminhamento

Aceite visual do painel pelo proprietário em `http://127.0.0.1:3100/admin-dashboard` (Operador sob Access/AAL2) e, em seguida, `/sync`, que deve reconciliar: os dois hashes novos da seção 1, o veredito APROVADO vigente e as divergências da seção 3 conforme decisão.
