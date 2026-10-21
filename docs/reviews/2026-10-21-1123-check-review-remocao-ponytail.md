# `/check review` — remoção da dependência npm `ponytail`

- **Data:** 2026-10-21 11:23 BRT
- **Escopo revisado:** `package.json` e `pnpm-lock.yaml`
- **Revisor independente:** modelo distinto do agente que realizou a correção
- **Resultado técnico:** nenhum defeito encontrado
- **Veredito da autoridade:** **REPROVADO** (`exit 1`)

## Resumo

O diff é mínimo e coerente: remove a dependência direta não utilizada `ponytail@1.0.57` e exatamente suas três representações no lockfile. Nenhum consumidor do pacote foi encontrado. A skill `DietrichGebert/ponytail`, o catálogo versionado, a instalação materializada e os ponteiros permanecem preservados e passaram pelas verificações próprias.

O gate não pode aprovar a mudança ainda porque o Lote R3 continua sem uma spec aceita correspondente. A Spec 0027 foi usada apenas como contrato de referência mais próximo: seu AC-04 e o gate integrado atual passam, mas os outros três ACs pertencem ao lote antigo e ficam `UNVERIFIABLE` nesta revisão. Além disso, a decisão da Spec 0027 autoriza remoções específicas de scripts, não esta dependência.

## Achados

### BLOCKER — contrato específico de R3 ausente

`docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md` mantém `Design it (spec): /architect auditoria de dependencias auxiliares` pendente. Pela regra do `/check`, ausência da spec correspondente bloqueia a aprovação.

Correção: formalizar em `/architect` um contrato mínimo para o Lote R3, incluindo critérios para comprovar ausência de consumidores, reconciliar o lockfile e preservar a operação das skills. Depois, repetir o `/check review` contra esse contrato.

## Critérios da Spec 0027 usados como referência

| Critério           | Estado       | Motivo                                                                            |
| ------------------ | ------------ | --------------------------------------------------------------------------------- |
| `test-clean/AC-01` | UNVERIFIABLE | Trata das remoções de scripts do lote anterior.                                   |
| `test-clean/AC-02` | UNVERIFIABLE | Trata da preservação das suítes no lote anterior.                                 |
| `test-clean/AC-03` | UNVERIFIABLE | Trata da integridade das migrations no lote anterior.                             |
| `test-clean/AC-04` | PASS         | Pacote sem consumidor removido; manifesto e lockfile coerentes.                   |
| `test-clean/AC-05` | PASS         | `pnpm check:all` passou na mesma árvore de trabalho, conforme relatório de 11:21. |

## Validações

- Prettier de `package.json` e `pnpm-lock.yaml`: PASS.
- TypeScript: PASS.
- `git diff --check`: PASS.
- `scripts/check-skills.mjs`: PASS.
- `scripts/check-portability.mjs`: PASS, somente avisos preexistentes de orçamento.
- Gate integrado `pnpm check:all`: PASS, conforme `docs/reviews/2026-10-21-1121-gate-integrado-check-all.md`.
- Autoridade `scripts/check-decision.mjs`: `2 PASS`, `0 FAIL`, `3 UNVERIFIABLE`, `1 BLOCKER`, `0 WARNING`; **REPROVADO**.

## Reasons da autoridade

1. `AC sem PASS: test-clean/AC-01`
2. `AC sem PASS: test-clean/AC-02`
3. `AC sem PASS: test-clean/AC-03`
4. `BLOCKER: O Lote R3 ainda não possui spec aceita correspondente: docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md mantém Design it pendente, e a decisão da Spec 0027 limita a remoção aprovada a scripts específicos. Formalizar em /architect o contrato mínimo para auditar e remover dependências auxiliares antes do merge.`

## Artefatos

- Resultado estruturado: `check/dependency-ponytail/2026-10-21-1123-review/results.json`
- Evidência: `docs/reviews/evidence/2026-10-21-1123-review-remocao-ponytail/review-evidence.md`

Nenhum código de aplicação foi alterado nesta revisão. Commit, push, merge e deploy não foram executados.
