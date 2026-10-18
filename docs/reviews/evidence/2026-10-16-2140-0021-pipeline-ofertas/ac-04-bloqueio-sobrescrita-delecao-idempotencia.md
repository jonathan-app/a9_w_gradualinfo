# Evidência AC-04: Idempotência transacional no PostgreSQL e bloqueio de colisão

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-04`  
**Status**: PASS  

## Descrição e comprovação empírica

A idempotência transacional é garantida no nível de banco de dados PostgreSQL através de chave de operação única e verificação determinística na RPC `evaluate_and_set_verified_price` e na tabela `public.offer_operation_keys` (migração `20261016230000_modulo_ofertas_ingest_idempotencia.sql`):

1. **Reenvios com payload idêntico**:
   - A RPC consulta `public.offer_operation_keys` sob lock `for share`.
   - Se a chave já foi executada com o mesmo `evidence_hash`, devolve deterministicamente o resultado prévio (`reused_existing = true`).
   - Nenhuma linha adicional é inserida em `price_audit_logs` e a validade `badge_expires_at` não é renovada.

2. **Reenvios concorrentes simultâneos**:
   - Sob concorrência simultânea, a restrição de unicidade primária em `offer_operation_keys(operation_key)` e o lock de linha `for update` na oferta garantem que apenas uma transação executa as mutações, enquanto as demais recebem o resultado sem duplicação de auditoria.

3. **Submissões com mesma chave e payload divergente**:
   - Caso uma requisição apresente uma chave já utilizada mas com hash de evidência/payload diferente, a RPC dispara exceção com código `23505` (`operation_key_payload_conflict`).
   - A rota HTTP mapeia essa falha e responde imediatamente com HTTP 409 Conflict.

4. **Comprovação em testes automatizados**:
   - Validado nos testes `3. retorna resultado anterior com reused_existing = true em reenvio legítimo com novo nonce e mesma chave de operação`, `4. retorna 409 quando a mesma operation_key for enviada com payload diferente (conflito)` e `5. recupera transação confirmada com resposta perdida sem duplicar auditoria nem renovar datas` em `__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`.
