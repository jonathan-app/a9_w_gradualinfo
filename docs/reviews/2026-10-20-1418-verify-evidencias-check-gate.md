# Verify das evidências específicas do check gate

**Data:** 2026-10-20 14:18 (America/Sao_Paulo)  
**Modo:** `/check verify`  
**Spec:** `docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md`  
**Árvore verificada:** alterações locais sobre `eceff6eb131f9b720d3bccaa44559dadbe442459`  
**Veredito da autoridade:** **REPROVADO**

## Resumo

- ACs: 4 PASS, 0 FAIL, 1 UNVERIFIABLE.
- Achados: 0 BLOCKER, 0 WARNING, 0 NIT.
- O avaliador agora exige provas separadas para os detalhes antes cobertos apenas pelo título do teste.
- `ci/AC-02` continua não verificável sem um artefato Playwright executado pela CI na mesma revisão.

## Correções inspecionadas

1. `md-0002/AC-02` compara capa, editoria, título, resumo e data dos cards com os registros da stack Supabase descartável.
2. `md-0002/AC-06` combina o cenário hostil em runtime com inspeção automatizada do caminho de renderização Markdown.
3. `md-0002/AC-10` compara o `lastmod` do sitemap com `published_at` lido da mesma fixture.
4. `md-0002/AC-13` verifica título e URL absoluta da fonte, isolamento do corpo Markdown, ordem em relação ao corpo e à autoria, além da ausência da seção sem fontes.
5. As regressões de `ci-assess` retiram cada prova exigida isoladamente e confirmam `UNVERIFIABLE`.
6. O relatório de 13:49 foi marcado no topo como superado pelo relatório de 13:57 e impróprio para aprovação.

## Critérios de aceite

| AC         | Estado       | Evidência                                                                                                                                                                |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci/AC-01` | PASS         | `node scripts/check-targets.mjs`: `1 specs exigidas, conjunto completo.`                                                                                                 |
| `ci/AC-02` | UNVERIFIABLE | Os 12 casos foram descobertos, mas a stack Supabase descartável e as credenciais efêmeras não estão disponíveis localmente; não existe artefato Playwright desta árvore. |
| `ci/AC-03` | PASS         | Branch padrão `main` já confirmado no verify de 13:57; o workflow continua configurado para PRs dirigidos a `main`.                                                      |
| `ci/AC-04` | PASS         | 12 testes unitários passaram; a remoção de qualquer prova específica de AC-02, AC-06, AC-10 ou AC-13 produz `UNVERIFIABLE`.                                              |
| `ci/AC-05` | PASS         | A decisão mecânica continua sem conceder aceite editorial, merge ou deploy.                                                                                              |

## Evidências locais

- Regressões do avaliador: 12/12 PASS em `__tests__/unit/ci-assess.test.ts`.
- `./node_modules/.bin/tsc --noEmit`: PASS.
- ESLint dos arquivos alterados: PASS.
- Prettier dos arquivos alterados: PASS.
- Playwright: 12 casos descobertos em 2 arquivos, não executados.
- `git diff --check`: PASS.
- Log vinculado: `docs/reviews/evidence/2026-10-20-1418-check-gate-local.log`.

## Autoridade da decisão

Comando:

```text
node scripts/check-decision.mjs /tmp/check-verify-ci-gate-1418.json --spec docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md
```

Contagens: `totalACs=5`, `PASS=4`, `FAIL=0`, `UNVERIFIABLE=1`, `missingEvidence=0`, `BLOCKER=0`, `WARNING=0`.

Razão, transcrita integralmente:

1. `AC sem PASS: ci/AC-02`

## Próximo passo

O diff não está pronto para commit: a inspeção do código conectado mostra a autoria antes das fontes em `app/artigos/[slug]/page.tsx`, enquanto AC-13 exige a ordem inversa; a home também compõe destaque, teasers, últimas leituras e grade com mais de dez links e variantes sem todos os campos exigidos por AC-02/AC-04. `/develop` deve alinhar a aplicação à spec sem enfraquecer as novas provas. Depois, executar a CI completa e repetir `/check verify` contra o artefato Playwright da mesma revisão. Commit e push continuam dependentes de autorização explícita.
