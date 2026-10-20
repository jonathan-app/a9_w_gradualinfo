# Revisão do check gate da baseline editorial

**Data:** 2026-10-20 13:39 (America/Sao_Paulo)  
**Modo:** `/check review`  
**Spec:** `docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md`  
**Diff auditado:** `e8b2c6b^..dcf33cd`  
**Veredito da autoridade:** **REPROVADO**

## Resumo

- ACs: 2 PASS, 2 FAIL, 1 UNVERIFIABLE.
- Achados: 2 BLOCKER, 0 WARNING, 0 NIT.
- Manifesto local: `node scripts/check-targets.mjs` aprovou com uma spec exigida.
- Carga considerada: um job de CI e um worker Playwright serializado.

## Critérios de aceite

| AC         | Estado       | Evidência                                                                           | Resultado                                                                                                                                   |
| ---------- | ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci/AC-01` | PASS         | `scripts/check-targets.mjs`; execução local: `1 specs exigidas, conjunto completo.` | O manifesto atual contém a baseline Accepted e corresponde ao escopo sem fatias em progresso.                                               |
| `ci/AC-02` | FAIL         | `scripts/ci-assess.mjs:26-110` e testes E2E conectados                              | A matriz atribui PASS a ACs da md-0002 usando casos que não comprovam o contrato específico.                                                |
| `ci/AC-03` | UNVERIFIABLE | `.github/workflows/ci.yml:31-38`                                                    | O YAML aponta PRs para `main` e permite `workflow_dispatch`, mas a conferência exigida contra o remoto falhou por permissões locais do SSH. |
| `ci/AC-04` | FAIL         | `scripts/ci-assess.mjs:156-166`                                                     | Uma prova específica falha pode ser ignorada quando um candidato genérico anterior passa.                                                   |
| `ci/AC-05` | PASS         | `scripts/ci-check-results.mjs:73-82`                                                | O resultado mantém aprovação humana separada da avaliação mecânica.                                                                         |

## Achados

### BLOCKER 1 — casos genéricos aprovam contratos que não exercitam

Em `scripts/ci-assess.mjs:26-110`, os primeiros candidatos de vários ACs têm alcance menor que o requisito:

- `carrega o título principal` aprova ordenação, limite, campos dos cards e destaque (`AC-01`, `AC-02`, `AC-04`);
- a sonda de saúde e headers da home aprovam estados vazio e erro (`AC-03`);
- JSON-LD e uma rota 404 aprovam renderização Markdown e neutralização de HTML (`AC-05`, `AC-06`);
- uma negação anônima e `no-store` aprovam o caminho autorizado de preview (`AC-08`);
- alternar tema e ver o título aprovam axe e teclado (`AC-12`);
- abrir um artigo aprova a seção completa de fontes (`AC-13`).

O problema é observável porque `playwright.config.ts:25-35` exclui normalmente `verify-*.spec.ts` e `accessibility.spec.ts`, que contêm as provas específicas. A correção mínima é manter no mapa apenas casos que exercitem integralmente cada AC e executar essas provas na CI.

### BLOCKER 2 — a primeira alternativa esconde falha posterior

Em `scripts/ci-assess.mjs:156-166`, o loop interrompe na primeira alternativa encontrada. Uma reprodução direta com `carrega o título principal` em PASS e `cards completos, destaque e limite` em FAIL devolveu `PASS` para `md-0002/AC-01`.

A correção mínima é avaliar todos os candidatos presentes e propagar qualquer falha. O caso reproduzido deve entrar em `__tests__/unit/ci-assess.test.ts` para impedir regressão.

## Autoridade da decisão

Comando executado:

```text
node scripts/check-decision.mjs /tmp/check-review-ci-gate.json --spec docs/specs/2026-10-10-2155-0011-governanca-engenharia/0011-ci-check.md
```

Contagens devolvidas: `totalACs=5`, `PASS=2`, `FAIL=2`, `UNVERIFIABLE=1`, `missingEvidence=0`, `BLOCKER=2`, `WARNING=0`.

Razões, transcritas integralmente:

1. `AC sem PASS: ci/AC-02`
2. `AC sem PASS: ci/AC-03`
3. `AC sem PASS: ci/AC-04`
4. `BLOCKER: O avaliador aceita testes genéricos que não comprovam o contrato dos ACs md-0002 e pode produzir PASS sem evidência suficiente.`
5. `BLOCKER: A seleção do primeiro candidato existente ignora uma prova específica posterior que esteja falhando.`

## Correções exigidas para `/develop`

1. Substituir os candidatos genéricos de `requiredCases` por provas que cubram integralmente cada AC da md-0002.
2. Garantir que as suítes específicas necessárias não sejam excluídas do relatório consumido pelo check gate.
3. Alterar `assessAC` para que uma alternativa aprovada não esconda outra alternativa presente e falha.
4. Adicionar um teste de regressão com candidato genérico PASS e prova específica FAIL.
5. Reexecutar `/check verify` após a correção e conferir o branch padrão remoto em ambiente com acesso ao origin.
