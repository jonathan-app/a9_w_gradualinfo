# Evidência AC-07: Isolamento server-only do cliente de serviço

**AC**: ofertas-pipeline/AC-07  
**Status**: PASS  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4  

## O que foi verificado

1. **`lib/offers/service-client.ts:9`** declara `import 'server-only'`, impedindo qualquer importação por componentes de cliente (folha interativa). A diretiva bloqueia a árvore de importação se o módulo for trazido para o cliente.
2. **`lib/offers/service-client.ts:38-44`**: o cliente Supabase é criado sem persistência de sessão, sem refresh de token e sem detecção de sessão na URL (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`). Não manipula cookies.
3. O módulo consome `env.supabase.serviceRoleKey` e lança `ServiceClientConfigError` se a chave não estiver configurada (fail-closed).
4. Teste: `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` (service-client) valida o comportamento defensivo quando a chave de serviço não está configurada.

## Código relevante

- `lib/offers/service-client.ts`
