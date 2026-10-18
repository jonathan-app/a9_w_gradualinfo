# Evidência AC-05: Sanitização fail-closed de mensagens de erro na rota pública /api/ofertas

**AC**: ofertas-pipeline/AC-05  
**Status**: PASS (rota pública /api/ofertas)  
**Data**: 2026-10-17  
**Achado relacionado**: WARNING — rotas de ingestão/admin expõem código de erro interno do PostgreSQL  

## O que foi verificado (PASS)

1. **`app/api/ofertas/route.ts:112-123`**: erros de consulta ao banco na rota `/api/ofertas` são capturados e registrados exclusivamente no log estruturado interno (`logger.info` com `code` do erro). O cliente externo recebe JSON opaco HTTP 503 (`{ error: 'unavailable', message: 'Serviço de ofertas temporariamente indisponível.' }`), sem expor tabelas, colunas ou códigos do PostgreSQL.
2. Validação defensiva de parâmetros (AC-06) ocorre antes de qualquer acesso ao banco, rejeitando inválidos com HTTP 400.

## Achado (WARNING) — sanitização nas rotas de escrita

1. **`app/api/ingest/ofertas/route.ts:490-497`**: em falha da RPC, a resposta retorna `code: rpcError.code`, expondo o código de erro interno do PostgreSQL (ex. `23505`, `22023`) ao consumidor da rota de ingestão.
2. **`app/api/admin/ofertas/[id]/avaliar-selo/route.ts:418-425`**: mesma exposição de `code: rpcError.code` na resposta de erro da RPC.
3. Isso contraria o princípio de sanitização fail-closed da spec (detalhes técnicos devem ficar restritos ao log interno).

## Código relevante

- `app/api/ofertas/route.ts:110-124`
- `app/api/ingest/ofertas/route.ts:475-498`
- `app/api/admin/ofertas/[id]/avaliar-selo/route.ts:416-426`
