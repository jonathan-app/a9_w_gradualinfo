# Evidência AC-08: Rota dedicada de ingestão de coletores com HMAC e anti-replay compartilhado

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-08`  
**Status**: PASS  

## Descrição e comprovação empírica

A admissão de coletores automatizados é segregada do Cloudflare Access para navegadores e atendida pela rota dedicada `app/api/ingest/ofertas/route.ts`:

1. **Assinatura criptográfica HMAC-SHA256**:
   - String canônica: `METHOD\nPATH\nCOLLECTOR_ID\nTIMESTAMP\nNONCE\nSHA256(RAW_BODY)`.
   - Assinatura calculada com segredo `OFFERS_INGEST_SECRET` e validada em tempo constante (`crypto.timingSafeEqual`).
   - Janela de desvio temporal estrita de 300 segundos (`abs(now - timestamp) <= 300`).

2. **Validação prévia ao consumo do nonce (mitigação de exaustão de recursos)**:
   - Requisições com assinatura inválida são rejeitadas imediatamente com HTTP 401 antes de qualquer consulta ou inserção na base de nonces.
   - Comprovado no teste `1. rejeita HMAC inválido ANTES do consumo do nonce (nonce não é tocado nem consumido)` em `__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`.

3. **Consumo atômico de nonce compartilhado**:
   - Nonces são registrados na tabela `public.offers_ingest_nonces(collector_id, nonce)` no PostgreSQL.
   - Concorrência protegida pela chave primária composta: tentativas de repetição ou disputas simultâneas retornam HTTP 409 Conflict (`nonce_already_consumed`).
   - Comprovado no teste `2. aceita nonce compartilhado uma única vez sob concorrência (segunda chamada simultânea retorna 409)`.

4. **Propagação auditável da identidade do coletor**:
   - A identidade autenticada é propagada como `p_origin_actor_id = 'collector:' || collector_id` para a RPC `evaluate_and_set_verified_price`, garantindo rastreabilidade com `origin = 'automated_collector'`.
