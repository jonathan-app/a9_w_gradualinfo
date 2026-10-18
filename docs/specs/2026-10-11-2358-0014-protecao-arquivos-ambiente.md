# 0014. Proteção de arquivos de ambiente no Git

**Date**: 2026-10-11  
**Status**: Accepted  
**Decision source**: o proprietário confirmou em 2026-10-11 a decisão já adotada, forneceu sua justificativa e limites, e aceitou o texto completo desta spec em 2026-10-12. Nenhuma comparação formal de alternativas foi comprovada.

## Summary

Você mantém os valores reais em arquivos locais. O Git ignora esses arquivos e o commit verifica o índice antes de aceitar mudanças. O modelo `.env.example` pode ser versionado quando contém apenas nomes e valores fictícios.

## Context

Arquivos `.env*` e `.dev.vars*` podem conter credenciais do Next.js, do Wrangler e de serviços externos. O `.gitignore` impede uma inclusão comum, mas não remove arquivos já rastreados e não impede `git add -f`. Um hook local pode não executar em todos os fluxos. O projeto já usa um scanner de segredos na CI.

## Requirements

- **env-protection/AC-01**: `.env`, `.env.*`, `*.env`, `*.env.*`, `.dev.vars*` e suas variantes em subpastas são ignorados pelo Git. `.env.example` permanece versionável.
- **env-protection/AC-02**: O verificador detecta arquivos de ambiente privados já rastreados ou preparados para commit, inclusive após `git add -f`, e retorna código diferente de zero. O resultado não imprime valores dos arquivos.
- **env-protection/AC-03**: O hook de commit executa o verificador antes das demais etapas e interrompe o commit quando encontra um caminho proibido.
- **env-protection/AC-04**: Falha ao consultar o índice Git reprova a verificação. Uma falha de comando não pode produzir PASS por lista vazia.
- **env-protection/AC-05**: `.env.example` contém apenas nomes, valores vazios ou exemplos fictícios. O scan de segredos do projeto também verifica esse arquivo e o histórico; um PASS do verificador de caminhos não substitui esse scan.

## Decision

**Chosen option**: regras de exclusão no `.gitignore`, verificador de caminhos no índice e hook de commit, com scanner de segredos na CI. Esta combinação registra a decisão adotada pelo proprietário. Ela não altera o mecanismo de carga de ambiente do Next.js ou do Worker.

**Implementation skills**: `/develop` para ajustes no verificador, `/test` para cenários de regressão, `/check` para prova empírica e `/sync` para contexto durável.

## Rationale

As regras evitam a inclusão acidental comum. A verificação do índice cria uma segunda barreira para arquivos já rastreados ou adicionados à força. O scanner cobre conteúdo e histórico, que o verificador de nomes não consegue avaliar. O proprietário aceitou que hooks locais podem ser contornados e que um vazamento anterior exige resposta própria, inclusive rotação de credenciais quando aplicável.

## Standard definition

**Canonical pattern**: valores reais ficam em `.env.local`, `.dev.vars` ou bindings privados do Worker. Somente `.env.example` sem credenciais entra no Git. Antes de cada commit, `scripts/check-env-leak.mjs` consulta o índice Git e bloqueia caminhos privados. A CI executa `pnpm security:secrets` sobre a árvore e o histórico.

**Replaces**: confiar apenas no `.gitignore`, confiar apenas em revisão manual, ou tratar `git add -f` como exceção segura.

**Enforcement**: `.gitignore`, `.husky/pre-commit`, `scripts/check-env-leak.mjs` e o job de segredos da CI em `.github/workflows/ci.yml`. O verificador falha fechado se não conseguir ler o índice.

**Rollout**: padrão imediato para arquivos novos e existentes. Se um arquivo privado já estiver rastreado, remover do índice sem apagar a cópia local e avaliar o histórico em uma ação separada.

**Exceptions**: somente arquivos de modelo sem credenciais, como `.env.example`. A exceção depende de scan de conteúdo e não autoriza valores reais.

## Consequences

**Positive**: dois controles locais reduzem o risco de inclusão acidental; a CI amplia a verificação para conteúdo e histórico.

**Negative**: as regras precisam acompanhar novos nomes de arquivo. Hooks locais podem ser desativados ou não instalados. O scanner pode exigir investigação de achados.

**Neutral**: o padrão não remove segredos de commits antigos e não gira credenciais. Essas ações exigem tratamento próprio quando houver evidência de exposição.

## Follow-up

1. `/develop` deve fechar a falha de consulta Git que hoje pode retornar PASS e acrescentar prova do comportamento.
2. `/check verify` deve repetir a validação da spec inteira no estado final da árvore e registrar a saída de `scripts/check-decision.mjs`.
