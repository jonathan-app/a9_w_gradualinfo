# Evidência AC-07 — Logout seguro com remoção de cookies SSR

## Status: PASS

## Critério
admin-auth/AC-07: O endpoint /api/admin/auth/logout invoca a revogação de sessão no Supabase e
remove os cookies de autenticação gerenciados pelo SDK Supabase SSR (sb-*-auth-token e fragmentos
numerados), utilizando os nomes e atributos fornecidos pelo SDK, sem interferir em cookies de
outros domínios nem no cookie de identidade de borda do Cloudflare Access.

## O que foi verificado
1. **Revogação no Servidor**: `app/api/admin/auth/logout/route.ts` invoca `supabase.auth.signOut()`
   no Supabase GoTrue real, invalidando o token de acesso e a sessão.
2. **Remoção de Cookies**: O finalizador `finish(response, true)` em `lib/admin/session-response.ts`
   reaplica todos os cookies gerenciados pelo SDK (`sb-*-auth-token`) com `maxAge: 0` e `expires: new Date(0)`.
3. **Preservação de Cookies Alheios**: Cookies de borda do Access (`CF_Authorization`) e cookies de terceiros
   não são tocados.
4. **Execução Integrada Vitest**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-07) autentica contra
   o GoTrue local, chama `signOut`, confirma que a sessão é revogada e que chamadas subsequentes com o token
   antigo são rejeitadas.
5. **Execução E2E no Navegador**: `e2e/admin-dashboard.spec.ts` (`Fluxo REAL`):
   - Logout a partir da sessão AAL2 invoca `/api/admin/auth/logout`, limpa cookies, redireciona 303 para
     `/admin-dashboard/login`, e tentativa de acesso subsequente a `/admin-dashboard` é barrada e redirecionada.

## Comandos executados
- `pnpm vitest run __tests__/integration/spec-0018-real-auth.test.ts -t "AC-07"` (1/1 PASS, exit 0)
- `E2E_REAL_SUPABASE=1 npx playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"` (3/3 PASS, exit 0, sem `E2E_TEST=1`)

## Resultado
Aprovado com revogação e remoção comprovadas no GoTrue local e no navegador real (mocks desativados).
