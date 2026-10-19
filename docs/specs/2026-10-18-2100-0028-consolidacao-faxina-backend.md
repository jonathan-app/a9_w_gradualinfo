# 0028. Verificacao final contra linha de base e consolidacao da faxina de backend (Lote L5)

**Date**: 2026-10-18  
**Status**: Accepted  
**Decision source**: Aprovado pelo proprietario no chat em 2026-10-18 ao invocar /develop

## Summary

Esta decisao formaliza o contrato de verificacao final, medicao comparativa contra a linha de base e consolidacao do encerramento da faxina de backend do portal GradualInfo (Lote L5 de docs/scope/2026-10-18-1400-faxina-backend.md). Ela estabelece os criterios objetivos para aprovar a conclusao de todos os 6 lotes (L0 a L5), garantindo aprovacao integral de todos os portoes de qualidade locais, protecao absoluta do banco de dados e emissao do relatorio de consolidacao final.

## Context

Ao longo da execucao da faxina de backend iniciada em 18 de outubro de 2026, cinco etapas foram concluidas com exito:

1. Lote L0 (Inventario e Protecao): mapeamento exaustivo em docs/audits/2026-10-18-1420-inventario-faxina-backend-l0.md de 18 rotas, 40 modulos em lib, 54 scripts, 83 suites e 10 migrations, com 858 testes Vitest verdes.
2. Lote L1 (Residuos e Duplicacoes): remocao de testes duplicados na raiz de **tests** e eliminacao de bytecode orfao em scripts/**pycache**, com portao verde em 846 testes.
3. Lote L2 (Bibliotecas e Adaptadores, Spec 0025): unificacao de comparacao segura de assinaturas HMAC via safeCompareHexSignatures, isolamento de MemoryNonceCache e confirmacao de fail closed no storage.
4. Lote L3 (Rotas e Tratamento de Erros, Spec 0026): protecao de consumo de stream com limite de bytes via readLimitedTextBody, sanitizacao estrita de erros RPC do PostgreSQL sem exposicao de tabelas ou restricoes, e padronizacao de respostas de erro via apiErrorResponse. Portao verde com 859 testes em 83 suites.
5. Lote L4 (Testes, Scripts e Dependencias, Spec 0027): remocao cirurgica de 5 scripts legados de deploy manual em Python e testes orfaos (scripts/deploy-version.py, scripts/compare-versions.py, scripts/check-version-readonly.py, test_deploy_version.py, scripts/verify-spec-0016.mjs) totalizando 756 linhas deletadas, com 100 por cento dos testes e migrations preservados.

O Lote L5 representa o fecho de seguranca do ciclo. Ele garante que nenhuma regressao silenciosa ocorreu na totalidade da aplicacao antes de qualquer proposta de mesclagem na branch principal.

## Requirements

**User stories**:

- Como mantenedor do projeto, quero executar a totalidade dos portoes de qualidade locais e conferir a ausencia total de regressoes funcionais em rotas, servicos e componentes.
- Como administrador de banco de dados, quero comprovar a integridade fisica de todas as migrations e schemas locais via testes pgTAP no Supabase local.
- Como auditor de seguranca, quero certificar que nenhum segredo, credencial ou chave privada foi exposta no historico ou na arvore de trabalho durante toda a faxina.
- Como desenvolvedor do time, quero um relatorio de consolidacao datado sumarizando o antes e depois da faxina com metricas claras de reducao de divida tecnica.

**Acceptance criteria**:

- **consolidate-clean/AC-01**: Execucao exitosa e sem falhas do portao local pnpm check:all, com aprovacao de typecheck, lint do ESLint, formatacao do Prettier, 859 testes Vitest em 83 suites, zero segredos no Gitleaks e zero vulnerabilidades no Semgrep.
- **consolidate-clean/AC-02**: Execucao com sucesso da bateria completa de testes de banco de dados pgTAP local via pnpm supabase:test (171 testes em 6 suites), confirmando que RLS, RPCs, constraints e tabelas permanecem integralmente compativeis e sem desvios.
- **consolidate-clean/AC-03**: Verificacao estatica de segredos via pnpm security:secrets sobre toda a arvore do repositorio e historico recente, confirmando zero achados segundo as regras de .gitleaks.toml.
- **consolidate-clean/AC-04**: Validacao de compilacao de producao com pnpm build:next, atestando que todas as rotas e componentes compilam sem erros de resolucao de tipos ou imports quebrados.
- **consolidate-clean/AC-05**: Publicacao do relatorio formal de encerramento em docs/reviews/ ou docs/audits/ com carimbo de data e hora, documentando o inventario final comparado a linha de base do L0, total de linhas removidas, arquivos saneados e conformidade com os Criterios de Protecao Inviolaveis.

## Options considered

### Option 1: Bateria completa local de testes de unidade, banco e build (Recomendada)

Executar sequencialmente pnpm check:all, pnpm supabase:test, pnpm security:secrets e pnpm build:next, documentando as evidencias em relatorio datado e atualizando o escopo e o bastao canonicamente.

**Pros**:

- Valida todas as camadas do sistema sem executar mutacoes remotas em producao.
- Respeita os Criterios Inviolaveis do escopo e os principios Ponytail de senioridade com foco no essencial.
- Gera prova rastreavel e auditavel para futuros desenvolvedores e agentes.

**Cons**:

- Exige que o daemon local do Supabase esteja disponivel para os testes pgTAP (caso o container local esteja pausado, deve ser inicializado via pnpm supabase:start).

### Option 2: Verificacao parcial apenas com pnpm check:all

Executar apenas a suite Vitest e a analise estatica, dispensando os testes pgTAP e o build de producao.

**Pros**:

- Execucao mais rapida.

**Cons**:

- Nao comprova a compatibilidade das chamadas RPC e politicas RLS contra o PostgreSQL real.
- Viola a definicao de pronto (Done when) estipulada para o Lote L5 no escopo aprovado.

## Build plan

1. Executar o portao de qualidade local consolidado com pnpm check:all (AC-01).
2. Verificar o status da stack local do Supabase e rodar a suite de banco via pnpm supabase:test (AC-02).
3. Executar o scanner de segredos em pnpm security:secrets e a analise SAST em pnpm security:sast (AC-03).
4. Executar a verificacao de compilacao Next via pnpm build:next (AC-04).
5. Elaborar o relatorio de consolidacao final da faxina de backend e reconciliar docs/scope/2026-10-18-1400-faxina-backend.md, AGENTS.md e workflow/STATE.md (AC-05).
