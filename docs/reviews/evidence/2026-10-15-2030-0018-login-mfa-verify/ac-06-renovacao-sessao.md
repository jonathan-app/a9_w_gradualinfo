# Evidência AC-06 — Renovação controlada de sessão

## Status: PASS

## Critério
admin-auth/AC-06: A sessão mantém renovação controlada via refresh token em chamadas autenticadas
do proxy, expirando naturalmente quando o tempo de concessão se esgota sem renovação válida.

## O que foi verificado
1. **Renovação SSR**: `lib/supabase/middleware.ts` e `proxy.ts` invocam `updateSession`, chamando
   `supabase.auth.getUser()`, que dispara a renovação automática de token expirado pelo SDK `@supabase/ssr`.
2. **Propagação de Cookies**: `lib/admin/session-response.ts` e `lib/supabase/server.ts` capturam as opções
   de cookies emitidas pelo SDK (`setAll`) e garantem sua entrega no cabeçalho `Set-Cookie` da resposta.
3. **Execução Integrada Vitest**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-06) autentica contra
   o GoTrue local, obtém `refresh_token`, renova a sessão através de `POST /auth/v1/token?grant_type=refresh_token`,
   e comprova rejeição de refresh token corrompido ou inválido.

## Comandos executados
- `pnpm vitest run __tests__/integration/spec-0018-real-auth.test.ts -t "AC-06"` (1/1 PASS, exit 0)
- `pnpm vitest run __tests__/unit/supabase-middleware.test.ts __tests__/unit/proxy.test.ts` (14/14 PASS, exit 0)

## Resultado
Aprovado com renovação comprovada contra o GoTrue local.
