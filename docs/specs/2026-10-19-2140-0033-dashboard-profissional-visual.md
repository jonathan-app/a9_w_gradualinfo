# 0033. Dashboard Administrativo Profissional e Composicao Visual

**Date**: 2026-10-19 21:40, America/Sao_Paulo
**Status**: Accepted
**Decision source**: Fase 3 do escopo `docs/scope/2026-10-19-2030-auditoria-backend-login-dashboard.md`, derivada da auditoria estrategica e do mockup de alta fidelidade do painel administrativo do GradualInfo.

---

## 1. Resumo Executivo

A Fase 3 transforma a experiencia visual e operacional do painel administrativo do GradualInfo (`/admin-dashboard`).
A base atual possuia tabelas simples e funcionais em AAL2 (Spec 0020), mas desprovidas da hierarquia visual, organizacao modular e acabamento de nivel profissional requeridos pelo produto.
Esta especificacao define a nova casca administrativa (sidebar lateral escura elegante, cabecalho com dados contextuais e alternador de tema) e o layout em grade de duas colunas, inspirado no mockup de alta fidelidade:

1. Cartoes de metricas operacionais no topo com indicadores reais de artigos e ofertas;
2. Grafico temporal de publicacoes (7, 14 e 30 dias) renderizado com SVG nativo leve, sem novas bibliotecas pesadas;
3. Mesa editorial de artigos recentes com miniaturas de capa, badges de categoria e status;
4. Painel lateral com atalhos de navegacao rapida e timeline de atividade recente conectada a tabela `admin_audit_log` (Spec 0032).

---

## 2. Contexto e Problema

O painel anterior apresentava uma disposicao vertical unica com blocos desarticulados. Alem disso:

- A navegacao nao possuia uma barra lateral estruturada com as secoes do sistema;
- Faltava um resumo visual de publicacoes ao longo do tempo;
- A trilha de auditoria recem implementada na Spec 0032 ainda nao estava visivel na interface para os operadores;
- Os artigos nao possuiam miniaturas de capa na listagem do painel.

A solucao adota componentes modulares em Server Components por padrao, com pequenas ilhas interativas de cliente onde o estado e estritamente necessario (exemplo: seletor de periodo de 7, 14 ou 30 dias).

---

## Requirements

### Historias de usuario

- Como administrador ou editor, quero abrir o painel e visualizar imediatamente os indicadores principais do portal (artigos publicados, rascunhos, ofertas ativas e usuarios).
- Como editor, quero ver a distribuicao de publicacoes ao longo dos ultimos dias em um grafico claro e intuitivo.
- Como operador, quero acessar rapidamente as acoes mais comuns (redigir artigo, gerenciar ofertas, auditar permissoes).
- Como auditor ou administrador, quero ver a timeline das ultimas acoes executadas no painel com ator, acao e horario relativo.

### Criterios de aceite

- **dash-ui/AC-01**: A casca administrativa (`app/admin-dashboard/(protegido)/layout.tsx`) implementa a sidebar escura com branding GradualInfo, navegacao com icones SVG nativos (Dashboard, Conteudo, Ofertas, Usuarios, Seguranca, Configuracoes, Logs, Monitoramento) e rodape de status, mantendo compatibilidade responsiva para dispositivos moveis.

- **dash-ui/AC-02**: O cabecalho exibe saudacao personalizada com o papel ou email do usuario autenticado, data atual formatada em horario de Brasilia, indicador de nivel de seguranca ativo e integracao com o alternador de tema em capsula (ThemeToggle).

- **dash-ui/AC-03**: Os quatro cartoes de metricas do topo exibem contadores reais (total de artigos, leituras/engajamento, ofertas ativas e usuarios com papel), com variacao percentual e mini sparkline SVG nativo sem bibliotecas adicionais.

- **dash-ui/AC-04**: O componente de grafico de publicacoes ao longo do tempo renderiza barras verticais proporcionais em SVG com separacao de status (publicados, revisao e rascunhos), permitindo alternar interativamente entre 7, 14 e 30 dias.

- **dash-ui/AC-05**: A mesa de artigos recentes renderiza a lista dos ultimos conteudos editoriais com miniaturas de capa (EditorialCover), categoria com tipografia discreta, badges com cores semanticas (publicado em verde, revisao em azul, rascunho em roxo) e data de atualizacao formatada.

- **dash-ui/AC-06**: O bloco de acessos rapidos oferece navegacao direta para as funcoes administrativas principais (conteudo, ofertas, gestao de papeis RBAC e politicas de seguranca).

- **dash-ui/AC-07**: A timeline de atividade recente consulta os ultimos registros reais da tabela `admin_audit_log` criados pela Spec 0032, exibindo acao, recurso e horario relativo de forma sanitizada.

- **dash-ui/AC-08**: A suite de testes unitarios e o portao consolidado `pnpm check:all` permanecem 100 por cento aprovados, com zero regressao nas rotas protegidas e acessibilidade conforme diretrizes WCAG AA.

---

## 4. Arquitetura de Componentes

```text
components/admin/
  shell/
    admin-sidebar.tsx       # Sidebar escura com navegacao e grupos
    admin-header.tsx        # Cabecalho com saudacao, data e status
  dashboard/
    metric-cards.tsx        # 4 cartoes com sparklines SVG
    publication-chart.tsx   # Grafico de barras empilhadas SVG interativo
    recent-articles.tsx     # Tabela refinada de artigos com capas
    quick-actions.tsx       # Atalhos operacionais com icones coloridos
    recent-activity.tsx     # Timeline alimentada por admin_audit_log
```

---

## 5. Fonte de Dados e Contratos

1. Metricas:
   - Artigos: contagem real de publicados e rascunhos de `getEditorialDashboardData`
   - Ofertas: contagem de ofertas de `getCommercialDashboardData`
   - Usuarios: contagem de `admin_user_roles`
2. Grafico:
   - Agrupamento temporal derivado das datas de publicacao dos artigos reais.
3. Atividade Recente:
   - Query em `admin_audit_log` via `getAdminServiceClient()` limitando a 5 ultimos eventos com status `success`.
