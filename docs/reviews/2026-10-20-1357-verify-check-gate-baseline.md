# Verify do check gate da baseline editorial

**Data:** 2026-10-20 13:57 (America/Sao_Paulo)  
**Modo:** `/check verify`  
**Spec:** `docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md`  
**Árvore verificada:** alterações locais sobre `eceff6eb131f9b720d3bccaa44559dadbe442459`  
**Veredito da autoridade:** **REPROVADO**

## Resumo

- ACs: 4 PASS, 0 FAIL, 1 UNVERIFIABLE.
- Achados: 0 BLOCKER, 0 WARNING, 0 NIT.
- `ci/AC-03`, antes pendente, foi comprovado diretamente no GitHub.
- `ci/AC-02` permanece UNVERIFIABLE porque não existe relatório E2E da árvore atual executando as provas específicas.

## Critérios de aceite

| AC         | Estado       | Evidência                                                                                                                                                                                 |
| ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci/AC-01` | PASS         | `node scripts/check-targets.mjs` retornou `1 specs exigidas, conjunto completo.`                                                                                                          |
| `ci/AC-02` | UNVERIFIABLE | A árvore atual não tem artefato Playwright vinculado ao seu commit e árvore. O relatório antigo disponível é rejeitado por todos os 12 ACs editoriais após a correção.                    |
| `ci/AC-03` | PASS         | A API do GitHub confirmou `default_branch: main`; `.github/workflows/ci.yml` dispara em PRs para `main`; a execução remota `39457310968` aprovou a etapa de conferência do branch padrão. |
| `ci/AC-04` | PASS         | O manifesto é não vazio, corresponde ao escopo, e o avaliador corrigido devolveu UNVERIFIABLE para todas as provas genéricas do relatório antigo em vez de reaproveitá-las.               |
| `ci/AC-05` | PASS         | `scripts/ci-check-results.mjs` mantém explicitamente a aprovação humana separada da avaliação mecânica.                                                                                   |

## Evidências locais

- `./node_modules/.bin/vitest run __tests__/unit/ci-assess.test.ts`: 8/8 PASS.
- `./node_modules/.bin/tsc --noEmit`: PASS.
- ESLint dos três arquivos alterados: PASS.
- Prettier dos três arquivos alterados: PASS.
- `git diff --check`: PASS.
- `node scripts/check-targets.mjs`: PASS.
- Nenhum servidor local estava ativo nas portas 3000, 3100 ou 3200.
- `next build` iniciou a compilação otimizada, mas o sandbox bloqueou o processo PostCSS/Turbopack ao tentar abrir uma porta (`Operation not permitted`). A repetição fora do sandbox não recebeu autorização durante esta execução.

## Evidências remotas

- Repositório `jonathan-app/a9_w_gradualinfo`: público, branch padrão `main`.
- Execução `39455056086`, commit `e8b2c6b`: Qualidade, Segurança, Banco e Lighthouse passaram; o job E2E falhou ao executar a seleção específica restaurada neste diff; `/check gate` foi ignorado.
- Execução `39457310968`, commit `dcf33cd`: seis jobs passaram, mas esse commit excluía `verify-*.spec.ts` e `accessibility.spec.ts` e usava os candidatos genéricos posteriormente reprovados pela revisão. Esse verde não comprova a árvore atual.

## Autoridade da decisão

Comando:

```text
node scripts/check-decision.mjs /tmp/check-verify-ci-gate.json --spec docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md
```

Contagens: `totalACs=5`, `PASS=4`, `FAIL=0`, `UNVERIFIABLE=1`, `missingEvidence=0`, `BLOCKER=0`, `WARNING=0`.

Razão, transcrita integralmente:

1. `AC sem PASS: ci/AC-02`

## Correção exigida

Não há defeito de código novo identificado neste verify. Para liberar o merge, a árvore corrigida precisa ser commitada e enviada ao branch, e a CI deve produzir um relatório Playwright próprio em que as provas específicas exigidas por `scripts/ci-assess.mjs` passem; então `/check verify` deve ser repetido contra esse artefato.
