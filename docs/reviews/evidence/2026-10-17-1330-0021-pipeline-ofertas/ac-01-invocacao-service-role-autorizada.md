# Evidência AC-01: Invocação da RPC via service_role exclusivamente no servidor após autorização

**AC**: ofertas-pipeline/AC-01  
**Status**: PASS  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4, Supabase local 127.0.0.1:54321  

## O que foi verificado

1. **`lib/offers/service-client.ts:9`** declara `import 'server-only'`, impedindo importação por componentes de cliente. O cliente é inicializado com `persistSession: false`, `autoRefreshToken: false` e `detectSessionInUrl: false`, sem cookies nem sessão (AC-01, AC-07).
2. **`app/api/admin/ofertas/[id]/avaliar-selo/route.ts:128`** chama `assertAdminApiAuth(request)` (sessão administrativa AAL2) antes de qualquer uso de credencial de serviço. A RPC `evaluate_and_set_verified_price` é executada via `getOffersServiceClient()` (cliente `service_role`, `security definer`) apenas após autorização comprovada.
3. Usuários sem autorização são rejeitados antes da inicialização de credenciais de serviço (fail-closed).
4. **Teste**: `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` (service-client) e `__tests__/unit/lib/offers/route-avaliar-selo.test.ts` validam o isolamento server-only e a autorização prévia.
5. **171 testes pgTAP** aprovados, incluindo `offers_ingest_idempotencia.test.sql` que confirma a função `evaluate_and_set_verified_price` (13 parâmetros) como `SECURITY DEFINER`, proprietário `postgres`, com `REVOKE`/`GRANT` explícito a `service_role`.

## Código relevante

- `lib/offers/service-client.ts:9,32-44`
- `app/api/admin/ofertas/[id]/avaliar-selo/route.ts:111-134, 386-414`
- `supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql:31-309`
