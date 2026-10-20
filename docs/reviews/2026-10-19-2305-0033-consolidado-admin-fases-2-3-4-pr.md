# Rascunho de PR: Backend Administrativo RBAC, Auditoria WORM, Dashboard Profissional e Testes E2E (Fases 2, 3 e 4)

- Data: 2026-10-19 23:05, America/Sao_Paulo.
- Escopo de Referência: [docs/scope/2026-10-19-2030-auditoria-backend-login-dashboard.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/scope/2026-10-19-2030-auditoria-backend-login-dashboard.md).
- Especificações Vinculadas:
  - Spec 0032 (Accepted): [docs/specs/2026-10-19-2050-0032-backend-administrativo-rbac-auditoria.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/specs/2026-10-19-2050-0032-backend-administrativo-rbac-auditoria.md)
  - Spec 0033 (Accepted): [docs/specs/2026-10-19-2140-0033-dashboard-profissional-visual.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/specs/2026-10-19-2140-0033-dashboard-profissional-visual.md)
- Estado da Árvore: alterações locais validadas no checkout; submissão e abertura de PR dependem de autorização explícita do usuário.

---

## Título Sugerido

```text
feat(admin): rbac multiusuario, trilha de auditoria worm, dashboard profissional e suite e2e
```

---

## Corpo do Pull Request

### 1. Resumo Executivo (What)

Este Pull Request consolida a evolução estrutural da camada administrativa do GradualInfo através de três fases interdependentes:

1. **Fase 2 (Segurança e Persistência)**: Implementação do controle de acesso baseado em papéis (RBAC) com resolução cumulativa de permissões no servidor (`admin` > `editor` > `revisor`), admissão multiusuário no login e MFA, e trilha durável de auditoria com garantias reais de imutabilidade (WORM) no PostgreSQL.
2. **Fase 3 (Composição Visual e Experiência)**: Construção da casca administrativa de alta fidelidade espelhada no mockup aprovado (sidebar escura ardósia, cabeçalho contextual com seletor de tema responsivo, 4 cartões de métricas com sparklines SVG nativos, gráfico de publicações temporal interativo, mesa de artigos recentes com status semânticos, 5 atalhos operacionais rápidos e timeline conectada ao log de auditoria).
3. **Fase 4 (Testes de Resiliência e E2E)**: Validação ponta a ponta no navegador Chromium com Playwright contra a stack real do Supabase local (porta 54321) e o runtime OpenNext compilado, cobrindo autenticação AAL2, bloqueios de rota, permissões restritas e responsividade mobile em 390×844 e 360×740 px.

Todos os 901 testes Vitest em 88 arquivos, 197 testes pgTAP em 7 arquivos de banco e 8 testes de navegador Playwright estão 100% aprovados.

---

### 2. Motivação e Contexto (Why)

A auditoria estratégica do backend e login identificou que o painel administrativo original operava sob restrições severas: dependia de um único UUID estático em variável de ambiente (`ADMIN_USER_ID`), carecia de persistência relacional para eventos administrativos e apresentava um layout básico.

Para transformar a ferramenta em uma plataforma segura e pronta para operação editorial colaborativa, foi necessário implementar defesa em profundidade no banco de dados e no servidor Next.js, além de redesenhar a experiência do operador com componentes visuais performáticos e nativos, dispensando bibliotecas externas pesadas de gráficos.

---

### 3. Alterações Detalhadas (Changes)

#### A. Banco de Dados e Permissões (PostgreSQL e Supabase)

- **Migration SQL** (`supabase/migrations/20261019210000_admin_rbac_and_audit_log.sql`):
  - Tabela `admin_user_roles`: armazena papéis (`admin`, `editor`, `revisor`) com chave estrangeira para `auth.users` e políticas de Row Level Security (RLS).
  - Função `public.is_admin()` com `SECURITY DEFINER`: resolve autorização administrativa sem recursão de RLS.
  - Tabela `admin_audit_log`: registra ator, papel no momento da ação, categoria do recurso, ID do alvo, detalhes em JSONB, endereço IP mascarado e carimbo temporal.
  - Garantia WORM real: trigger `tg_prevent_admin_audit_mutation` com erro SQLSTATE 55000 que rejeita terminantemente comandos `UPDATE` e `DELETE`, aliado à revogação de privilégios de mutação para os papéis `authenticated` e `service_role`.
  - Funções RPC transacionais `assign_admin_role` e `revoke_admin_role` que registram o evento na trilha de auditoria na mesma transação atômica.
- **Suíte pgTAP** (`supabase/tests/database/admin_rbac.test.sql`): 26 novos testes cobrindo inserção, consulta, RLS e a prova matemática de bloqueio a tentativas de mutação e exclusão na trilha WORM.

#### B. Camada de Aplicação e Autorização (Backend Next.js)

- **Serviços de Domínio**:
  - `lib/admin/roles.ts`: resolução hierárquica e cumulativa de papéis do usuário (`admin` > `editor` > `revisor`) com contingência transparente para `env.adminUserId`.
  - `lib/admin/audit-service.ts`: cliente seguro para emissão de logs de auditoria tanto em transações atômicas quanto em eventos best-effort.
  - `lib/admin/service-client.ts`: cliente Supabase com Service Role Key para operações restritas de infraestrutura.
- **Guardas de Rota e Call Sites**:
  - `lib/admin/auth.ts`: guarda `assertAdminApiAuth(request, requiredRole)` com respostas HTTP 403 padronizadas.
  - Admissão multiusuário no login (`/api/admin/auth/login`) e validação de MFA (`/api/admin/auth/mfa/verify`).
  - Endpoints REST em `/api/admin/usuarios/papeis` para gestão de papéis por administradores.

#### C. Interface e Componentes Visuais (Frontend TailAdmin)

- **Casca e Navegação**:
  - `components/admin/admin-sidebar.tsx`: sidebar escura no tom ardósia `#0B132B` com branding GradualInfo e rotas ativas.
  - `components/admin/admin-header.tsx`: cabeçalho contextual com data em horário de Brasília, status de sessão AAL2, perfil e seletor de tema `ThemeToggle`.
  - `components/shared/theme-toggle.tsx`: componente responsivo que renderiza um ícone único circular em telas mobile (`< sm`), ciclando os temas sem estourar o layout, e mantém a cápsula completa de três opções em desktop.
- **Composição Visual do Dashboard**:
  - `components/admin/dashboard/metric-cards.tsx`: 4 cartões de indicadores reais com sparklines SVG nativos.
  - `components/admin/dashboard/publication-chart.tsx`: gráfico temporal SVG nativo interativo (filtros de 7, 14 e 30 dias).
  - `components/admin/dashboard/recent-articles.tsx`: tabela de publicações recentes com miniaturas e badges semânticos.
  - `components/admin/dashboard/recent-activity.tsx`: timeline de atividade real conectada ao `admin_audit_log`.
  - `components/admin/dashboard/quick-actions.tsx`: 5 atalhos operacionais diretos para rotinas críticas.

#### D. Testes e Resiliência (Fase 4)

- **E2E Playwright**:
  - Execução bem sucedida de `e2e/admin-operational-dashboard.spec.ts` (login real, MFA TOTP, AAL2 e os 4 blocos operacionais).
  - Execução de `e2e/recovery.spec.ts` (recuperação de acesso, fluxo PKCE, troca de senha e reset de MFA).
  - Execução do Fluxo REAL em `e2e/admin-dashboard.spec.ts` (desafio AAL1, autorização de preview e negação para UUIDs não autorizados).
  - Validação de renderização e integridade responsiva em viewports 390×844 e 360×740 px.

---

### 4. Como Testar e Reproduzir (How to test / verify)

```bash
# 1. Portão consolidado de qualidade (typecheck, lint, formatação, vitest e SAST)
pnpm check:all

# 2. Testes de banco no Supabase local (RLS, RBAC e WORM)
pnpm supabase:test

# 3. Testes unitários dedicados do RBAC e Dashboard Visual
pnpm vitest run __tests__/unit/admin-rbac.test.ts __tests__/unit/components/admin-dashboard-visual.test.tsx

# 4. Testes E2E com Playwright contra o Supabase local
E2E_REAL_SUPABASE=1 pnpm exec playwright test e2e/admin-operational-dashboard.spec.ts
E2E_REAL_SUPABASE=1 pnpm exec playwright test e2e/recovery.spec.ts
E2E_REAL_SUPABASE=1 pnpm exec playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"
```

---

### 5. Honestidade Técnica e Limitações Conhecidas

- **Testes de Navegador**: Os testes Playwright foram executados exclusivamente sob o motor Chromium. Coberturas em WebKit e Firefox permanecem não verificadas nesta rodada.
- **Ambiente de Testes**: As validações foram executadas no ambiente local contra o container do Supabase na porta 54321; o deploy em ambiente Cloudflare de produção dependerá de migração remota autorizada.
- **Durable Objects na Cloudflare**: As classes `PreviewSessionDO` e `AdminRateLimitDO` operam em conformidade local, mas a publicação em produção requer a emissão do comando `wrangler deploy` e aplicação das migrations no ambiente remoto.
- **Sanitização de Segredos**: Nenhum segredo real, cookie de produção ou token JWT foi incluído nos artefatos.

---

### 6. Relatórios e Evidências Vinculadas

- Relatório de Verificação da Fase 2: [docs/reviews/2026-10-19-2130-0032-backend-administrativo-rbac-auditoria.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/reviews/2026-10-19-2130-0032-backend-administrativo-rbac-auditoria.md) (10/10 PASS).
- Relatório de Verificação da Fase 3: [docs/reviews/2026-10-19-2200-0033-dashboard-profissional-visual.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/reviews/2026-10-19-2200-0033-dashboard-profissional-visual.md) (8/8 PASS).
- Evidências Visuais E2E:
  - Captura Mobile 390px: [dashboard_390.png](file:///home/jonathan/.gemini/antigravity-ide/brain/083ea46b-583f-4ec1-9816-8950f54fb109/dashboard_390.png)
  - Captura Mobile 360px: [dashboard_360.png](file:///home/jonathan/.gemini/antigravity-ide/brain/083ea46b-583f-4ec1-9816-8950f54fb109/dashboard_360.png)
