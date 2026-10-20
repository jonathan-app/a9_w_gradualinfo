# Recheck do check gate da baseline editorial

> **SUPERADO pelo relatório de 2026-10-20 13:57. Não usar este documento como aprovação.**
> O conteúdo abaixo permanece inalterado como registro histórico da execução intermediária.

**Data:** 2026-10-20 13:49 (America/Sao_Paulo)  
**Modo:** `/check review` após correção Ponytail  
**Spec:** `docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md`  
**Arquivos verificados:** `scripts/ci-assess.mjs`, `playwright.config.ts`, `__tests__/unit/ci-assess.test.ts`  
**Veredito da autoridade:** **REPROVADO** somente por `ci/AC-03` não verificável no ambiente

## Resumo

- ACs: 4 PASS, 0 FAIL, 1 UNVERIFIABLE.
- Achados: 0 BLOCKER, 0 WARNING, 0 NIT.
- Os dois BLOCKERs do relatório anterior foram corrigidos.
- A redução removeu 76 linhas líquidas do código e teste tocados, sem nova abstração.

## Correção verificada

1. `requiredCases` voltou a exigir somente títulos dos cenários específicos da md-0002.
2. O mecanismo de candidatos foi removido; uma prova genérica não pode mais substituir nem esconder a prova específica.
3. O Playwright voltou a incluir `verify-md0002-tarefa4.spec.ts`, `verify-md0002-tarefa5.spec.ts`, `verify-md0002-tarefa8.spec.ts` e `accessibility.spec.ts` no conjunto normal.
4. `verify-header-public.spec.ts`, `verify-home-pendentes.spec.ts` e `verify-md0002-acessibilidade.spec.ts` permanecem isolados para evitar duplicação.
5. Um teste de regressão prova que `carrega o título principal` não concede PASS a `md-0002/AC-01`.

## Critérios de aceite

| AC         | Estado       | Evidência                                                                                                                            |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ci/AC-01` | PASS         | `node scripts/check-targets.mjs`: uma spec exigida, conjunto completo.                                                               |
| `ci/AC-02` | PASS         | `requiredCases` exige as provas específicas; 8 testes focados passaram.                                                              |
| `ci/AC-03` | UNVERIFIABLE | O workflow aponta para `main`, mas `git remote show origin` falhou por configuração SSH e `gh` não obteve conectividade/autorização. |
| `ci/AC-04` | PASS         | Prova genérica retorna `UNVERIFIABLE`; não existe mais seleção de primeira alternativa.                                              |
| `ci/AC-05` | PASS         | A separação entre avaliação mecânica e aprovação humana permanece inalterada.                                                        |

## Evidências executadas

- `./node_modules/.bin/vitest run __tests__/unit/ci-assess.test.ts`: 8/8 PASS.
- `./node_modules/.bin/tsc --noEmit`: PASS.
- ESLint nos três arquivos alterados: PASS.
- Prettier nos arquivos alterados e relatórios: PASS.
- `git diff --check`: PASS.
- `EDITORIAL_LOCAL=0 ./node_modules/.bin/playwright test --list`: as provas específicas necessárias estão selecionadas.
- `node scripts/check-targets.mjs`: PASS.

A suíte completa foi tentada, mas o sandbox impediu subprocessos usados por testes não relacionados: `gates.test.ts` falhou ao executar `git init` com `EPERM`, e um teste WORM multiprocesso falhou na barreira. A execução foi encerrada depois de confirmar que o teste focado deste diff estava verde.

## Autoridade da decisão

Comando:

```text
node scripts/check-decision.mjs /tmp/check-review-ci-gate-fixed.json --spec docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md
```

Contagens: `totalACs=5`, `PASS=4`, `FAIL=0`, `UNVERIFIABLE=1`, `missingEvidence=0`, `BLOCKER=0`, `WARNING=0`.

Razão, transcrita integralmente:

1. `AC sem PASS: ci/AC-03`

## Próximo passo

Executar `/check verify` em ambiente com acesso ao GitHub para confirmar o branch padrão remoto e rodar a CI completa. Não há correção local pendente nos três arquivos auditados.
