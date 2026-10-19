# Inventario do Backend e Classificacao da Faxina (Lote L0)

Data: 2026-10-18T14:20:00-03:00  
Escopo correspondente: docs/scope/2026-10-18-1400-faxina-backend.md  
Modo de operacao: somente leitura, sem alteracao em codigo ou configuracoes de producao

---

## 1. Visao Geral e Estado da Linha de Base

Este inventario cumpre integralmente a etapa L0 da faxina do backend. O objetivo e mapear todas as pecas de backend do GradualInfo, classificar seus propositos e isolar com precisao o que e codigo de producao, teste, script utilitario e resíduo historico.

Nenhum arquivo de codigo foi alterado ou apagado durante esta rodada.

### Linha de Base Aprovada

- Typecheck TypeScript: limpo, zero erros (tsc --noEmit)
- Linter ESLint: limpo, zero avisos (eslint .)
- Formatacao Prettier: 100 por cento em conformidade (prettier --check .)
- Testes Vitest: 858 testes em 83 arquivos (100 por cento aprovados)
- Varredura de segredos (Gitleaks): 0 achados no historico e na arvore
- Analise estatica (Semgrep): 0 achados de erro

---

## 2. Inventario de Rotas (app/api)

Total de rotas mapeadas: 18 arquivos de endpoint.

| Rota                                                    | Metodos | Proposito                               | Autenticacao e Controles                       |
| ------------------------------------------------------- | ------- | --------------------------------------- | ---------------------------------------------- |
| app/api/admin/auth/login/route.ts                       | POST    | Login do administrador unico            | Rate limit DO, Cloudflare Access, GoTrue local |
| app/api/admin/auth/logout/route.ts                      | POST    | Encerramento de sessao administrativa   | Limpeza de cookies de sessao Supabase          |
| app/api/admin/auth/mfa/enroll/route.ts                  | POST    | Inicio do pareamento TOTP do admin      | Sessao AAL1, geracao de segredo e URI QR code  |
| app/api/admin/auth/mfa/verify/route.ts                  | POST    | Conclusao e elevacao para AAL2          | Desafio TOTP de 6 digitos                      |
| app/api/admin/auth/recovery/route.ts                    | POST    | Disparo de recuperacao de credenciais   | Rate limit e geracao de link com tempo curto   |
| app/api/admin/auth/recovery/callback/route.ts           | GET     | Validacao de token de recuperacao       | Troca por sessao de redefinicao                |
| app/api/admin/auth/recovery/update-password/route.ts    | POST    | Atualizacao de senha pos recuperacao    | Sessao autenticada de recuperacao              |
| app/api/admin/dashboard/health/route.ts                 | GET     | Indicadores de saude operacional        | Sessao AAL2 obrigatoria                        |
| app/api/admin/dashboard/rotinas/refresh-health/route.ts | POST    | Execucao de probe de saude sob demanda  | Sessao AAL2 obrigatoria                        |
| app/api/admin/evidencias/[hash]/route.ts                | GET     | Leitura de prova probatoria WORM        | Sessao AAL2 obrigatoria                        |
| app/api/admin/ofertas/[id]/avaliar-selo/route.ts        | POST    | Avaliacao de precos e concessao de selo | Sessao AAL2 ou webhook assinado (Spec 0017)    |
| app/api/admin/preview/route.ts                          | POST    | Emissao de sessao de preview editorial  | Sessao administrativa e Durable Object         |
| app/api/health/route.ts                                 | GET     | Healthcheck publico do portal           | Acesso publico, sem segredos                   |
| app/api/ingest/ofertas/route.ts                         | POST    | Ingestao de precos por coletores        | Assinatura HMAC previa, nonces SQL atômicos    |
| app/api/ofertas/route.ts                                | GET     | Catalogo publico de ofertas ativas      | Leitura publica sanitizada com limit e offset  |
| app/api/out/[id]/route.ts                               | GET     | Redirecionamento seguro de afiliados    | Validacao de allowlist de dominios e HTTP 410  |
| app/api/preview/logout/route.ts                         | POST    | Revogacao de preview editorial          | Revogacao forte no Durable Object              |
| app/api/preview/route.ts                                | GET     | Validacao de token e cookie de preview  | Validacao criptografica de concessao           |

---

## 3. Inventario de Bibliotecas e Servicos (lib)

Total de modulos mapeados: 40 arquivos de codigo TypeScript.

### Dominio Administrativo e Autenticacao (lib/admin)

- lib/admin/access-guard.ts: guard de perimetro para Cloudflare Access
- lib/admin/access.ts: validacao JWT das credenciais de admissao do Access
- lib/admin/access-worker.ts: injecao do header de autorizacao no contexto do Worker
- lib/admin/auth.ts: checagem estrita de ADMIN_USER_ID e sessao AAL2
- lib/admin/rate-limit-do.ts: implementacao do Durable Object para taxa limite
- lib/admin/rate-limit-protocol.ts: contrato tipado e codigos de rate limit
- lib/admin/rate-limit.ts: cliente para invocacao do rate limit no middleware
- lib/admin/session-response.ts: utilitario de resposta HTTP com cookies seguros

### Dominio de Ofertas e Persistencia (lib/offers)

- lib/offers/coupon-validation.ts: regras de negocio e elegibilidade de cupons
- lib/offers/evidence-canonicalizer.ts: serializacao canonica JSON RFC 8785
- lib/offers/ingest-auth.ts: autenticacao HMAC da rota de ingestao dedicada (Spec 0021)
- lib/offers/outlier-classifier.ts: deteccao e classificacao de anomalias de precos
- lib/offers/service-client.ts: cliente Supabase com credencial restrita server-only
- lib/offers/shipping-validation.ts: regras de validacao de frete e catalogo de excecoes
- lib/offers/variant-validation.ts: validacao de compatibilidade de variantes e SKUs
- lib/offers/verified-price-pipeline.ts: orquestracao do pipeline de preco verificado
- lib/offers/webhook-auth.ts: autenticacao HMAC anterior com cache de memoria (Spec 0017)
- lib/offers/storage/evidence-storage-adapter.ts: interface comum dos adaptadores probatorios
- lib/offers/storage/filesystem-adapter.ts: adaptador duravel para disco local
- lib/offers/storage/memory-adapter.ts: adaptador efemero restrito a testes unitarios
- lib/offers/storage/r2-adapter.ts: adaptador com criacao atomica para Cloudflare R2
- lib/offers/storage/storage-factory.ts: fabrica de resolucao fail closed com trava WORM

### Dominio Editorial e Integracoes (lib/editorial, lib/sanity, lib/preview, lib/seo, lib/services)

- lib/editorial/local-mode.ts: verificacao de ambiente local exclusivo
- lib/editorial/local-posts.ts: leitura tipada do catalogo local de rascunhos
- lib/editorial/local-posts.json: base JSON de artigos rascunhados localmente
- lib/editorial/reading.ts: calculo do tempo de leitura e extracao de texto
- lib/sanity/client.ts: cliente GROQ e leitura editorial da fonte primária
- lib/preview/auth.ts: verificacao de integridade e assinatura do cookie de preview
- lib/preview/config.ts: constantes e tempos de expiracao do preview
- lib/preview/durable-object.ts: armazenamento persistente das sessoes de preview
- lib/preview/session.ts: manipulacao de concessao de preview
- lib/seo/sitemap.ts: construcao do indice e rotas de sitemap por editoria
- lib/seo/structured-data.ts: esquemas JSON-LD sem quebra de script
- lib/services/commercial-dashboard.ts: agregacao de dados para o painel de ofertas
- lib/services/editorial-dashboard.ts: agregacao de dados de artigos publicados e rascunhos
- lib/services/health-dashboard.ts: coleta de metricas e integridade do sistema
- lib/services/posts.ts: camada de servico para consulta de artigos

### Utilitarios Globais e Infraestrutura (lib/, lib/utils/, lib/supabase/)

- lib/audit.ts: logger estruturado para acoes administrativas
- lib/editorial-images.ts: resolucao de imagens de capa locais e do Sanity
- lib/env.ts: leitura tipada e tolerante de variaveis de ambiente
- lib/errors/content.ts: classes de erro padronizadas (ContentUnavailableError)
- lib/logger.ts: cliente de log unificado
- lib/security-headers.ts: gerador de cabecalhos HTTP seguros (CSP, HSTS)
- lib/site-config.ts: dados basicos de identidade do portal
- lib/supabase/client.ts: cliente Supabase de navegador
- lib/supabase/middleware.ts: renovacao de sessao no proxy
- lib/supabase/server.ts: cliente Supabase para Server Components
- lib/utils/cn.ts: composicao segura de classes Tailwind com twMerge
- lib/utils/format.ts: formatadores monetarios, datas e seguranca de strings
- lib/utils/fuzzy-match.ts: calculo de distancia Levenshtein Damerau
- lib/utils/search-posts.ts: motor de busca com filtro de editoria e relevância

---

## 4. Inventario de Scripts e Ferramental (scripts)

Total de scripts: 54 arquivos na pasta scripts.

### Scripts Ativos de Build, CI e Portao de Qualidade

- scripts/cloudflare-worker.ts: entrypoint de execucao do Cloudflare Worker
- scripts/enforce-pnpm.js: bloqueio de instalacao com gerenciadores incorretos
- scripts/run-gitleaks.mjs: execucao da varredura de segredos
- scripts/run-semgrep.mjs: execucao da analise estatica de regras
- scripts/run-osv-scanner.mjs: varredura de vulnerabilidades OSV
- scripts/check-gate.mjs: verificacao do manifesto de gates da CI
- scripts/check-targets.mjs: orquestracao dos alvos de teste
- scripts/ci-assess.mjs: avaliacao dos resultados de CI
- scripts/ci-check-branch.mjs: checagem de branch no pipeline
- scripts/ci-check-matrix.mjs: validacao da matriz de jobs
- scripts/ci-check-results.mjs: consolidacao de relatorios de CI
- scripts/ci-fixtures.mjs: preparacao de fixtures no ambiente de pipeline
- scripts/ci-revision.mjs: rastreabilidade de revisao Git
- scripts/client-preflight.mjs: validacao de requisitos antes de execucoes
- scripts/security-baseline.mjs: comparacao com linha de base de seguranca
- scripts/security-free-doctor.mjs: diagnostico das cotas do plano gratuito
- scripts/sync-gitattributes.mjs: sincronizacao de atributos de fim de linha
- scripts/validate-admin-access.mjs: validacao de configuracao do Access

### Scripts de Apoio a Testes Locais e E2E

- scripts/e2e-server.mjs: servidor local isolado para testes Playwright
- scripts/e2e-fault-proxy.mjs: simulador de falhas de rede e indisponibilidade
- scripts/prepare-e2e-db.mjs: seed do banco de dados descartavel para E2E
- scripts/seed-e2e-offers.mjs: insercao de ofertas de exemplo para testes E2E
- scripts/wait-http.mjs: espera ativa por inicializacao de servidor HTTP

### Resíduos Detectados em scripts/ (Candidatos ao Lote L1)

1. Bytecode orfao em cache de compilacao Python:
   - scripts/**pycache**/check-admin-access.cpython-314.pyc (o script check-admin-access.py correspondente nao existe mais na pasta)
   - scripts/**pycache**/check-sanity.cpython-314.pyc
   - scripts/**pycache**/deploy-version.cpython-314.pyc
2. Scripts duplicados ou legados com equivalentes em Node:
   - scripts/check-sanity.py vs scripts/verify-sanity-authenticated-read.mjs
   - scripts/deploy-version.py e scripts/compare-versions.py (nao sao chamados pelo package.json)
   - scripts/verify-spec-0016.mjs (script de verificacao de spec antiga ja encerrada)
   - scripts/check-portability.mjs e scripts/check-contract.mjs (rotinas utilitarias antigas)

---

## 5. Inventario de Testes (**tests** e supabase/tests)

Total de suites Vitest: 83 arquivos ativos, totalizando 858 testes.

### Duplicacoes Comprovadas em **tests**/ (Candidatos ao Lote L1)

1. Par 1:
   - **tests**/components/button.test.tsx (versao antiga na raiz)
   - **tests**/unit/components/button.test.tsx (versao atual na arvore unit)
     Confirmacao: o proprio cabecalho de unit/components/button.test.tsx declara que a versao em components/ e um duplicado.
2. Par 2:
   - **tests**/lib/format.test.ts (versao legada congelada com menos assercoes)
   - **tests**/unit/lib/format.test.ts (versao completa atual com 309 linhas cobrindo slugify, json-ld e formatacao relativa)

### Pastas de Resíduos em **tests**/

- **tests**/app/.gitkeep (pasta vazia mantida apenas por gitkeep)
- **tests**/integration/.gitkeep (pasta mantida com testes ativos)
- **tests**/utils/.gitkeep (pasta sem arquivos de teste utilitarios)

---

## 6. Inventario de Banco de Dados e Persistencia (supabase/)

### Migrations Historicas (Intocaveis por Contrato)

1. 20261003000000_profiles_foundation.sql
2. 20261004000000_posts_exemplo.sql
3. 20261005000000_posts_schema_editorial.sql
4. 20261005000001_posts_rls_preview.sql
5. 20261005000002_posts_comment_correction.sql
6. 20261013000000_modulo_ofertas_historico_precos.sql
7. 20261013010000_modulo_ofertas_classificador_outliers.sql
8. 20261013020000_modulo_ofertas_elegibilidade_frete.sql
9. 20261013030000_modulo_ofertas_pipeline_selo_cupons.sql
10. 20261016230000_modulo_ofertas_ingest_idempotencia.sql

### Testes de Banco pgTAP

- supabase/tests/database/offers_ingest_idempotencia.test.sql
- supabase/tests/database/offers_module.test.sql
- supabase/tests/database/offers_outliers.test.sql
- supabase/tests/database/offers_pipeline.test.sql
- supabase/tests/database/shipping_eligibility.test.sql
- supabase/tests/rls_posts_test.sql

### Resíduos Locais Temporarios em supabase/ (Candidatos ao Lote L1)

- supabase/.temp/cli-latest (arquivo efemero gerado por execucao local do supabase cli)
- supabase/.temp/start-secrets/.../docker.env (credenciais geradas pelo container local descartavel)
  Esses arquivos nao devem ser versionados e devem ser adicionados ao .gitignore.

---

## 7. Mapa de Duplicacoes Conceituais e Responsabilidades (Lote L2 e L3)

1. Autenticacao de Webhook vs Ingestao:
   - lib/offers/webhook-auth.ts possui MemoryNonceCache e metodo antigo de webhook.
   - lib/offers/ingest-auth.ts possui autenticacao HMAC moderna com nonces persistidos em banco.
     Proposta para L2: consolidar a logica criptografica HMAC em modulo unico, mantendo compatibilidade de contratos.
2. Sanitizacao de Erros da RPC:
   - app/api/admin/ofertas/[id]/avaliar-selo/route.ts faz fallback de cliente e tratamento manual.
   - app/api/ingest/ofertas/route.ts trata os codigos de erro da RPC diretamente.
     Proposta para L3: unificar o adaptador de mapeamento de erros da RPC SQL.

---

## 8. Conclusao da Fase L0 e Proximos Passos

O inventario completo comprovou:

- Zero arquivos essenciais ou migrations estao em risco de perda.
- A linha de base de 858 testes e scanners de seguranca esta 100 por cento verde.
- Ha 4 alvos cirurgicos e seguros para o Lote L1: remocao de bytecode orfao em scripts/**pycache**, remocao dos 2 testes duplicados legados na raiz de **tests**, protecao de supabase/.temp no .gitignore e expurgo de scripts mortos de specs encerradas.

A fase L0 esta encerrada com sucesso. A proxima etapa planejada e o Lote L1 (remocao de residuos comprovados).
