# Scope: Faxina Conservadora e Desduplicacao do Backend

Plano ordenado para inventario, saneamento de residuos, organizacao de responsabilidades e eliminacao de duplicacoes no backend do GradualInfo antes da retomada da auditoria de seguranca.

**Build approach:** Tracer Bullet com remocao estritamente conservadora em camadas.  
**Workflow:** GA, profundidade de validacao rigorosa sem remocao sem evidencia previa.

As regras em AGENTS.md e docs/workflow/governance.md sao mandatorias. Migrations historicas, rotas ativas, testes de seguranca e configuracoes de agentes permanecem integralmente protegidos.

---

## At a glance

| #   | Lote | Objetivo                                                | Status |
| --- | ---- | ------------------------------------------------------- | ------ |
| 1   | L0   | Inventario exaustivo e protecao da linha de base        | done   |
| 2   | L1   | Residuos, imports mortos e duplicacoes comprovadas      | done   |
| 3   | L2   | Organizacao de bibliotecas, adaptadores e helpers       | done   |
| 4   | L3   | Uniformizacao de rotas, contratos e tratamento de erros | done   |
| 5   | L4   | Racionalizacao de testes, funcoes SQL e dependencias    | done   |
| 6   | L5   | Verificacao final contra linha de base e consolidacao   | done   |

---

## Lote L0: Inventario e Protecao

Mapeamento completo de todos os arquivos de backend (app/api, lib, scripts, **tests**, supabase), registro da linha de base de testes e verificacao de dependencias ativas.  
**Done when:** todo arquivo de backend esta catalogado com seu proposito conhecido, o estado do Git esta registrado e nenhuma alteracao de codigo ocorreu nesta etapa.

- [x] Inventariar estrutura e classificar arquivos de backend: `/audit` (relatorio em docs/audits/2026-10-18-1420-inventario-faxina-backend-l0.md)
- [x] Catalogar pontos de entrada e contratos das rotas em app/api (18 rotas mapeadas e classificadas)
- [x] Mapear utilitarios, adaptadores de storage e servicos em lib (40 modulos catalogados por dominio)
- [x] Listar scripts operacionais e de teste em scripts (54 scripts inventariados e residuos identificados)
- [x] Consolidar relatorio da linha de base de execucao e testes (858 testes Vitest verdes, 0 segredos, 0 erros SAST)

---

## Lote L1: Residuos e Duplicacoes Comprovadas

Remocao cirurgica de arquivos mortos, imports orfaos e scripts de teste obsoletos que nao possuem nenhuma referencia ativa no codigo ou na CI.  
**Done when:** cada arquivo ou import removido possui busca previa de referencias comprovando ausencia de uso direto, dinamico ou por configuracao.

- [x] Identificar e remover caches orfaos e artefatos descartaveis (scripts/**pycache** removido)
- [x] Limpar imports nao utilizados e variaveis mortas no backend (zero erros de lint e typecheck limpo)
- [x] Eliminar scripts utilitarios redundantes ou sem chamada comprovada (testes duplicados na raiz de **tests** removidos)
- [x] Confirmar que nenhum contrato externo ou rota foi afetado (pnpm check:all aprovado com 846 testes PASS)

---

## Lote L2: Organizacao de Bibliotecas e Adaptadores

Consolidar helpers duplicados, isolar adaptadores de teste dos de producao e unificar regras comuns de validacao e criptografia.  
**Done when:** funcoes utilitarias identicas estao unificadas em lib/utils ou modulos dedicados, adaptadores de memoria estao restritos a testes e as regras de negocio de ofertas estao desacopladas da camada de transporte.

- [x] Unificar helpers de formatacao e utilitarios dispersos (Spec 0025 Accepted)
- [x] Segregar adaptadores de storage (memoria, filesystem, r2) com fronteiras claras (fail closed garantido em storage-factory.ts)
- [x] Consolidar rotinas de validacao criptografica e autenticacao de webhooks (safeCompareHexSignatures compartilhado entre ingest-auth e webhook-auth)
- [x] Validar conformidade de tipos e integridade de chamadas (pnpm check:all 100 por cento verde com 846 testes PASS)
      Spec 0025 · code in lib/offers/ingest-auth.ts, lib/offers/webhook-auth.ts

---

## Lote L3: Rotas e Tratamento de Erros

Uniformizar validacao de entrada, sanitizacao de respostas HTTP e propagacao de erros sem vazar detalhes internos do banco de dados.  
**Done when:** cada endpoint em app/api possui tratamento previsivel de erros, limites claros de corpo e parametros, e respostas sanitizadas sem reduplicacao de boilerplate.

- [x] Design it (spec): `/architect rotas e tratamento de erros`
- [x] Build it: `/develop rotas e tratamento de erros`
  - [x] Leitura segura de streams com limite progressivo de bytes (AC-01)
  - [x] Sanitizacao de RPC e mensagens do PostgreSQL nas rotas de ofertas (AC-02)
  - [x] Helper tipado apiErrorResponse para envelopes uniformes (AC-03)
  - [x] Unificacao de guardas administrativos com requireAdminSession (AC-04)
- [x] Verify it: `/check verify rotas e tratamento de erros`
- [x] Review it: `/check review rotas e tratamento de erros`
- [x] Audit security: `/security rotas e tratamento de erros`
- [x] Test it: `/test rotas e tratamento de erros`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`
      Spec 0026 · code in app/api/, lib/utils/

---

## Lote L4: Testes, SQL e Dependencias

Revisar testes redundantes, consolidar fixtures repetidas, inspecionar funcoes SQL sem uso e revisar dependencias no package.json sem quebrar a cobertura de seguranca.  
**Done when:** a suite de testes roda rapida sem perda de cobertura nos 859 testes existentes, funcoes SQL e migrations permanecem intocadas e scripts legados sao removidos.

- [x] Design it (spec): `/architect racionalizacao de testes scripts e dependencias`
      Spec 0027 Accepted · `docs/specs/2026-10-18-1825-0027-racionalizacao-testes-scripts-dependencias.md`
- [x] Build it: `/develop racionalizacao de testes scripts e dependencias`
  - [x] Remocao dos scripts Python legados de deploy manual (AC-01)
  - [x] Remocao do script validador de migracao encerrada (AC-02)
  - [x] Blindagem e preservacao dos 859 testes Vitest em 83 suites (AC-03)
  - [x] Preservacao integral do historico de migrations em supabase/migrations (AC-04)
- [x] Verify it: `/check verify racionalizacao de testes scripts e dependencias`
- [x] Review it: `/check review racionalizacao de testes scripts e dependencias`
- [x] Audit security: `/security racionalizacao de testes scripts e dependencias`
- [x] Test it: `/test racionalizacao de testes scripts e dependencias`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`
      Spec 0027 · deleted scripts/deploy-version.py, scripts/compare-versions.py, scripts/check-version-readonly.py, test_deploy_version.py, scripts/verify-spec-0016.mjs

---

## Lote L5: Verificacao Final e Consolidacao

Execucao completa dos gates de qualidade locais (check:all, pgTAP, gitleaks, semgrep e e2e) e registro de mudancas e riscos no historico do projeto.  
**Done when:** todos os testes passam com exit 0, nenhum segredo foi exposto, a analise estatica esta limpa e o resultado esta documentado em docs/ e workflow/STATE.md.

- [x] Design it (spec): `/architect consolidacao da faxina de backend`
      Spec 0028 Accepted · `docs/specs/2026-10-18-2100-0028-consolidacao-faxina-backend.md`
- [x] Build it: `/develop consolidacao da faxina de backend`
  - [x] Executar portao pnpm check:all consolidado (AC-01)
  - [x] Executar testes de banco local pgTAP via pnpm supabase:test (AC-02)
  - [x] Executar pnpm security:secrets e pnpm security:sast (AC-03)
  - [x] Executar compilacao de producao via pnpm build:next (AC-04)
  - [x] Elaborar relatorio final da faxina e atualizar docs e estado (AC-05)
        Spec 0028 · report docs/audits/2026-10-18-2110-consolidacao-faxina-backend.md
- [x] Verify it: `/check verify consolidacao da faxina de backend`
- [x] Review it: `/check review consolidacao da faxina de backend`
- [x] Audit security: `/security consolidacao da faxina de backend`
- [x] Document it: `/document pr`
- [x] Sync it: `/sync`

---

## Criterios de Protecao Inviolaveis

1. Migrations historicas em supabase/migrations jamais sao alteradas ou removidas.
2. Nenhuma alteracao remota em Cloudflare, Supabase remoto ou R2.
3. Testes de seguranca e regressao nunca sao descartados por parecerem redundantes.
4. Codigo com utilidade incerta permanece no repositorio ate confirmacao explicita.
