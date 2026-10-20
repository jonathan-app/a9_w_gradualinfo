# Scope: Racionalizacao Geral do Repositorio e Protecao de Fluxos (GradualInfo)

> Documento dono do /scope: responde o que construir, o que auditar e em que ordem.  
> Nao decide como: detalhes de desenho e arquitetura pertencem a specs (/architect).  
> Criado em 2026-10-18 a partir da diretriz estrategica de consolidacao sem inchaco.

## Diretrizes Estrategicas

1. Rejeicao de pacotes e starters externos duplicados: repositorios de referencia (supabase-community/supabase-ui, Aritra212/nextjs-supabase-shadcn-starter, MurakawaTakuya/next-shadcn-supabase-starter, mahdibrr/awesome-nextjs-supabase, rezmoss/awesome-security-pipeline) sao mantidos exclusivamente como referencias conceituais externas. Nenhum codigo ou estrutura sera clonado ou copiado integralmente para o GradualInfo.
2. Preservacao da stack atual completa: Next.js 16 com Turbopack, Supabase ssr e js, OpenNext para Cloudflare Workers, Vitest, Playwright com axe-core, Tailwind CSS 4, Gitleaks e Semgrep. O objetivo e validar e enxugar o que existe, nao somar camadas desnecessarias.
3. Fluxo unico de engenharia agentica: um unico agente principal para edicao cirurgica, revisao independente para analisar diffs, respeito absoluto ao AGENTS.md e historico canônico em workflow/STATE.md.
4. Higiene em lotes pequenos: investigacao previa comprovando ausencia de chamadas antes de qualquer remocao de dependencia ou script.

---

## Tabela de Acompanhamento (At a glance)

| #   | Feature                                            | Phase  | Status      |
| --- | -------------------------------------------------- | ------ | ----------- |
| 1   | Inventario Exaustivo de Dependencias, Scripts e UI | Fase 1 | in-progress |
| 2   | Consolidacao dos Controles de Seguranca Existentes | Fase 2 | in-progress |
| 3   | Racionalizacao de Componentes e Bibliotecas de UI  | Fase 3 | planned     |
| 4   | Validacao E2E dos Fluxos Criticos e CI Enxuta      | Fase 4 | planned     |

---

## Fase 1: Inventario Exaustivo de Dependencias, Scripts e UI (in-progress)

Auditoria profunda em package.json, scripts operacionais e componentes de interface, mapeando imports e utilidade comprovada.  
**Done when:** todas as dependencias, scripts e icones estao catalogados e classificados como manter, investigar, substituir ou candidato a remocao, sem nenhuma exclusao precipitada.

### Lote R1: Inventario e Classificacao de Scripts Operacionais (done)

Mapeamento exaustivo dos 46 scripts em scripts/ divididos por criticidade e frequencia de uso:

- Grupo A (Criticos para CI, hooks e qualidade local): 15 scripts essenciais (run-gitleaks.mjs, run-semgrep.mjs, materialize-skills.mjs, check-skills.mjs, check-portability.mjs, check-mcp-config.mjs, prepare-e2e-db.mjs, ci-fixtures.mjs, ci-revision.mjs, check-contract.mjs, check-decision.mjs, check-gate.mjs, sync-gitattributes.mjs, export-template.mjs, enforce-pnpm.js). Manter intactos.
- Grupo B (Operacionais Ativos de Desenvolvimento e Suporte): 16 scripts em uso frequente (dev-editorial.mjs, e2e-server.mjs, e2e-fault-proxy.mjs, seed-e2e-offers.mjs, admin-reset-mfa.mjs, config-admin-access.mjs, validate-admin-access.mjs, sync-editorial.mjs, pagespeed-monitor.js, wait-http.mjs, cloudflare-worker.ts, ci-check-branch.mjs, ci-check-matrix.mjs, check-targets.mjs, check-env-leak.mjs, quarantine-skills.mjs). Manter ativos.
- Grupo C (Candidatos a Avaliacao para Simplificacao em lote isolado): 15 ferramentas de verificacoes visuais pontuais e rotinas antigas de rascunho (inspect-dashboard-visual.mjs, verify-cambridge-visual.mjs, verify-editorial-parity.mjs, verify-sanity-authenticated-read.mjs, verify-preview-lifecycle.py, check-sanity.py, publish-sanity-drafts.py, seed-sanity-drafts.py, verify-test-draft.py, security-baseline.mjs, security-free-doctor.mjs, run-osv-scanner.mjs, client-preflight.mjs, ci-check-results.mjs). Exige comprovacao de zero impacto antes de qualquer intervencao.

- [x] Inventario inicial dos 46 scripts executado via analise estatica de referencias
- [x] Relatorio detalhado de classificacao publicado em docs/audits/2026-10-19-1145-inventario-scripts-lote-r1.md
- [x] Design it (spec): `/architect racionalizacao de scripts operacionais`
      Spec 0031 Accepted · `docs/specs/2026-10-19-1835-0031-racionalizacao-scripts-lote-r1.md`
- [x] Build it: `/develop racionalizacao de scripts operacionais`
  - [x] Criar teste de paridade editorial em **tests**/unit/editorial-parity.test.ts (AC-02)
  - [x] Remover scripts orfaos client-preflight.mjs e verify-test-draft.py (AC-01)
  - [x] Remover verify-editorial-parity.mjs e validar portao consolidado (AC-03, AC-04, AC-05)
- [x] Verify it: `/check verify racionalizacao de scripts operacionais` (APROVADO em check/0031-racionalizacao-scripts/results.json)
- [x] Review it: `/check review racionalizacao de scripts operacionais` (docs/reviews/2026-10-19-1830-0031-racionalizacao-scripts.md)
- [x] Audit security: `/security racionalizacao de scripts operacionais` (pnpm security:all verde com 0 segredos e 0 erros SAST)
- [x] Document it: `/document pr` (docs/reviews/2026-10-19-1840-0031-racionalizacao-scripts-pr.md)
- [x] Sync it: `/sync` (AGENTS.md, STATE.md e escopo reconciliados)

### Lote R2: Racionalizacao de Icones e Dependencias de UI (in-progress)

Diagnostico: a biblioteca react-icons (versao 5.7.0) esta instalada no projeto mas e importada em apenas 3 arquivos para renderizar exatamente 5 icones da familia Lucide:

1. app/busca/page.tsx: LuArrowUpRight e LuSearch
2. components/layout/site-header.tsx: LuHouse e LuSearch
3. components/shared/theme-toggle.tsx: LuMoon e LuSun

O painel administrativo ja utiliza icones SVG nativos sem depender de react-icons. Substituir esses 5 icones por componentes SVG limpos permite eliminar o pacote react-icons sem qualquer alteracao visual ou funcional.

- [x] Design it (spec): `/architect racionalizacao de icones de interface`
      Spec 0030 Accepted · `docs/specs/2026-10-19-0930-0030-racionalizacao-icones-ui-svg.md`
- [x] Build it: `/develop racionalizacao de icones de interface`
  - [x] Criar componentes SVG nativos em components/shared/icons/ (SearchIcon, HomeIcon, ArrowUpRightIcon, SunIcon, MoonIcon) e index (AC-01)
  - [x] Atualizar consumidores em app/busca/page.tsx, components/layout/site-header.tsx e components/shared/theme-toggle.tsx (AC-02, AC-03)
  - [x] Remover pacote react-icons de package.json e reconciliar pnpm-lock.yaml (AC-04)
  - [x] Validar portao consolidado pnpm check:all e paridade visual (AC-05)
- [x] Verify it: `/check verify racionalizacao de icones de interface` (APROVADO em check/0030-racionalizacao-icones/results.json)
- [x] Review it: `/check review racionalizacao de icones de interface` (docs/reviews/2026-10-19-1055-0030-racionalizacao-icones.md)
- [ ] Audit security: `/security racionalizacao de icones de interface`
- [ ] Test it: `/test racionalizacao de icones de interface`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`

### Lote R3: Auditoria de Dependencias de Desenvolvimento

Auditoria em pacotes auxiliares de desenvolvimento no package.json (Storybook, Spotlight, Concurrently, analise de bundle) para verificar compatibilidade plena com o build Turbopack do Next.js 16 e garantir que ferramentas nao utilizadas nao onerem o tempo de instalacao.

- [ ] Auditoria de compatibilidade do bundle-analyzer com Turbopack
- [ ] Verificacao de uso dos pacotes Storybook e Chromatic
- [ ] Emissao de parecer tecnico sobre dependencias opcionais

---

## Fase 2: Consolidacao dos Controles de Seguranca Existentes

Validacao e fortalecimento das ferramentas de seguranca ja integradas antes de avaliar novas adicoes.  
**Done when:** Gitleaks, Semgrep e pnpm audit operam de forma confiavel com falha fechada comprovada, e ferramentas extras como OSV-Scanner ou Trivy so avancam se houver lacuna concreta comprovada.

### 2. Consolidacao dos Controles de Seguranca Existentes

- [x] Design it (spec): `/architect harmonizacao entre gitignore e gitattributes`
      Spec 0029 Accepted · `docs/specs/2026-10-18-2300-0029-harmonizacao-seguranca-gitignore-gitattributes.md`
- [x] Build it: `/develop harmonizacao entre gitignore e gitattributes`
  - [x] Adicionar regras de sessoes, backups e bancos locais em .gitignore (AC-01, AC-02, AC-03)
  - [x] Validar conformidade do indice Git (AC-04)
  - [x] Validar exportacao e portao pnpm security:all (AC-05)
- [ ] Verify it: `/check verify harmonizacao entre gitignore e gitattributes`
- [ ] Review it: `/check review harmonizacao entre gitignore e gitattributes`
- [ ] Audit security: `/security harmonizacao entre gitignore e gitattributes`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`

---

## Fase 3: Racionalizacao de Componentes e Bibliotecas de UI

Auditoria de componentes visuais, unificacao de icones e adocao seletiva de padroes acessiveis baseados em Radix e Tailwind.  
**Done when:** o catalogo de UI em components/ segue rigorosamente DESIGN.md, icones redundantes sao consolidados e nenhum componente inutilizado permanece.

### 3. Racionalizacao de Componentes e Bibliotecas de UI

- [ ] Design it (spec): `/architect racionalizacao de UI e icones`
- [ ] Mapear todos os imports de react-icons no projeto antes de qualquer intervencao
- [ ] Avaliar componentes Radix existentes e utilitarios de classe (clsx, tailwind-merge, cva)
- [ ] Estabelecer adocao seletiva inspirada em shadcn/ui apenas sob necessidade concreta de produto
- [ ] Validar acessibilidade de interface com axe-core

---

## Fase 4: Validacao E2E dos Fluxos Criticos e CI Enxuta

Comprovacao ponta a ponta dos fluxos essenciais da aplicacao em navegador real e garantia de pipeline rapido na CI.  
**Done when:** testes Playwright cobrem fluxos editoriais, autenticacao AAL2, recuperacao e acessibilidade com exit 0, e o fluxo local de build e preview opera sem falhas.

### 4. Validacao E2E dos Fluxos Criticos e CI Enxuta

- [ ] Design it (spec): `/architect validacao e2e e pipeline enxuto`
- [ ] Executar suites Playwright para leitura editorial publica e leitor de artigos
- [ ] Validar testes E2E do painel administrativo, sessao AAL2 e recuperacao de conta
- [ ] Comprovar pipeline de build e preview local via OpenNext e Wrangler sem mutacoes remotas
- [ ] Verificar tempo de execucao dos 6 jobs da CI no GitHub Actions plano Free

---

## Criterios de Protecao Inviolaveis

1. Nenhuma remocao de dependencia ou arquivo sem busca previa exaustiva de referencias e imports em toda a base de codigo.
2. As 10 migrations historicas em supabase/migrations sao estritamente imutaveis.
3. Nenhuma mutacao remota em Cloudflare Workers, Supabase de producao ou buckets R2 sem autorizacao expressa.
4. Testes de seguranca, autenticacao e regressao nunca sao afrouxados ou descartados.
5. Atalhos conscientes devem receber comentario formal com o limite e momento de refatoracao.
