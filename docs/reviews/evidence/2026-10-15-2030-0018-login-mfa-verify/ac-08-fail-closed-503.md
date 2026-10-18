# Evidência AC-08 — Fail closed 503 na indisponibilidade do Supabase Auth

## Status: PASS

## Critério
admin-auth/AC-08: Caso o serviço de autenticação Supabase esteja indisponível, o sistema opera em
modo fail closed, retornando status 503 com mensagem sanitizada e sem expor detalhes internos de
conexão.

## O que foi verificado
1. **Tratamento Fail-Closed no Login**: `app/api/admin/auth/login/route.ts` detecta erros de indisponibilidade
   (`AuthRetryableFetchError`, `fetch failed`, status >= 500) e retorna HTTP 503 com `Retry-After: 5`
   e mensagem sanitizada "Serviço de autenticação temporariamente indisponível."
2. **Tratamento Fail-Closed na Admissão Access**: `lib/admin/access.ts` e `lib/admin/access-guard.ts`
   retornam HTTP 503 fail-closed sob falhas de contexto ou indisponibilidade de infraestrutura.
3. **Tratamento Fail-Closed no Desafio MFA**: `resolveAdminMfaLadder` e `checkAdminUser` em `lib/admin/auth.ts`
   lançam ou retornam `mfa_challenge_required` em caso de erro no subsistema MFA, impedindo qualquer elevação indevida.
4. **Execução Integrada Vitest**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-08) simula endpoint
   inacessível do Supabase e comprova resposta HTTP 503 com mensagem sanitizada e cabeçalhos de segurança.

## Comandos executados
- `pnpm vitest run __tests__/integration/spec-0018-real-auth.test.ts -t "AC-08"` (1/1 PASS, exit 0)
- `pnpm vitest run __tests__/unit/supabase-server.test.ts __tests__/unit/admin-access.test.ts` (19/19 PASS, exit 0)

## Resultado
Aprovado com fail-closed 503 comprovado em testes de integração e unitários.
