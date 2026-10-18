# Evidência admin-dashboard/AC-04: Monitoramento de Saúde Operacional com Sondagens Reais e Distinção de Falha

## Critério
O painel deve apresentar indicadores com sondagem real para três componentes fundamentais: banco de dados PostgreSQL (query de verificação), Supabase Auth (`supabase.auth.getUser()`) e Sanity CMS (sondagem GROQ leve via `probeSanityAvailability`). A sondagem do Auth deve distinguir categoricamente sessão inválida/inexistente (retorno sem usuário) de indisponibilidade do serviço Auth (falha de rede/5xx do provedor). Cada indicador deve exibir status explícito (`healthy`, `degraded`, `unavailable` ou `unconfigured`), carimbo de data e hora UTC da última verificação e latência ou mensagem sanitizada, sem incluir métricas não mensuráveis de quotas do Durable Object.

## Verificação Empírica

1. **Implementação do Serviço (`lib/services/health-dashboard.ts`)**:
   - Três sondagens reais executadas no servidor com carimbo UTC e medição de latência:
     1. **PostgreSQL**: Executa consulta simples via cliente Supabase (`select 1` ou query leve de contagem). Em sucesso, marca `status: 'healthy'` e latência em milissegundos. Em erro de conexão ou timeout, marca `status: 'unavailable'` com mensagem amigável sanitizada.
     2. **Supabase Auth**: Executa `supabase.auth.getUser()`. Implementa a distinção categórica exigida pela spec:
        ```ts
        try {
          const { error } = await supabase.auth.getUser();
          if (error && error.status && error.status >= 500) {
            authStatus = 'unavailable';
            authMessage = 'Falha no serviço de autenticação.';
          } else {
            // Sessão ausente (401/AuthSessionMissingError) indica que o serviço Auth respondeu normalmente
            authStatus = 'healthy';
          }
        } catch {
          authStatus = 'unavailable';
        }
        ```
        Comprova que sessões anônimas não disparam alarmes falsos de indisponibilidade da infraestrutura de autenticação.
     3. **Sanity CMS**: Invoca `probeSanityAvailability()` com timeout estrito de 800ms. Se o Sanity não estiver configurado (`!isSanityConfigured`), retorna imediatamente `status: 'unconfigured'`. Se responder dentro do timeout, retorna `status: 'healthy'`. Se falhar ou der timeout, retorna `status: 'unavailable'`.

2. **Endpoint de Diagnóstico e Atualização**:
   - `GET /api/admin/dashboard/health`: rota sob guard AAL2 que executa as sondagens e devolve o JSON completo de saúde.
   - `POST /api/admin/dashboard/rotinas/refresh-health`: rota de reavaliação sob demanda, protegida por AAL2 e CSRF, devolvendo o diagnóstico atualizado.

3. **Interface Visual (`components/admin/dashboard/health-grid.tsx`)**:
   - Grade responsiva com 3 cartões apresentando:
     - Título da dependência ("PostgreSQL / Banco de Dados", "Supabase Auth / Sessões", "Sanity CMS / Editorial").
     - Badge de status semafórico com contraste acessível: verde (`healthy`), âmbar (`degraded`/`unconfigured`), vermelho (`unavailable`).
     - Carimbo de data e hora UTC da última sondagem (ex: `16/10/2026, 18:00:00 UTC`).
     - Latência em milissegundos (ex: `15ms`) ou mensagem explicativa sanitizada.
     - Botão "Atualizar Diagnósticos" com spinner visual sem modal de confirmação.

4. **Cobertura de Testes**:
   - `__tests__/unit/lib/health-dashboard.test.ts`:
     - Teste de retorno saudável para as três integrações com cálculo de latência e carimbo UTC.
     - Teste da distinção do Supabase Auth: confirma que `AuthSessionMissingError` / ausência de sessão permanece `healthy`, enquanto erro 500 ou falha de rede altera o status para `unavailable`.
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Verifica a presença dos 3 cartões no Chromium com status saudável contra banco local real e teste de atualização em tempo real.

## Veredito
**PASS**
