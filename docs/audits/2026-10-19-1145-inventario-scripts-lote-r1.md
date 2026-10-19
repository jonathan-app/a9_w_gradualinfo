# Inventario Completo e Matriz de Risco dos 46 Scripts (Lote R1)

Data: 2026-10-19T11:45:00-03:00  
Escopo correspondente: docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md (Fase 1, Lote R1)  
Modo de operacao: somente leitura e auditoria estatica, zero alteracoes de codigo ou exclusoes

---

## 1. Visao Geral e Linha de Base Aprovada

Esta auditoria cumpre integralmente o objetivo do Lote R1 da Fase 1 de racionalizacao do repositorio GradualInfo. Foram mapeados todos os 46 scripts presentes na pasta scripts/, identificando funcoes, chamadores diretos no package.json, fluxos de integracao continua (CI), ganchos do Git (Husky), testes automatizados e dependencias cruzadas.

Nenhum arquivo de codigo foi alterado ou apagado durante esta rodada.

### Linha de Base Vigente (Pos Lote R2)

- Typecheck TypeScript: limpo, zero erros (tsc --noEmit)
- Linter ESLint: limpo, zero avisos (eslint .)
- Formatacao Prettier: 100 por cento em conformidade (prettier --check .)
- Testes Vitest: 865 testes unitarios em 84 suites (100 por cento aprovados)
- Varredura de segredos (Gitleaks): zero achados no historico e na arvore
- Analise estatica (Semgrep): zero achados de erro
- Dependencia react-icons: removida com sucesso no Lote R2 e Spec 0030 aprovada

---

## 2. Classificacao dos Scripts em Seis Dominios Operacionais

Para evitar remocoes precipitadas e garantir que nenhum script critico seja descartado por aparente redundancia, os 46 scripts foram categorizados em seis dominios funcionais:

1. **Seguranca**: Scanners SAST, deteccao de segredos e protecao de variaveis de ambiente (5 scripts).
2. **Integracao Continua (CI)**: Infraestrutura de jobs, fixtures de banco temporario e gates de aprovacao (12 scripts).
3. **Desenvolvimento e Testes Locais**: Servidores de desenvolvimento, proxies de falha e mocks de teste (9 scripts).
4. **Manutencao e Governanca**: Gestao do catalogo de skills, checagem MCP e contingencia operacional (9 scripts).
5. **Migracao e Dados Editoriais**: Ferramentas de sincronizacao de rascunhos e integracao com Sanity (6 scripts).
6. **Exportacao e Auditoria Externa**: Monitoramento de telemetria CrUX e geracao de pacotes de distribuicao (5 scripts).

---

## 3. Inventario Detalhado dos 46 Scripts

Abaixo, cada script e descrito com sua funcao, chamadores no package.json, consumidores na CI, hooks ou testes, dependencias tecnicas e ultima evidencia de uso registrada.

### A. Dominio de Seguranca (5 scripts)

| Script                   | Funcao Principal                                                                    | Chamadas e Consumidores                                     | Dependencias                 | Ultima Evidencia de Uso                                            |
| :----------------------- | :---------------------------------------------------------------------------------- | :---------------------------------------------------------- | :--------------------------- | :----------------------------------------------------------------- |
| run-gitleaks.mjs         | Scanner de segredos no historico Git e na arvore local com saida redigida.          | package.json (security:secrets), check:all, .husky/pre-push | node:child_process, gitleaks | Executado no check:all do Lote R2 com zero achados.                |
| run-semgrep.mjs          | Scanner estatico SAST aplicando regras locais em security/semgrep.yml.              | package.json (security:sast), check:all, .husky/pre-push    | node:child_process, semgrep  | Executado no check:all do Lote R2 com zero achados.                |
| check-env-leak.mjs       | Guarda de variaveis de ambiente que impede commit de arquivos .env.                 | .husky/pre-commit                                           | node:fs, node:child_process  | Validado em todas as operacoes de commit e revisao.                |
| security-baseline.mjs    | Agregador local de cinco camadas de seguranca (env, osv, semgrep, gitleaks, audit). | scripts/run-semgrep.mjs                                     | node:child_process, node:fs  | Criado na fase inicial do boilerplate. Sem script no package.json. |
| security-free-doctor.mjs | Diagnostico local de disponibilidade dos binarios de seguranca gratuitos.           | Nenhum consumidor ativo                                     | node:child_process, node:fs  | Utilitario de diagnostico local sem chamador em comandos ou CI.    |

### B. Dominio de Integracao Continua (12 scripts)

| Script               | Funcao Principal                                                                | Chamadas e Consumidores                                  | Dependencias                                 | Ultima Evidencia de Uso                                 |
| :------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------------- | :------------------------------------------- | :------------------------------------------------------ |
| check-contract.mjs   | Biblioteca canonica do contrato de decisao do gate /check.                      | check-decision.mjs, check-gate.mjs, ci-check-results.mjs | node:fs, node:crypto, node:path              | Executado pela autoridade check-decision no Lote R2.    |
| check-decision.mjs   | CLI executavel que avalia results.json e emite veredito APROVADO ou REPROVADO.  | CI job check-gate, uso local /check                      | ./check-contract.mjs, node:fs                | Validou com APROVADO a Spec 0030 no Lote R2.            |
| check-gate.mjs       | Trava mecanica na CI que prova correspondencia entre commit e veredito gravado. | CI job check-gate                                        | ./check-contract.mjs, node:fs                | Ativo no workflow .github/workflows/ci.yml.             |
| ci-assess.mjs        | Avaliador mecanico de evidencias da CI (testes pgTAP e casos de teste por AC).  | **tests**/unit/ci-assess.test.ts, ci-check-results.mjs   | node:fs, node:path                           | Coberto por 7 testes unitarios em ci-assess.test.ts.    |
| ci-check-results.mjs | Compilador do artefato de resultados da revisao na CI.                          | ci-check-matrix.mjs, check-decision.mjs                  | ./ci-assess.mjs, ./check-contract.mjs        | Integrado ao pipeline de avaliacao da CI.               |
| ci-check-matrix.mjs  | Orquestrador da matriz de especificacoes no job check-gate da CI.               | CI job check-gate                                        | ./ci-check-results.mjs, ./check-contract.mjs | Ativo no workflow da CI.                                |
| ci-check-branch.mjs  | Validador de conformidade dos nomes de branch em pull requests.                 | CI workflows                                             | node:child_process                           | Ativo nos gatilhos de PR da CI.                         |
| ci-fixtures.mjs      | Provisionador de artigos e previews descartaveis na stack de CI.                | CI job e2e, 3 suites de teste                            | node:fs, node:crypto                         | Ativo no workflow da CI e testes locais.                |
| ci-revision.mjs      | Registrador do manifesto de revisao amarrando commit testado ao relatorio.      | CI job e2e                                               | node:fs, node:crypto                         | Ativo no workflow da CI antes dos testes E2E.           |
| prepare-e2e-db.mjs   | Prepara instancia isolada de Supabase local com tokens curtos para E2E na CI.   | CI job e2e                                               | node:child_process, node:fs                  | Ativo no workflow da CI.                                |
| wait-http.mjs        | Polling HTTP com retry para aguardar disponibilidade de portas locais.          | CI job e2e                                               | node:http, node:https                        | Ativo no workflow da CI para aguardar o servidor.       |
| run-osv-scanner.mjs  | Wrapper reprodutivel com verificacao de checksum para o OSV Scanner.            | security-baseline.mjs                                    | node:child_process, node:crypto              | Na CI o scan roda via Action google/osv-scanner-action. |

### C. Dominio de Desenvolvimento e Testes Locais (9 scripts)

| Script                               | Funcao Principal                                                            | Chamadas e Consumidores                          | Dependencias                   | Ultima Evidencia de Uso                                     |
| :----------------------------------- | :-------------------------------------------------------------------------- | :----------------------------------------------- | :----------------------------- | :---------------------------------------------------------- |
| dev-editorial.mjs                    | Servidor de desenvolvimento com catalogo local isolado de servicos remotos. | package.json (dev:editorial)                     | next dev, node:child_process   | Utilizado para desenvolvimento editorial sem credenciais.   |
| sync-editorial.mjs                   | Compila lib/editorial/local-posts.json a partir dos Markdown locais.        | package.json (editorial:sync), dev-editorial.mjs | node:fs, node:path             | Utilizado na preparacao de rascunhos locais.                |
| e2e-server.mjs                       | Servidor loopback com TLS local na porta 3100 para testes E2E com HTTPS.    | e2e/ (playwright.config.ts)                      | node:https, node:http-proxy    | Utilizado para rodar testes Playwright com cookies seguros. |
| e2e-fault-proxy.mjs                  | Proxy HTTP com injecao programada de erros 503 entre cliente e Supabase.    | Testes E2E de resiliencia                        | node:http, node:http-proxy     | Utilizado para validar contingencia honesta sob falha.      |
| seed-e2e-offers.mjs                  | Semeador de dados de ofertas validas e anomalas no banco local.             | Testes E2E de ofertas                            | node:crypto, supabase client   | Utilizado na validacao do pipeline da Spec 0021.            |
| verify-cambridge-visual.mjs          | Script Playwright avulso para captura visual da Home Cambridge e artigo.    | Nenhum consumidor ativo                          | @playwright/test, node:fs      | Evidencias arquivadas na Spec 0013. Suplantado por E2E.     |
| inspect-dashboard-visual.mjs         | Script Playwright avulso para inspecao visual do Dashboard Operacional.     | Nenhum consumidor ativo                          | @playwright/test, jose, crypto | Evidencias arquivadas na Spec 0020. Suplantado por E2E.     |
| verify-sanity-authenticated-read.mjs | Script de inspecao de leitura autenticada no Sanity Content Lake.           | Nenhum consumidor ativo                          | @playwright/test, jose, crypto | Evidencias arquivadas na Spec 0020. Suplantado por Vitest.  |
| verify-preview-lifecycle.py          | Validacao de ciclo de preview editorial em Python com urllib e cookies.     | Nenhum consumidor ativo                          | urllib, http.cookiejar         | Evidencias arquivadas na Spec 0019. Suplantado por Vitest.  |

### D. Dominio de Manutencao e Governanca (9 scripts)

| Script                  | Funcao Principal                                                         | Chamadas e Consumidores               | Dependencias                 | Ultima Evidencia de Uso                                   |
| :---------------------- | :----------------------------------------------------------------------- | :------------------------------------ | :--------------------------- | :-------------------------------------------------------- |
| enforce-pnpm.js         | Trava de seguranca no preinstall para impedir gerenciadores divergentes. | package.json (preinstall)             | node:process                 | Executado a cada pnpm install localmente e na CI.         |
| materialize-skills.mjs  | Materializador do catalogo agêntico versionado sem download arbitrario.  | package.json (skills:materialize), CI | node:fs, node:crypto         | Ativo na CI para restaurar skills homologadas.            |
| check-skills.mjs        | Verificador de integridade de hashes do catalogo de skills locais.       | package.json (skills:check), CI       | node:fs, node:crypto         | Ativo no job de qualidade da CI.                          |
| check-portability.mjs   | Guarda de portabilidade e regras de convencao agêntica.                  | CI job quality                        | node:fs, node:path           | Ativo no job de qualidade da CI.                          |
| check-mcp-config.mjs    | Verificador de consistencia das configuracoes e ferramentas MCP.         | package.json (mcp:check), CI          | node:fs, node:path           | Ativo no job de qualidade da CI.                          |
| check-targets.mjs       | Validador de correspondencia das specs listadas em check-targets.json.   | package.json (check:targets)          | node:fs, node:path           | Ativo no acompanhamento de escopo do projeto.             |
| quarantine-skills.mjs   | Utilitario de isolamento seguro de skills nao homologadas.               | Uso agêntico manual                   | node:fs, node:path           | Utilizado na admissao de novas skills agênticas.          |
| admin-reset-mfa.mjs     | Script operacional para redefinicao de fator TOTP em contingencia AAL2.  | Suporte administrativo                | node:crypto, supabase client | Validado em testes de contingencia na Spec 0019.          |
| config-admin-access.mjs | Assistente de configuracao segura das credenciais Cloudflare Access.     | Suporte de infraestrutura             | node:crypto, jose            | Utilizado no provisionamento do perimetro administrativo. |

### E. Dominio de Migracao e Dados Editoriais (6 scripts)

| Script                      | Funcao Principal                                                      | Chamadas e Consumidores | Dependencias          | Ultima Evidencia de Uso                                 |
| :-------------------------- | :-------------------------------------------------------------------- | :---------------------- | :-------------------- | :------------------------------------------------------ |
| check-sanity.py             | Diagnostico de conectividade e permissao GROQ no Sanity em Python.    | Nenhum consumidor ativo | urllib, json, getpass | Utilizado na checagem manual inicial do dataset remoto. |
| seed-sanity-drafts.py       | Carga segura de arquivos Markdown locais para rascunhos no Sanity.    | Ferramenta de migracao  | urllib, json, getpass | Utilizado na carga de rascunhos para testes do Sanity.  |
| publish-sanity-drafts.py    | Publicacao em lote de rascunhos no dataset de producao do Sanity.     | Ferramenta de migracao  | urllib, json, getpass | Utilizado na promocao de rascunhos para publicados.     |
| verify-editorial-parity.mjs | Compara campo a campo docs/rascunhos-editoriais com local-posts.json. | Nenhum consumidor ativo | node:fs, node:path    | Utilizado para garantir paridade do catalogo local.     |
| verify-test-draft.py        | Consulta rapida de slugs publicados e rascunhos de teste em producao. | Nenhum consumidor ativo | urllib, json          | Utilizado em verificacao manual pontual de rotas.       |
| cloudflare-worker.ts        | Ponto de entrada e bindings de Durable Objects para o OpenNext.       | Runtime Cloudflare      | open-next/core        | Modulo compativel com o build de producao.              |

### F. Dominio de Exportacao e Auditoria Externa (5 scripts)

| Script                    | Funcao Principal                                                      | Chamadas e Consumidores           | Dependencias                    | Ultima Evidencia de Uso                               |
| :------------------------ | :-------------------------------------------------------------------- | :-------------------------------- | :------------------------------ | :---------------------------------------------------- |
| sync-gitattributes.mjs    | Sincroniza metadados do pacote no arquivo .gitattributes.             | package.json (gitattributes:sync) | node:fs                         | Executado no pre-commit e sincronizacao de versao.    |
| export-template.mjs       | Gera o arquivo gradualinfo-v2.0.0.zip com calculo de hash SHA256.     | package.json (template:export)    | node:child_process, node:crypto | Executado na geracao do pacote de distribuicao.       |
| pagespeed-monitor.js      | Coleta metricas Core Web Vitals reais via Google CrUX API.            | package.json (pagespeed)          | node:https                      | Utilizado para auditoria de desempenho de campo.      |
| validate-admin-access.mjs | Valida presenca e formato das 4 variaveis Access sem exibir segredos. | Pre-deploy e auditoria            | node:process                    | Utilizado na conferencia de variaveis de producao.    |
| client-preflight.mjs      | Script de preflight de entrega herdado de template antigo.            | Nenhum consumidor ativo           | node:child_process, node:fs     | Contem caminhos para src/ que nao existem no projeto. |

---

## 4. Mapeamento de Duplicacoes Reais e Analise de Efeitos Colaterais

A auditoria analisou o comportamento do codigo, nao apenas a semelhanca de nomes, identificando tres sobreposicoes concretas:

### A. Duplicidade de Interpretador (Python vs TypeScript)

- **Comportamento**: Existem cinco scripts em Python (`check-sanity.py`, `seed-sanity-drafts.py`, `publish-sanity-drafts.py`, `verify-preview-lifecycle.py`, `verify-test-draft.py`) totalizando 994 linhas de codigo.
- **Sobreposicao real**:
  - `check-sanity.py` faz chamadas GROQ via HTTP na API do Sanity. O projeto ja possui cliente GROQ nativo em TypeScript (`lib/sanity/client.ts`) com testes e tratamento de erro tipado.
  - `verify-preview-lifecycle.py` testa login, cookie e logout de preview usando `urllib`. A suite Playwright (`e2e/recovery.spec.ts`) e a suite Vitest (`__tests__/integration/spec-0018-real-auth.test.ts`) ja cobrem exatamente o mesmo ciclo com maior rigor e assercoes de DOM.
  - `verify-test-draft.py` contem lista fixa de URLs publicadas para checar HTTP 200, teste que ja e executado pelo job de E2E e pelo teste de SEO.
- **Efeitos colaterais e risco**: `seed-sanity-drafts.py` e `publish-sanity-drafts.py` ainda possuem utilidade operacional para o momento em que a migracao editorial definitiva para o Sanity for autorizada. Portanto, nao devem ser removidos agora.

### B. Ferramentas Locais de Diagnostico de Seguranca

- **Comportamento**: Os scripts `run-osv-scanner.mjs`, `security-baseline.mjs` e `security-free-doctor.mjs` totalizam 859 linhas de codigo.
- **Sobreposicao real**:
  - Na CI, o OSV Scanner e executado diretamente via Action oficial GitHub (`google/osv-scanner-action@v2.7.0`) no job `quality`.
  - Localmente, o portao consolidado invoca `pnpm security:all` (que chama `run-gitleaks.mjs` e `run-semgrep.mjs`). Os outros tres scripts nao estao amarrados a nenhum script do `package.json` nem a ganchos de pre-commit ou pre-push.
- **Efeitos colaterais e risco**: Remover ou consolidar esses wrappers locais nao afeta a CI nem os ganchos do Git, desde que `run-gitleaks.mjs` e `run-semgrep.mjs` permaneçam intactos.

### C. Scripts Avulsos de Captura Visual de Especificacoes Concluidas

- **Comportamento**: Os scripts `verify-cambridge-visual.mjs`, `inspect-dashboard-visual.mjs` e `verify-sanity-authenticated-read.mjs` somam 1.098 linhas de codigo.
- **Sobreposicao real**:
  - Foram desenvolvidos como arneses de teste sob demanda para gerar capturas visuais nas Specs 0013 e 0020. As imagens geradas ja estao arquivadas em `docs/reviews/evidence/`.
  - As assercoes funcionais reais estao permanentemente cobertas pelos testes Playwright em `e2e/` (`verify-home-pendentes.spec.ts`, `admin-operational-dashboard.spec.ts`) e pelas suites Vitest.
- **Efeitos colaterais e risco**: Os scripts estao inativos e sua remocao planejada nao afeta testes rotineiros nem portoes de build.

---

## 5. Plano Verificavel para Candidatos a Simplificacao e Remocao

Para cada um dos 13 scripts candidatos identificados no Grupo C, apresentamos a analise verificavel com evidencia, impacto, risco, substituto oficial, testes exigidos e decisao recomendada:

| Candidato                            | Evidencia de Desuso / Redundancia                                                                                        | Impacto da Alteracao                                               | Nivel de Risco | Substituto Oficial no Projeto                                            | Testes Exigidos para Validar                                    | Decisao Recomendada                            |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- | :------------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------- | :--------------------------------------------- |
| client-preflight.mjs                 | Zero referencias em package.json, CI, testes ou scripts. Referencia caminhos obsoletos de template (src/config/site.ts). | Nenhum. 272 linhas removidas.                                      | Nulo           | export-template.mjs e gitattributes:sync                                 | Executar pnpm check:all e template:export.                      | Remover em spec dedicada.                      |
| verify-test-draft.py                 | Zero referencias em CI ou scripts. Contem lista hardcoded de slugs de producao.                                          | Nenhum. 133 linhas removidas.                                      | Nulo           | Suites e2e/search-flow.spec.ts e e2e/seo-audit.spec.ts                   | Executar pnpm check:all e pnpm test:e2e.                        | Remover em spec dedicada.                      |
| verify-preview-lifecycle.py          | Zero referencias ativas. Lógica duplicada em Python.                                                                     | Nenhum. 314 linhas removidas.                                      | Baixo          | **tests**/integration/spec-0018-real-auth.test.ts e e2e/recovery.spec.ts | Executar pnpm test:run e pnpm test:e2e.                         | Avaliar remocao futura.                        |
| inspect-dashboard-visual.mjs         | Zero chamadores em package.json ou CI. Evidencias visuais da Spec 0020 ja arquivadas.                                    | Nenhum. 243 linhas removidas.                                      | Baixo          | e2e/admin-operational-dashboard.spec.ts                                  | Executar pnpm test:e2e e pnpm check:all.                        | Avaliar remocao futura.                        |
| verify-cambridge-visual.mjs          | Zero chamadores em package.json ou CI. Evidencias visuais da Spec 0013 ja arquivadas.                                    | Nenhum. 442 linhas removidas.                                      | Baixo          | e2e/verify-home-pendentes.spec.ts                                        | Executar pnpm test:e2e e pnpm check:all.                        | Avaliar remocao futura.                        |
| verify-sanity-authenticated-read.mjs | Zero chamadores em package.json ou CI. Evidencias da Spec 0020 ja arquivadas.                                            | Nenhum. 413 linhas removidas.                                      | Baixo          | **tests**/unit/sanity-client.test.ts                                     | Executar pnpm test:run.                                         | Avaliar remocao futura.                        |
| check-sanity.py                      | Zero chamadores em package.json ou CI. Diagnostico GROQ em Python redundante.                                            | Nenhum. 96 linhas removidas.                                       | Baixo          | lib/sanity/client.ts e **tests**/unit/sanity-client.test.ts              | Executar pnpm test:run.                                         | Avaliar remocao futura.                        |
| security-free-doctor.mjs             | Sem comando em package.json nem chamada em CI.                                                                           | Nenhum. 295 linhas removidas.                                      | Baixo          | run-gitleaks.mjs e run-semgrep.mjs via pnpm security:all                 | Executar pnpm security:all.                                     | Avaliar remocao futura.                        |
| security-baseline.mjs                | Sem comando em package.json. O gate oficial de seguranca e security:all.                                                 | Nenhum. 279 linhas removidas.                                      | Baixo          | pnpm security:all (gitleaks + semgrep)                                   | Executar pnpm security:all e check:all.                         | Consolidar ou descontinuar.                    |
| run-osv-scanner.mjs                  | Sem comando em package.json. CI utiliza Action oficial google/osv-scanner-action.                                        | Nenhum na CI. 285 linhas.                                          | Baixo          | google/osv-scanner-action no workflow ci.yml                             | Executar CI quality job.                                        | Manter apenas sob demanda local.               |
| verify-editorial-parity.mjs          | Zero chamadores ativos, mas possui regra de negocio valida (compara markdown com JSON).                                  | Potencial perda de guarda de integridade se deletado sem migracao. | Medio          | Nenhum substituto direto no momento.                                     | Exige criacao previa de **tests**/unit/editorial-parity.test.ts | Consolidar como teste Vitest antes de remover. |
| seed-sanity-drafts.py                | Utilizado para carga manual de artigos para o Sanity durante migracao.                                                   | Perda de ferramenta de migracao editorial para o Sanity.           | Medio          | Nenhum substituto automatico no momento.                                 | Teste de carga com flag --dry-run.                              | Manter congelado ate migracao Sanity.          |
| publish-sanity-drafts.py             | Utilizado para publicacao em lote no Sanity durante migracao.                                                            | Perda de ferramenta de publicacao para o Sanity.                   | Medio          | Nenhum substituto automatico no momento.                                 | Teste de publicacao com flag --dry-run.                         | Manter congelado ate migracao Sanity.          |

---

## 6. Conclusao e Recomendacao Executiva

1. **Blindagem Imediata (33 scripts)**:
   - Os 17 scripts do Grupo A (seguranca, hooks e infraestrutura de CI) e os 16 scripts do Grupo B (desenvolvimento ativo, servidores E2E e suporte operacional) estao formalmente aprovados para permanencia intacta.
2. **Plano Gradual para o Grupo C (13 scripts)**:
   - **Fase I (Risco Nulo)**: Descontinuar `client-preflight.mjs` e `verify-test-draft.py` (405 linhas de codigo descartadas sem nenhum impacto colateral).
   - **Fase II (Migracao Segura para Teste)**: Converter a logica de `verify-editorial-parity.mjs` em teste unitario Vitest em `__tests__/unit/editorial-parity.test.ts`.
   - **Fase III (Ferramentas de Migracao Sanity)**: Manter preservados `seed-sanity-drafts.py` e `publish-sanity-drafts.py` ate que a transicao definitiva para o Sanity seja concluida.
   - **Fase IV (Arneses Historicos)**: Avaliar a descontinuacao dos 3 scripts de captura visual pontual e dos wrappers avulsos de diagnostico local em spec dedicada com o `/architect`.
3. **Regra de Seguranca Cumprida**: Nenhuma linha de script ou configuracao foi alterada. Todos os portoes de qualidade (`tsc`, `eslint`, `prettier`, `vitest` com 865 testes e `pnpm security:all`) permanecem 100 por cento aprovados.
