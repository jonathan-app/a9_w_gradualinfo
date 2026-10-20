# Scope: Auditoria Estrategica do Backend, Login e Dashboard Administrativo

> Documento de escopo derivado da auditoria estrategica e do mockup de alta fidelidade do GradualInfo.  
> Define o plano de acao em cinco fases para transformar a base atual em um painel administrativo seguro, rastreavel e de nivel profissional, preservando a estabilidade do portal publico.

## Diretrizes Estrategicas

1. **Separacao rigorosa entre existencia e prontidao comprovada**: mapear exatamente o que ja esta testado e operando localmente versus lacunas reais de autorizacao e persistencia.
2. **Defesa em profundidade no servidor**: o servidor valida permissoes em cada rota e operacao mutavel; a interface apenas reflete as permissoes concedidas pelo backend.
3. **Persistencia e trilha de auditoria duravel**: registrar ator, acao, recurso, horario e resultado de operacoes administrativas sensiveis.
4. **Metricas e dados reais**: os indicadores do dashboard administrativo derivam exclusivamente de fontes autenticadas (Sanity CMS, PostgreSQL e Cloudflare), sem dados ficticios no ambiente de operacao.
5. **Harmonia visual com a referencia aprovada**: o painel seguira a composicao do mockup de alta fidelidade (sidebar escura elegante, metricas no topo, grafico temporal, mesa de artigos recentes, atalhos de acesso rapido e timeline de atividade recente).

---

## Tabela de Acompanhamento (At a glance)

| #   | Fase                                            | Objetivo Central                                                    | Status      |
| --- | ----------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| 1   | Fase 1: Auditoria Direcionada e Prontidao       | Mapear rotas, auth, tabelas, RLS e lacunas reais da base atual      | done        |
| 2   | Fase 2: Arquitetura, RBAC e Trilha Duravel      | Definir papeis, contratos de mutacao e persistencia de auditoria    | done        |
| 3   | Fase 3: Implementacao do Dashboard Profissional | Construir visual do mockup, mesa editorial e atalhos operacionais   | in-progress |
| 4   | Fase 4: Validacao e Testes de Resiliencia       | Testes de controle de acesso, expiracao, RLS e isolamento publico   | planned     |
| 5   | Fase 5: Documentacao, Procedimentos e Entrega   | Guias de contingencia, migracao e checklist de homologacao na nuvem | planned     |

---

## Detalhamento das Fases

### Fase 1: Auditoria Direcionada e Prontidao (done)

- [x] Mapear rotas existentes em `app/admin-dashboard/` e `app/api/admin/`
- [x] Avaliar maquina de estados de login, MFA AAL2 e recuperacao em `lib/admin/auth.ts`
- [x] Inspecionar schemas, migrations e politicas RLS em `supabase/migrations/`
- [x] Analisar lacunas no logger de auditoria (`lib/audit.ts`) contra exigencias de auditoria persistente
- [x] Consolidar diagnostico da relacao entre limites de Worker e arquitetura de sessao

### Fase 2: Arquitetura, RBAC e Trilha Duravel (done)

- [x] Design it (spec): `/architect formalizacao da arquitetura de RBAC e auditoria persistente`
      Spec 0032 Aceita · `docs/specs/2026-10-19-2050-0032-backend-administrativo-rbac-auditoria.md`
- [x] Build it: `/develop implementacao da Spec 0032 (migrations SQL, RLS, admissao multiusuario, audit-service e guarda por papel)`
  - [x] Migration SQL com admin_user_roles, admin_audit_log, is_admin() e RPCs de papel (AC-01, AC-05, AC-07)
  - [x] Admissao multiusuario no login e no MFA, com resolucao de papel (AC-02, AC-03)
  - [x] Guarda assertAdminApiAuth(request, requiredRole) e call sites (AC-04)
  - [x] Audit service, contratos de mutacao e endpoint de papeis (AC-06, AC-08, AC-09)
  - [x] Testes pgTAP e Vitest (AC-10)
- [x] Verify it: `/check verify RBAC e auditoria persistente`
- [x] Review it: `/check review RBAC e auditoria persistente`
- [x] Audit security: `pnpm security:secrets` e `pnpm security:sast` (nao existe skill de seguranca neste repo)
- [x] Test it: `/test RBAC e auditoria persistente` (testes pgTAP, Vitest e integracao, AC-10)

### Fase 3: Implementacao do Dashboard Profissional (done)

- [x] Design it (spec): `/architect formalizacao do dashboard profissional visual`
      Spec 0033 Aceita · `docs/specs/2026-10-19-2140-0033-dashboard-profissional-visual.md`
- [x] Build it: `/develop implementacao da Spec 0033 (sidebar, header, metric cards, grafico SVG, artigos recentes, timeline de auditoria)`
  - [x] Adaptacao da casca administrativa (sidebar escura, header com saudacao, data e status)
  - [x] Componente de cartoes de metricas no topo com indicadores reais de artigos e ofertas
  - [x] Componente visual de grafico de publicacoes ao longo do tempo (7, 14 e 30 dias) em SVG nativo
  - [x] Lista de artigos recentes com miniaturas de capa, categorias e badges de status
  - [x] Painel lateral com acessos rapidos e timeline de atividade recente conectada a admin_audit_log
- [x] Verify it: `/check verify visual e funcional do dashboard profissional`
- [x] Review it: `/check review dashboard profissional`
- [ ] Document it: `/document pr`
- [ ] Sync it: `/sync`

### Fase 4: Validacao e Testes de Resiliencia (planned)

- [ ] Testes unitarios e de integracao para rejeicao de chamadas com AAL1 em rotas AAL2
- [ ] Testes pgTAP para politicas RLS da tabela de auditoria e registros de operacao
- [ ] Testes E2E com Playwright cobrindo navegacao no novo layout do dashboard
- [ ] Validacao de fail-closed para sessao expirada e tentativas de acesso direto

### Fase 5: Documentacao, Procedimentos e Entrega (planned)

- [ ] Relatorio final de conformidade e seguranca
- [ ] Procedimento operacional de criacao e gestao de usuarios administrativos
- [ ] Rascunho de Pull Request e preparacao para homologacao
