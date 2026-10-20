# Revisão das provas do layout editorial

**Data:** 2026-10-20 18:07, America/Sao_Paulo  
**Modo:** `/ponytail-review` e `/check review`  
**Spec principal:** `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`, Revisão 3  
**Objeto:** alterações não commitadas da árvore local  
**Veredito:** REPROVADO

## O que a mudança faz

A mudança alinha as provas da MD 0002 à composição Cambridge aceita na Revisão 3 da spec 0010. Ela também torna o avaliador mais estrito, diferencia os dados das fixtures e reativa suítes Playwright antes ignoradas.

## Resultado do gate

A autoridade `scripts/check-decision.mjs` devolveu:

| Estado       | Total |
| ------------ | ----: |
| PASS         |     0 |
| FAIL         |     0 |
| UNVERIFIABLE |    10 |
| BLOCKER      |     3 |
| WARNING      |     2 |

Os dez critérios `layout-editorial/AC-01` a `layout-editorial/AC-10` permanecem `UNVERIFIABLE`, pois esta revisão não executou a aplicação e o Playwright real. O relatório anterior de 16:21 foi usado somente como prova do bloqueio já registrado, não como aprovação desta árvore.

## Achados obrigatórios

### 1. BLOCKER: o manifesto contradiz o escopo reaberto

`docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md` marca a feature I como `in-progress`, mas `workflow/check-targets.json` continua exigindo somente a baseline MD 0002.

Caso concreto: `node scripts/check-targets.mjs` termina com código 1 e informa `Manifesto difere das specs exigidas pelo escopo.` O check gate para antes de avaliar as provas.

Correção mínima: incluir a spec 0010 no manifesto e produzir sua avaliação própria. Não retornar a feature para `done` enquanto a verificação formal estiver pendente.

### 2. BLOCKER: as provas de preview reativadas usam o contrato antigo

`playwright.config.ts` volta a selecionar `e2e/verify-md0002-tarefa8.spec.ts`, e `scripts/ci-assess.mjs` torna dez casos dessa suíte obrigatórios para `md-0002/AC-08`.

Caso concreto: a suíte exige cookie `sb-*` depois de `loginPreview` e altera claims Supabase para revogar acesso. A implementação vigente em `app/api/preview/route.ts` usa o cookie de preview e a sessão persistida pelo mecanismo atual. Assim, uma aplicação correta conforme a spec vigente pode reprovar a suíte antiga.

Correção mínima: atualizar a suíte para o contrato atual de preview, incluindo emissão, expiração, persistência e revogação. Não restaurar o mecanismo antigo para satisfazer o teste.

### 3. BLOCKER: a prova da home aprova artigos fora de ordem

`e2e/verify-md0002-tarefa4.spec.ts` confere contagens e procura cada artigo pelo `href`, mas não compara a sequência renderizada com as fatias ordenadas do banco.

Caso concreto: inverter os quatro destaques, as quatro últimas leituras ou os dezesseis recentes mantém todas as novas asserções verdes. Mesmo assim, `scripts/ci-assess.mjs` concede PASS ao AC-01 usando esse caso.

Correção mínima: comparar a sequência de links de cada seção com os slugs esperados na ordem retornada pelo banco. Exigir essa prova para AC-01.

## Achados recomendados

### 4. WARNING: a prova de autoria aceita ausência e duplicação

Em `e2e/verify-md0002-tarefa5.spec.ts`, `findIndex` retorna `-1` quando a autoria não existe. A comparação da capa com esse valor ainda passa. Uma segunda assinatura depois das fontes também não é detectada. A prova da home não consulta nem compara `author_name`, embora a spec 0010 exija autoria nas variantes.

Correção mínima: exigir exatamente uma autoria com o valor esperado e verificar sua posição. Incluir `author_name` na comparação dos cards.

### 5. WARNING: as mutações da home não controlam o ISR

Os testes de vazio e falha alteram o banco ou proxy e navegam imediatamente para `/`. A home usa `revalidate = 300` e a CI executa uma build de produção.

Caso concreto: uma home já materializada pode continuar exibindo a resposta anterior por cinco minutos, sem observar a mutação feita pelo teste.

Correção mínima: preparar cada estado antes da primeira renderização daquela instância ou invalidar o cache apenas no ambiente descartável. Não desligar o ISR de produção.

## Razões da autoridade

1. AC sem PASS: layout-editorial/AC-01
2. AC sem PASS: layout-editorial/AC-02
3. AC sem PASS: layout-editorial/AC-03
4. AC sem PASS: layout-editorial/AC-04
5. AC sem PASS: layout-editorial/AC-05
6. AC sem PASS: layout-editorial/AC-06
7. AC sem PASS: layout-editorial/AC-07
8. AC sem PASS: layout-editorial/AC-08
9. AC sem PASS: layout-editorial/AC-09
10. AC sem PASS: layout-editorial/AC-10
11. BLOCKER: O manifesto não inclui a spec 0010 que o escopo reabriu como in-progress.
12. BLOCKER: As provas de preview reativadas ainda exigem contratos antigos incompatíveis com a implementação vigente.
13. BLOCKER: A prova da home permite aprovar seções com artigos fora da ordem por recência.

## Validações executadas

- `node scripts/check-targets.mjs`: FAIL, manifesto divergente do escopo.
- `node scripts/check-decision.mjs`: REPROVADO, 10 UNVERIFIABLE, 3 BLOCKERs e 2 WARNINGs.
- Vitest focado e descoberta Playwright: não executados. O pnpm recusou preparar a versão 12.5.1 porque não conseguiu verificar a assinatura pelo registro restrito.
- Build, servidor, banco e Playwright real: não executados neste modo de revisão.

## Veredito Ponytail

Corrigir os achados 1, 2 e 3 antes de solicitar nova revisão. Os achados 4 e 5 devem ser resolvidos junto da mesma correção, pois afetam a confiabilidade das evidências.

Não foi encontrada nova dependência nem abstração dispensável neste diff. A correção deve permanecer nos testes, no avaliador e no manifesto, sem mudar a aplicação para satisfazer provas antigas.
