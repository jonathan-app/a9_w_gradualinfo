# Evidência AC-05: Sanitização fail-closed de mensagens de erro na rota pública /api/ofertas

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-05`  
**Status**: PASS  

## Descrição e comprovação empírica

A rota pública `app/api/ofertas/route.ts` implementa tratamento sanitizado fail-closed para qualquer falha de consulta ao PostgreSQL:

1. **Ocultação de detalhes internos**:
   * O código anterior devolvia `NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })`, vazando nomes de tabelas, colunas e detalhes do PostgreSQL.
   * O novo código registra o código do erro internamente via `logger.info('api/ofertas', ...)` e responde ao cliente com status HTTP 503 e payload opaco estrito:
     ```json
     {
       "error": "unavailable",
       "message": "Serviço de ofertas temporariamente indisponível."
     }
     ```
2. **Comprovação em teste**:
   * O teste unitário `sanitiza erros do banco e retorna HTTP 503 opaco fail-closed (AC-05)` em `__tests__/unit/lib/offers/route-ofertas.test.ts` simula falha com código `42P01` e mensagem crua de erro do PostgreSQL e atesta:
     * Status HTTP retornado é 503.
     * Resposta JSON contém exclusivamente `error: 'unavailable'` e a mensagem sanitizada amigável.
     * Nenhuma substring da mensagem do banco (`active_offers_view`, `42P01`) vaza no corpo da resposta.
