# /check — Correção do lint em árvore limpa (`scripts/cloudflare-worker.ts` × `.open-next`)

- **Data:** 2026-10-09 23:30Z
- **Commit avaliado:** `ed00c4b9fcc69c3570cfed106bb58cc6931633aa` (árvore `9ef0f628b6eef85ca97ae9295b33e4f13343efee`)
- **Mudança sob validação:** `eslint.config.mjs` (exceção de contexto `import/no-unresolved` para `scripts/cloudflare-worker.ts`), não commitada
- **Spec:** nenhuma. Nenhuma spec em `docs/specs/` governa esta mudança de manutenção de tooling

## Modo verify — Critérios automáticos (prova empírica, execuções frescas)

| Critério                                                                      | Resultado              | Evidência                                                           |
| ----------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `pnpm lint` sem `.open-next` (estado de checkout limpo, o cenário do defeito) | exit 0                 | `evidence/2026-10-09-2330-lint-arvore-limpa/lint-sem-open-next.log` |
| `pnpm lint` com `.open-next` (após build)                                     | exit 0                 | `evidence/2026-10-09-2330-lint-arvore-limpa/lint-com-open-next.log` |
| `pnpm typecheck`                                                              | exit 0                 | `evidence/2026-10-09-2330-lint-arvore-limpa/typecheck.log`          |
| `pnpm test:run`                                                               | exit 0, 319/319 testes | `evidence/2026-10-09-2330-lint-arvore-limpa/test-run.log`           |
| `pnpm exec prettier --check eslint.config.mjs`                                | exit 0                 | saída no transcript da sessão                                       |
| Segredos no diff                                                              | nenhum                 | diff de 13 linhas, só comentário e config                           |

O defeito original (2 erros `import/no-unresolved` em `scripts/cloudflare-worker.ts:8` e `:9` quando `.open-next` não existe) foi reproduzido antes da correção e não mais reproduz após ela, nos dois estados da árvore.

## Modo review — Auditoria imparcial (modelo diferente do autor)

Revisão feita por subagente separado, que leu o diff, a config, o `tsconfig.json`, o `scripts/cloudflare-worker.ts` e a CI por conta própria.

- **0 BLOCKER / 0 WARNING / 1 NIT**
- NIT: o comentário citava o pre-commit rodando lint, mas `.husky/pre-commit` roda só `prettier --check` e `pnpm typecheck`. Corrigido no comentário antes de gerar o artefato (mudança de comentário, zero linhas de código alteradas).
- A auditoria confirmou: o escopo é correto (só `scripts/cloudflare-worker.ts`, só `import/no-unresolved`; `--print-config` mostra as regras `import/named`, `import/default`, `@typescript-eslint/no-explicit-any` ainda em `error` no arquivo); a ordem do array faz o bloco vencer; `globalIgnores` seria pior (derrubaria todas as regras do arquivo); nenhuma outra regra do projeto falha sem `.open-next` (`tsconfig.json` já exclui o arquivo, vitest e prettier não o tocam).

## Autoridade da decisão

`node scripts/check-decision.mjs docs/reviews/evidence/2026-10-09-2330-lint-arvore-limpa/resultado.json` → exit 1, saída transcrita em `evidence/2026-10-09-2330-lint-arvore-limpa/decisao.json`:

- **Veredito: REPROVADO**
- `reasons` (transcrição literal):
  1. "Spec/hash diferente do contrato esperado."
  2. "Conjunto de ACs incompleto, duplicado ou diferente da spec."

## Correções acionáveis

A reprovação é processual, não é defeito da mudança: o gate exige uma spec `Accepted` com ACs numerados em `docs/specs/`, e esta é uma correção de manutenção de tooling sem spec. Duas saídas legítimas:

1. **Manutenção fora do gate (recomendado):** registrar como manutenção com gates verificados, no padrão das linhas 136 e 152 de `workflow/STATE.md`. A mudança já tem prova empírica completa acima.
2. **Colocar sob o gate:** `/architect` escreve primeiro uma spec com `## Requirements` e ACs numerados (caminho de documentação de decisão já feita), e o `/check` reexecuta contra ela.

## Observação de ambiente (não entra no veredito)

`pnpm format:check` global ficou transientemente vermelho duas vezes durante esta sessão por artefatos de sessões paralelas na árvore compartilhada: entradas soltas em `docs/reviews/evidence/2026-10-09-2045-0006/` (diretório que desapareceu em seguida) e `docs/reviews/evidence/2026-10-09-2029-0006/2026-10-09-2029-check-result.json` sem formatação. O arquivo sob validação passa em `prettier --check`. Risco de concorrência de sessões paralelas já documentado no `AGENTS.md`.

## Conclusão

A mudança está correta e com prova empírica completa, mas o gate mecânico não a pode aprovar sem spec. Nenhum commit, merge ou deploy foi feito nem autorizado.
