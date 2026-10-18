# Evidência AC-06: Validação defensiva de parâmetros na rota pública /api/ofertas

**AC**: ofertas-pipeline/AC-06  
**Status**: PASS  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4  

## O que foi verificado

1. **`app/api/ofertas/route.ts:30-38`**: `product_id` validado estritamente contra formato UUIDv4 (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`). Valor inválido → HTTP 400 antes de acessar o banco.
2. **`app/api/ofertas/route.ts:40-48`**: `merchant_id` validado estritamente contra UUIDv4. Inválido → HTTP 400.
3. **`app/api/ofertas/route.ts:51-73`**: `limit` validado como inteiro estrito entre 1 e 100 (`/^\d+$/`, depois `parsedLimit < 1 || parsedLimit > 100`). Inválido → HTTP 400.
4. Teste: `__tests__/unit/lib/offers/route-ofertas.test.ts` cobre rejeição de parâmetros inválidos com HTTP 400 antes da consulta ao banco.

## Código relevante

- `app/api/ofertas/route.ts`
- `__tests__/unit/lib/offers/route-ofertas.test.ts`
