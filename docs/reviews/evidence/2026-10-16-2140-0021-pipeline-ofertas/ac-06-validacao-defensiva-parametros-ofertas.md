# Evidência AC-06: Validação defensiva de parâmetros na rota pública /api/ofertas

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-06`  
**Status**: PASS  

## Descrição e comprovação empírica

A rota pública `app/api/ofertas/route.ts` valida defensivamente todos os parâmetros recebidos via query string antes de qualquer submissão ao PostgreSQL:

1. **Parâmetros `product_id` e `merchant_id`**:
   * Validados contra expressão regular estrita de UUIDv4 (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`).
   * Valores fora do formato devolvem HTTP 400 imediato com `{ error: 'invalid_parameter', message: 'O parâmetro ... deve ser um UUIDv4 válido.' }`.
2. **Parâmetro `limit`**:
   * Validado para ser exclusivamente número inteiro (`/^\d+$/`).
   * Intervalo delimitado entre 1 e 100 inclusive. Valores menores que 1 ou maiores que 100 devolvem HTTP 400.
3. **Comprovação em teste**:
   * Teste unitário `valida formato UUIDv4 de product_id e merchant_id (AC-06)` em `__tests__/unit/lib/offers/route-ofertas.test.ts` comprova rejeição com HTTP 400 para UUIDs malformados e limites fora do intervalo (101 ou não numéricos).
