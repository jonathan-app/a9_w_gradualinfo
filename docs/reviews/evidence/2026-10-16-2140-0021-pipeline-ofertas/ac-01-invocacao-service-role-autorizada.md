# Evidência AC-01: Invocação de evaluate_and_set_verified_price exclusivamente via service_role

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-01`  
**Status**: PASS  

## Descrição e comprovação empírica

A invocação transacional da RPC sensível `evaluate_and_set_verified_price` na rota administrativa `app/api/admin/ofertas/[id]/avaliar-selo/route.ts` é executada exclusivamente através de cliente privilegiado Supabase (`getOffersServiceClient`), operando no servidor com chave `service_role`.

1. **Autorização rigorosa prévia**:
   * Requisições são submetidas obrigatoriamente a autenticação dual fail-closed antes de qualquer operação:
     * Sessão administrativa única com segundo fator MFA (`assertAdminApiAuth`, exigindo `ADMIN_USER_ID` e AAL2).
     * Ou webhook assinado por coletor oficial via HMAC-SHA256 (`verifyWebhookSignature`), com verificação de nonce anti-replay e carimbo de tempo.
   * Se nenhuma autorização for comprovada, a requisição é rejeitada sumariamente com 401 ou 403, sem inicializar o cliente privilegiado.

2. **Execução com `service_role`**:
   * O cliente é resolvido via `getOffersServiceClient()` de `@/lib/offers/service-client`, garantindo que a execução no PostgreSQL possua o papel `service_role` necessário após as revogações de privilégios a usuários públicos/autenticados.
   * Validação comprovada pelos testes em `__tests__/unit/lib/offers/route-avaliar-selo.test.ts` e `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts`.
