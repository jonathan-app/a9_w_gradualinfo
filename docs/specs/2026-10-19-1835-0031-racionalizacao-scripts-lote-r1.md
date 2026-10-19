# 0031. Racionalizacao de scripts operacionais (Lote R1, Fase I)

**Date**: 2026-10-19  
**Status**: Accepted  
**Decision source**: Aprovado pelo usuario em 2026-10-19 (comando /ponytail full /develop)

## Summary

Esta especificacao define a primeira fase da limpeza e racionalizacao de scripts operacionais na pasta scripts/, com base no inventario detalhado do Lote R1. Vamos remover com seguranca dois scripts orfaos de risco comprovadamente nulo (client-preflight.mjs e verify-test-draft.py) e converter a regra de checagem de paridade de verify-editorial-parity.mjs em uma suite de teste unitario dedicada no Vitest antes de sua exclusao. Todos os 33 scripts criticos de seguranca, integracao continua e suporte operacional continuam rigorosamente protegidos e intactos.

## Context

A auditoria completa realizada em docs/audits/2026-10-19-1145-inventario-scripts-lote-r1.md catalogou todos os 46 scripts do repositorio, classificando 17 no Grupo A (criticos para CI e seguranca), 16 no Grupo B (operacionais ativos) e 13 no Grupo C (candidatos a simplificacao ou remocao).

Entre os scripts do Grupo C, identificamos scripts herdados de templates anteriores que nao possuem mais utilidade. O script client-preflight.mjs possui 272 linhas e referencia pastas como src/config/ que sequer existem no projeto atual. O script verify-test-draft.py contem 133 linhas em Python com uma lista fixa de rotas de producao que ja sao testadas pelas suites E2E do Playwright.

Por sua vez, verify-editorial-parity.mjs possui uma regra de negocio valida, que e conferir se cada artigo em docs/rascunhos-editoriais corresponde aos dados em lib/editorial/local-posts.json. No entanto, hoje ele e um script manual avulso que nao roda na CI. Converter essa regra para teste unitario Vitest traz essa garantia para o portao automatizado do projeto, permitindo aposentar o script avulso sem perda de qualidade.

## Requirements

**User stories**:

- Como engenheiro mantenedor do GradualInfo, quero eliminar scripts obsoletos da pasta scripts/ para reduzir codigo morto e evitar confusoes sobre ferramentas ativas.
- Como desenvolvedor editorial, quero que a integridade dos artigos locais seja verificada automaticamente nos testes unitarios para garantir que nenhum rascunho seja publicado com campos divergentes.

**Acceptance criteria**:

- **script-clean/AC-01**: Os scripts scripts/client-preflight.mjs e scripts/verify-test-draft.py sao removidos do repositorio, comprovando ausencia de chamadores em package.json, workflows da CI e ganchos do Git.
- **script-clean/AC-02**: A suite de testes unitarios **tests**/unit/editorial-parity.test.ts e criada, validando que todos os arquivos Markdown presentes em docs/rascunhos-editoriais possuem entrada correspondente e valida em lib/editorial/local-posts.json (verificando slug, titulo, resumo e data).
- **script-clean/AC-03**: O script scripts/verify-editorial-parity.mjs e removido apos a suite unitaria do Vitest comprovar execucao com sucesso.
- **script-clean/AC-04**: A suite geral de testes unitarios permanece 100 por cento aprovada com a adicao dos novos testes (869 testes anteriores mais os novos testes de paridade) e o portao consolidado pnpm check:all e concluido com zero erros (typecheck, lint, prettier, gitleaks e semgrep).
- **script-clean/AC-05**: Todos os 33 scripts dos Grupos A e B permanecem intocados, e as ferramentas de migracao para o Sanity (seed-sanity-drafts.py e publish-sanity-drafts.py) permanecem preservadas para a futura transicao editorial.

## Options considered

### Opcao 1: Remocao em massa de todos os 13 scripts do Grupo C

Esta abordagem removeria de uma so vez todas as ferramentas pontuais, visuais e scripts Python do Grupo C.

**Pros**:

- Elimina cerca de 3.000 linhas de codigo de uma so vez.
- Limpa rapidamente a listagem de arquivos da pasta scripts/.

**Cons**:

- Risco de perder ferramentas de migracao necessarias para o Sanity (seed-sanity-drafts.py e publish-sanity-drafts.py).
- Perda da validacao de paridade editorial de verify-editorial-parity.mjs sem criar substituto equivalente.

### Opcao 2: Fase I cirurgica com teste automatizado no Vitest (Escolhida)

Remover apenas os scripts de risco nulo comprovado e converter a regra util de verify-editorial-parity.mjs em teste unitario antes da exclusao.

**Pros**:

- Risco nulo de quebra de fluxos em producao ou desenvolvimento.
- Transforma uma checagem manual avulsa em teste automatizado executado na CI e no pre-push.
- Preserva intactos os semeadores do Sanity e as ferramentas criticas.

**Cons**:

- Exige criacao previa da suite de teste no Vitest antes de apagar o script.

### Opcao 3: Manter todos os scripts intactos e apenas documentar o desuso

Nenhum arquivo seria deletado, apenas marcando em documentacao que estao em desuso.

**Pros**:

- Zero alteracao no sistema de arquivos.

**Cons**:

- Mantem 13 scripts inativos poluindo a pasta de utilitarios.
- Nao resolve a divida tecnica identificada na auditoria.

## Decision

**Chosen option**: Opcao 2: Fase I cirurgica com teste automatizado no Vitest

Esta decisao formaliza a remocao de scripts comprovadamente orfaos e a absorcao da regra de paridade editorial pela suite oficial de testes unitarios.

**Implementation skills**: `ponytail` (DietrichGebert/ponytail, .agents/skills/ponytail/)

## Rationale

A opcao 2 atende perfeitamente ao principio Ponytail (menor diferenca funcional completa com maximo reuso e risco zero). Nao faz sentido manter client-preflight.mjs, que referencia pastas inexistentes de outro projeto, nem verify-test-draft.py, cuja checagem de URLs ja e realizada com muito mais profundidade pelos testes E2E do Playwright.

Alem disso, absorver a logica de verify-editorial-parity.mjs para o Vitest fortalece a qualidade do projeto, pois o teste passa a rodar a cada commit e execucao de pnpm check:all, algo que o script esquecido na pasta scripts/ nao fazia.

## Feature design

**Superficie de arquivos e remocoes**:

| Arquivo                                 | Acao    | Motivo e Destino                                                          |
| --------------------------------------- | ------- | ------------------------------------------------------------------------- |
| scripts/client-preflight.mjs            | Deletar | Codigo morto herdado com caminhos inexistentes (272 linhas).              |
| scripts/verify-test-draft.py            | Deletar | Script avulso em Python suplantado por testes Playwright (133 linhas).    |
| scripts/verify-editorial-parity.mjs     | Deletar | Logica convertida para **tests**/unit/editorial-parity.test.ts.           |
| **tests**/unit/editorial-parity.test.ts | Criar   | Suite Vitest que valida paridade entre Markdown local e local-posts.json. |

**Invariantes de protecao**:

- Nenhum script listado no package.json sera quebrado ou removido.
- Os ganchos do Git (.husky/pre-commit e .husky/pre-push) nao sao alterados.
- As rotinas de seguranca (run-gitleaks.mjs, run-semgrep.mjs e check-env-leak.mjs) permanecem totalmente intocadas.
- Os scripts de migracao de rascunhos para o Sanity (seed-sanity-drafts.py e publish-sanity-drafts.py) permanecem preservados.

**Cenarios criticos de teste**:

- Validacao da remocao de scripts: confirmacao de que os arquivos deletados nao existem mais e que nenhum comando do package.json falha, verificando **script-clean/AC-01** e **script-clean/AC-03**.
- Validacao de paridade editorial: execucao da nova suite **tests**/unit/editorial-parity.test.ts com passagem de todos os testes, verificando **script-clean/AC-02**.
- Integridade do portao geral: execucao completa de pnpm check:all aprovando testes, tipos, lint, formatacao e seguranca, verificando **script-clean/AC-04** e **script-clean/AC-05**.

## Build plan

1. Criar a suite de testes unitarios **tests**/unit/editorial-parity.test.ts replicando e aprimorando as verificacoes de integridade de metadados dos artigos locais, satisfaz **script-clean/AC-02**
2. Executar a nova suite com pnpm vitest run **tests**/unit/editorial-parity.test.ts e assegurar que passa com sucesso, satisfaz **script-clean/AC-02**
3. Remover com seguranca os arquivos scripts/client-preflight.mjs e scripts/verify-test-draft.py, satisfaz **script-clean/AC-01**
4. Remover com seguranca o arquivo scripts/verify-editorial-parity.mjs, satisfaz **script-clean/AC-03**
5. Executar o portao de qualidade consolidado pnpm check:all e atestar conformidade plena, satisfaz **script-clean/AC-04**, **script-clean/AC-05**

## Consequences

**Positive**:

- Eliminacao de 719 linhas de codigo morto e scripts avulsos nao rastreados.
- Regra de validacao de integridade editorial passa a rodar automaticamente na CI e no pre-push.
- Menor poluicao visual e menor esforco cognitivo ao navegar pela pasta scripts/.

**Negative / tradeoffs**:

- Nenhum efeito colateral negativo identificado.

**Neutral**:

- Os outros scripts candidatos a remocao do Grupo C (como arneses visuais historicos) permanecem inalterados para avaliacao em lotes posteriores.

## Follow-up

- [ ] Avaliar em especificacao futura a descontinuacao dos 3 arneses de captura visual historica (Spec 0013 e Spec 0020).
