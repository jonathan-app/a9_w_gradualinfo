# Evidência admin-dashboard/AC-06: Detecção e Apresentação de Outliers Conforme Regras da Spec 0017

## Critério
O painel deve consultar no servidor as observações anômalas de `public.price_history` (`is_anomalous = true`) via cliente de serviço (contornando a política restritiva de RLS `price_history_select_non_anomalous` que oculta anomalias para roles anônimos e autenticados), refletindo integralmente a Regra 3 da Spec 0017: corte para queda relativa superior a 50% em relação à mediana prévia (tolerando desconto exatamente igual a 50%), salvaguarda cumulativa de baixo valor para medianas inferiores a R$ 50,00 (exigindo queda superior a 50% e desvio absoluto superior a R$ 25,00 para caracterizar anomalia), e exigência de ao menos 5 amostras diárias UTC distintas no histórico. Observações anômalas devem ser destacadas com badge de alerta visual explicando o isolamento estatístico.

## Verificação Empírica

1. **Consulta Segura de Anomalias no Servidor**:
   - As anomalias gravadas em `public.price_history` possuem `is_anomalous = true`.
   - A política de segurança de linha (RLS) `price_history_select_non_anomalous` oculta essas linhas para conexões `anon` ou `authenticated`.
   - Em `lib/services/commercial-dashboard.ts`, o cliente com `service_role` (executado estritamente no servidor após verificação AAL2) consulta as linhas anômalas associadas aos produtos em exibição e agrega a contagem de anomalias por oferta.
   - O campo `anomaliesCount` é repassado ao componente de apresentação.

2. **Apresentação Visual na Tabela (`components/admin/dashboard/offers-table.tsx`)**:
   - Quando `anomaliesCount > 0`, a linha da oferta exibe um badge destacado com alerta:
     `Outlier detectado (1)`
   - O badge contém texto explicativo contextualizando o isolamento estatístico da Spec 0017 Regra 3:
     "Esta oferta possui 1 observação anômala isolada pelo cômputo da mediana para evitar distorções estatísticas."

3. **Validação com Dados Reais**:
   - `scripts/seed-e2e-offers.mjs` inseriu uma observação em `price_history` com `is_anomalous = true` (preço de R$ 1.999,00 frente à mediana de R$ 4.500,00, queda de 55,5% > 50%).
   - No teste E2E `e2e/admin-operational-dashboard.spec.ts`:
     - O badge `Outlier detectado (1)` foi localizado e validado no Chromium com classe visual `text-amber-700 bg-amber-50`.
     - A salvaguarda de baixo valor e a exigência de 5 amostras diárias UTC distintas (Spec 0017) foram validadas no módulo de ofertas da suíte Vitest (`__tests__/unit/lib/offers/`).

## Veredito
**PASS**
