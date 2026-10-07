# 0004. Gate mecânico vinculado à revisão

**Date**: 2026-10-07
**Status**: Accepted
**Decision source**: sinal verde do dono para executar plano-atualizacao-auditoria.md em 2026-10-07, incluindo as recomendações apresentadas de JSON vinculado ao SHA, conjunto exato de ACs e Markdown somente histórico.

## Summary

O gate compara resultados completos com a spec e a revisão que realmente
foi testada. Um booleano de aprovação não substitui esses resultados.
Aprovação humana e autorização de publicação permanecem separadas.

## Context

O gate atual confere o SHA recebido na linha de comando, não o do artefato.
O resultado pode omitir ACs e ainda obter aprovação. Artefatos gerados devem
ficar fora da árvore avaliada para evitar que sua inclusão altere a revisão.

## Requirements

- **gate/AC-01**: sem artefato, com JSON inválido ou schema incompleto, sair com erro.
- **gate/AC-02**: commit completo, árvore Git e hash da spec registrados no artefato devem coincidir com o checkout testado e a spec Accepted indicada pelo operador, nunca escolhida pelo artefato.
- **gate/AC-03**: IDs de resultados são exatamente os IDs da seção Requirements da spec, sem faltas, extras ou duplicatas. Status exige PASS, evidência existente e hash correto. FAIL, UNVERIFIABLE, BLOCKER e dados malformados rejeitam.
- **gate/AC-04**: gate recalcula decisão; approved=true adulterado ou contagens inconsistentes não desbloqueiam. Formato Markdown é histórico e não autoriza CI.
- **gate/AC-05**: CI prepara banco e fixtures no próprio runner E2E, executa tipos E2E e servidor compilado, além de scans locais e preservação de evidências. Aprovação mecânica não concede merge/deploy.

## Options considered

Manter booleano legado permite compatibilidade, mas perde a prova de completude.
Resultados estruturados e decisão recalculada exigem migração dos testes e
relatórios, mas verificam o contrato solicitado pelo plano.

## Decision

Adotar schemaVersion=1, evaluatedCommit (40 hex), evaluatedTree (40 hex),
spec com path e sha256, acs e findings. Cada AC contém id, status, evidence
(caminho), evidenceSha256 e note opcional. A saída da decisão preserva esses
campos e acrescenta approved, verdict, counts e reasons. Gate exige que a
saída declarada corresponda à decisão recalculada, HEAD e HEAD^{tree}, e
recusa árvore suja. Evidências e artefatos de execução ficam no runner temp,
fora da árvore, ou são históricos já versionados da revisão avaliada.

## Feature design

| Valor                 | Fonte                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| Spec esperada         | --spec passado pelo operador/CI, default md-0002                      |
| IDs esperados         | ACs únicos na seção Requirements da spec Accepted                     |
| Hash esperado da spec | SHA-256 dos bytes do arquivo no checkout                              |
| Commit esperado       | git rev-parse HEAD, comparado com --commit completo e evaluatedCommit |
| Árvore esperada       | git rev-parse HEAD^{tree}, comparada com evaluatedTree                |
| Prova de AC           | arquivo apontado em evidence e SHA-256 conferido                      |
| Aprovação mecânica    | decisão recalculada dos resultados e findings                         |
| Aprovação humana      | revisão do dono, fora deste JSON e sem inferência por PASS            |

Nenhuma spec ou evidência ausente recebe fallback. Uma spec com ACs vazios,
duplicados ou sem Accepted reprova. Campos com tipos incorretos reprovam,
sem exceção que encerre com sucesso. Fixtures de preview usam segredos
aleatórios distintos e três contas, geradas somente na stack descartável.
Configuração de produção não é sobrescrita por esse provisionamento.

## Build plan

1. Compartilhar validador estrito entre decisão e gate, satisfaz AC-01 a AC-04.
2. Criar negativos com repositórios descartáveis e mudança de revisão real, satisfaz AC-01 a AC-04.
3. Ajustar CI, banco/fixtures, servidor, tipos e scanners, satisfaz AC-05.

## Consequences

Relatórios incompletos e Markdown deixam de desbloquear entregas; são
preservados como histórico. A CI pode permanecer reprovada até /check gerar
resultados completos para a revisão avaliada. Isso não é aprovação editorial
nem atestação criptográfica da autoria do revisor.

## Rationale

O conjunto exato deriva do contrato versionado, e a revisão deriva de Git.
Assim a origem desses valores não depende do artefato que pede aprovação.
