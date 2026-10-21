# Evidência — revisão da remoção do pacote npm `ponytail`

- Revisão: `97b8441734f565480603c5ec892d03a07fb78b8e`
- Árvore base: `552041eba941bf0d1d87670a5d8c261dabe7a259`
- Arquivos do diff revisado: `package.json`, `pnpm-lock.yaml`
- Hash de `package.json`: `2c770a0fb24545f003b336640980ecc96eef5795761e1882bcb1c5de69c4f5ac`
- Hash de `pnpm-lock.yaml`: `38bbdeb3443ea010ece48e4c24c04c56ce976d272f7401ea3d518037f7285e34`

## Inspeção independente

Um modelo diferente revisou o diff e não encontrou defeito técnico. A alteração remove exatamente a dependência direta, a entrada do importer, a resolução do pacote e o snapshot vazio de `ponytail@1.0.57`. Não há import ou consumidor do pacote no código versionado.

A skill homônima permanece independente do npm: `scripts/materialize-skills.mjs` materializa `security/skills-catalog/ponytail/` em `.agents/skills/ponytail/` e mantém o ponteiro em `.claude/skills/ponytail/`. `skills-lock.json` e `security/skills-allowlist.json` continuam registrando sua origem.

## Validações executadas

- `prettier --check package.json pnpm-lock.yaml`: PASS.
- `node scripts/check-skills.mjs`: PASS, 16 skills e ponteiros validados.
- `node scripts/check-portability.mjs`: PASS, com seis avisos preexistentes de orçamento, sem erro.
- `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Busca por import, manifesto ou lock de `ponytail@1.0.57`: nenhum consumidor; apenas registros históricos/documentais da skill e da remoção.
- `pnpm check:all`: PASS já registrado na mesma árvore de trabalho em `docs/reviews/2026-10-21-1121-gate-integrado-check-all.md` (89 suítes, 979 testes, zero skipped; Gitleaks e Semgrep sem achados bloqueantes).

## Limite contratual

O escopo R3 ainda contém `Design it (spec)` pendente em `docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md`. A Spec 0027 aceita contém `test-clean/AC-04` sobre sanidade de dependências, mas sua decisão aprovada restringe a limpeza daquele lote a scripts específicos; ela não autoriza expressamente a remoção de `ponytail`. Conforme `/check`, a ausência de uma spec aceita correspondente é BLOCKER formal.
