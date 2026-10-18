# Evidência admin-dashboard/AC-05: Painel de Ofertas Comerciais e Histórico de Preços via Leitura Autorizada no Servidor

## Critério
O dashboard deve consultar as ofertas e suas métricas exclusivamente no servidor através de cliente com privilégio de serviço (`service_role`), executado estritamente após a autorização da sessão AAL2 do operador (`ADMIN_USER_ID`), sem repassar chaves privilegiadas ao cliente navegador e projetando apenas os campos permitidos (`id`, `title`, lojista, `price_cents`, mediana histórica calculada e status do selo). O módulo `lib/services/commercial-dashboard.ts` deve conter `import 'server-only'`, usar cliente isolado sem persistência de sessão nem cookies, paginar ofertas/histórico e deduplicar o cálculo da mediana para uma única invocação por combinação de produto, lojista e meio de pagamento. Mediana `null` deve ser tratada como histórico insuficiente, nunca como preço zero. Com chave de serviço ausente, o bloco comercial assume estado `unconfigured`, preservando o restante do painel. A consulta de mediana executa a função SQL `calculate_offer_median` (cujo grant de execução pertence a `service_role`). As RPCs de concessão de selo e operações de mutação de auditoria WORM permanecem inacessíveis pelo navegador nesta fase.

## Verificação Empírica

1. **Implementação de Segurança e Isolamento (`lib/services/commercial-dashboard.ts`)**:
   - `import 'server-only'` presente no topo do arquivo para impedir qualquer importação acidental no bundle do cliente.
   - Instanciação de cliente Supabase de serviço isolado:
     ```ts
     const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
       auth: { persistSession: false, autoRefreshToken: false },
     });
     ```
   - Caso `SUPABASE_SERVICE_ROLE_KEY` não esteja presente no ambiente do servidor, o método `getCommercialDashboardData()` degrada de forma segura para `{ isUnconfigured: true, offers: [], total: 0 }`, sem falhar o Server Component da página.
   - Projeta estritamente DTO sanitizado: `id`, `title`, `merchantName`, `priceCents`, `medianCents`, `badgeStatus`, `hasInsufficientHistory`, `anomaliesCount`, sem expor credenciais, chaves ou campos internos do banco.
   - **Deduplicação de Mediana**: Para a página atual de ofertas, constrói chave única `${product_id}:${merchant_id}:${payment_method}` e invoca `calculate_offer_median` exatamente uma vez por combinação distinta, cacheando o resultado em mapa em memória.
   - **Tratamento de Mediana Null**: Quando `calculate_offer_median` retorna `null` (menos de 5 coletas diárias UTC nos últimos 30 dias), o DTO marca `hasInsufficientHistory: true` e `medianCents: null`. Na interface, renderiza o badge `"Histórico insuficiente (< 5 dias)"`, nunca exibindo `R$ 0,00`.

2. **Validação com Dados Reais de Banco**:
   - `scripts/seed-e2e-offers.mjs` populou o PostgreSQL local com:
     - Oferta 1: "Notebook Profissional E2E - 16GB RAM", preço R$ 4.500,00, 6 amostras em `price_history`. A RPC `calculate_offer_median` calculou a mediana de R$ 4.500,00 (450000 centavos).
     - Oferta 2: "Mouse Sem Fio Ergonômico E2E", preço R$ 120,00, apenas 2 amostras em `price_history`. A RPC `calculate_offer_median` retornou `null`, renderizado como histórico insuficiente.
   - Mutações e concessão de selos permanecem restritas: nenhuma RPC de concessão de selo ou escrita WORM foi exposta ou conectada nesta fase.

3. **Cobertura de Testes**:
   - `__tests__/unit/lib/commercial-dashboard.test.ts`:
     - Teste de degradação graciosa para `isUnconfigured: true` na ausência da chave de serviço.
     - Teste de deduplicação da chamada `calculate_offer_median` por combinação distinta de produto/lojista/pagamento.
     - Teste de tratamento de mediana `null` como histórico insuficiente (sem preço zero).
     - Teste de paginação e filtragem.
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Validação ponta a ponta no Chromium sob servidor local com `service_role`:
       - Linha do Notebook exibe preço formatado "R$ 4.500,00" e mediana calculada "R$ 4.500,00".
       - Linha do Mouse exibe badge "Histórico insuficiente (< 5 dias)".

## Veredito
**PASS**
