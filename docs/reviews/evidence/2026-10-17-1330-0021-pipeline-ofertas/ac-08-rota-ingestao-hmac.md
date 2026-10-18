# Evidência AC-08: Rota dedicada de ingestão de coletores com HMAC e anti-replay compartilhado

**AC**: ofertas-pipeline/AC-08  
**Status**: PASS  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4, Supabase local 127.0.0.1:54321  

## O que foi verificado (PASS)

1. **`app/api/ingest/ofertas/route.ts`**: rota dedicada `POST /api/ingest/ofertas`, fora das barreiras de login de navegador (Cloudflare Access). Requer cabeçalhos `x-collector-id`, `x-timestamp`, `x-nonce`, `x-signature-sha256` (400 se ausentes).
2. **`lib/offers/ingest-auth.ts:80-149`**: validação HMAC-SHA256 em tempo constante (`crypto.timingSafeEqual`) sobre string canônica `METHOD\nPATH\nCOLLECTOR_ID\nTIMESTAMP\nNONCE\nSHA256(RAW_BODY)`. Janela de timestamp de 300 segundos (401 fora da janela). Formato da assinatura validado (64 hex).
3. **Ordem estrita**: a assinatura é validada **antes** de qualquer consulta ou consumo do nonce (linha 127-156). Assinatura inválida → 401 sem tocar a tabela de nonces (sem esgotamento de recursos).
4. **Consumo atômico do nonce**: linha 175-207 insere em `public.offers_ingest_nonces` com PK composta `(collector_id, nonce)`. Nonce já consumido → `23505` → HTTP 409 (`nonce_already_consumed`).
5. **Propagação de identidade**: linha 465 `p_origin_actor_id: 'collector:' || collectorId.trim()` é enviado à RPC.
6. **Limite de corpo**: 512 KB (`MAX_PAYLOAD_BYTES`) verificado via `content-length` e tamanho real do corpo (413).
7. **Testes** (`__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`): HMAC inválido rejeitado ANTES do consumo do nonce (0 inserts); nonce aceito uma única vez sob concorrência (200/409); reenvio legítimo com novo nonce e mesma operação retorna resultado anterior (`reused_existing: true`, `audit_id` e `badge_expires_at` preservados); mesma chave com payload diferente → 409; recuperação de resposta perdida sem duplicar auditoria nem renovar datas; storage indisponível → 503 sem chamar RPC.

## Limitação de teste

Não há teste empírico de consumo de nonce seguido de falha de storage/RPC com retry usando novo nonce e confirmação de ausência de efeito duplicado sob transações reais de banco. O design é tolerante à falha (idempotência por `operation_key`), mas o cenário parcial não foi exercido com banco real.

## Código relevante

- `app/api/ingest/ofertas/route.ts`
- `lib/offers/ingest-auth.ts`
- `__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`
