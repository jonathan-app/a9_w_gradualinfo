# 0029. Harmonizacao de seguranca entre gitignore e gitattributes

**Date**: 2026-10-18  
**Status**: Accepted  
**Decision source**: Recomendacao tecnica do /architect para protecao integrada de segredos e residuos

## Summary

Esta decisao formaliza a harmonizacao de regras de exclusao entre o .gitignore e o .gitattributes no repositorio GradualInfo. Enquanto o .gitattributes estabelece protecao para pacotes de distribuicao gerados por git archive, o .gitignore e a primeira barreira que impede que arquivos locais de sessao de teste, capturas de rede, copias de banco de dados e residuos de edicao sejam acidentalmente versionados no Git.

## Context

A auditoria integrada entre .gitattributes e .gitignore comprovou que o .gitattributes recebeu uma atualizacao consistente com 117 linhas de regras. No entanto, padroes criticos contemplados no .gitattributes ainda nao possuiam correspondencia no .gitignore:

1. Arquivos de autenticacao de teste e sessao: rotinas de Playwright ou testes locais podem salvar arquivos como auth-storage-state.json ou traces de rede em formato HAR (*.har). Se esses arquivos forem gerados e o .gitignore nao os cobrir, um comando git add desatento pode versionar cookies ou cabecalhos de autorizacao reais.
2. Residuos temporarios de mesclagem e edicao: arquivos de backup gerados por ferramentas de diff (*.orig, *.bak, *.backup, *.rej, *~) poluem a arvore e arriscam expor versoes intermediarias de codigo.
3. Bancos de dados e despejos locais: arquivos com extensoes *.sqlite, *.sqlite3, *.db, *.dump e *.sql.gz pertencem a operacoes locais de desenvolvimento e jamais devem ser comitados.

Comprovamos via git ls-files que atualmente nenhum arquivo ignorado esta indevidamente rastreado no indice do Git. Esta decisao fecha a janela preventiva antes que qualquer residuo venha a ser criado.

## Requirements

**User stories**:

- Como engenheiro de seguranca, quero que sessoes de teste, capturas HAR e estados de autenticacao local sejam ignorados tanto no versionamento Git quanto nas exportacoes.
- Como desenvolvedor do projeto, quero ter garantia de que arquivos de backup temporarios e residuos de rebase nao aparecam como alteracoes pendentes no git status.
- Como mantenedor do repositorio, quero assegurar que o script de sincronizacao de gitattributes e os comandos de export continuem operando perfeitamente.

**Acceptance criteria**:

- **sec-guard/AC-01**: Atualizacao do .gitignore para incluir padroes de sessao e testes (_storage-state_.json, _playwright-auth_.json, *.har), prevenindo vazamento de cookies e credenciais transitorias.
- **sec-guard/AC-02**: Atualizacao do .gitignore para incluir padroes de arquivos temporarios e de backup (*.bak, *.backup, *.orig, *.rej, *~, Thumbs.db).
- **sec-guard/AC-03**: Atualizacao do .gitignore para incluir padroes de bases de dados locais e despejos (*.sqlite, *.sqlite3, *.db, *.dump, *.sql.gz).
- **sec-guard/AC-04**: Verificacao do indice Git via comando nativo comprovando que zero arquivos rastreados entram em conflito com as regras atualizadas.
- **sec-guard/AC-05**: Execucao com sucesso do script de exportacao scripts/export-template.mjs e aprovacao do portao pnpm security:all com 0 segredos no Gitleaks e 0 erros no Semgrep.

## Options considered

### Option 1: Harmonizacao direta no .gitignore em secoes comentadas (Recomendada)

Adicionar as categorias especificas de sessoes locais, dados de teste, backups e bancos locais ao .gitignore existente, alinhando o arquivo com o .gitattributes.

**Pros**:

- Protecao em camadas: o arquivo fica protegido contra git add local e contra git archive na exportacao.
- Nenhuma dependência externa nova.
- Zero impacto nas rotinas de desenvolvimento e nos testes existentes.

**Cons**:

- Exige registrar a spec e atualizar o indice.

### Option 2: Confiar exclusivamente no .gitattributes

Manter apenas o .gitattributes atualizado e nao alterar o .gitignore.

**Pros**:

- Nao altera o arquivo .gitignore.

**Cons**:

- Deixa uma brecha grave aberta: git archive exclui o arquivo no zip, mas o desenvolvedor ainda pode comitar um arquivo *.har ou storage-state.json no GitHub por engano.

## Build plan

1. Adicionar as regras de protecao de sessoes, backups e bancos locais em .gitignore (AC-01, AC-02, AC-03).
2. Validar que nenhum arquivo rastreado esta em conflito com o novo conjunto de regras (AC-04).
3. Testar o empacotamento via scripts/export-template.mjs e o portao de seguranca com pnpm security:all (AC-05).
