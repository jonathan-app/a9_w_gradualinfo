# Evidência AC-04 — Login primeiro degrau contra Supabase Auth

## Status: PASS

## Critério
admin-auth/AC-04: O endpoint /api/admin/auth/login autentica o primeiro degrau (email e senha)
contra a API oficial do Supabase Auth no servidor, retornando redirecionamento com erro sanitizado
sob credenciais invalidas (senha incorreta) e rejeitando imediatamente qualquer identidade cujo UUID
seja divergente de ADMIN_USER_ID.

## O que foi verificado
1. **Autenticação no Servidor**: `app/api/admin/auth/login/route.ts` autentica credenciais reais contra o
   Supabase GoTrue (`supabase.auth.signInWithPassword`), sem mocks.
2. **Senha Incorreta**: Sob senha inválida, redireciona 303 com `error=invalid_credentials`, sem emitir
   cookies de sessão.
3. **UUID Não Autorizado**: Autenticação de usuário com UUID diferente de `ADMIN_USER_ID` revoga imediatamente
   a sessão local (`supabase.auth.signOut({ scope: 'local' })`), descarta cookies e redireciona com
   `error=invalid_credentials`.
4. **Execução Integrada Vitest**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-04) testa login real,
   senha incorreta e UUID não autorizado contra o contêiner Supabase local.
5. **Execução E2E no Navegador**: `e2e/admin-dashboard.spec.ts` (`Fluxo REAL`):
   - Teste 2: senha incorreta redireciona para `/admin-dashboard/login?error=invalid_credentials`.
   - Teste 3: `bruno@exemplo.dev` (UUID divergente) é imediatamente revogado e redirecionado com erro sanitizado.

## Comandos executados
- `pnpm vitest run __tests__/integration/spec-0018-real-auth.test.ts -t "AC-04"` (3/3 PASS, exit 0)
- `E2E_REAL_SUPABASE=1 npx playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"` (3/3 PASS, exit 0, sem `E2E_TEST=1`)

## Resultado
Aprovado com validação no GoTrue local e no navegador real (mocks desativados).
