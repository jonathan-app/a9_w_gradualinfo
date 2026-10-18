# Evidência AC-05 — Escada MFA, elevação AAL2 e bloqueio AAL1

## Status: PASS

## Critério
admin-auth/AC-05: A escada de MFA suporta matrícula inicial de fator TOTP e desafio subsequente
por código de seis dígitos, elevando para AAL2 somente após confirmação bem-sucedida, rejeitando
códigos incorretos ou reutilizados. Páginas administrativas sob AAL1 redirecionam para
/admin-dashboard/mfa/verify (ou /setup). APIs administrativas sob AAL1 recusam com HTTP 403 sem
executar a operação.

## O que foi verificado
1. **Matrícula Inicial**: `app/api/admin/auth/mfa/enroll/route.ts` invoca `supabase.auth.mfa.enroll`,
   gerando chave secreta base32 e QR code transitórios.
2. **Escada MFA**: `resolveAdminMfaLadder` em `lib/admin/auth.ts` inspeciona fatores (`listFactors().all`)
   e nível AAL (`getAuthenticatorAssuranceLevel`). Sessões AAL1 sem fator vão para `/setup`; com fator
   vão para `/verify`.
3. **Bloqueio de AAL1**: Páginas redirecionam para `/verify` ou `/setup`; APIs administrativas (`assertAdminApiAuth`)
   recusam com HTTP 403 e mensagem controlada.
4. **Elevação e Rejeição**: `app/api/admin/auth/mfa/verify/route.ts` invoca `challengeAndVerify`,
   elevando a sessão para AAL2 e rejeitando códigos inválidos ou reutilizados.
5. **Execução Integrada Vitest**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-05) exercita matrícula real,
   rejeição de código incorreto e elevação para AAL2 com código TOTP gerado via RFC 6238 contra o Supabase local.
6. **Execução E2E no Navegador**: `e2e/admin-dashboard.spec.ts` (`Fluxo REAL`):
   - Teste 1: prova negativa de que `__e2e_session_role=admin_aal2` injetado é ignorado → login real → matrícula TOTP em `/setup` → tentativa de acesso ao dashboard força redirect para `/verify` (AAL1) → preenchimento do código TOTP de 6 dígitos → elevação para AAL2 e acesso ao dashboard.
7. **Higiene Operacional do Banco Local**: A instância `supabase_db_gradualinfo-editorial` é um contêiner Podman local isolado e descartável de desenvolvimento/teste; o helper `cleanupRealAuthState` restringe `DELETE FROM auth.mfa_factors` e `DELETE FROM auth.sessions` estritamente aos UUIDs de teste (`WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')`).

## Comandos executados
- `./node_modules/.bin/vitest run __tests__/integration/spec-0018-real-auth.test.ts -t "AC-05"` (3/3 PASS, exit 0)
- `E2E_REAL_SUPABASE=1 ./node_modules/.bin/playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"` (3/3 PASS, exit 0, sem `E2E_TEST=1`, comprovando ausência de `__e2e_session_role` e emissão de `sb-*-auth-token` pelo GoTrue)

## Resultado
Aprovado com validação no GoTrue local e no navegador real (mocks desativados).
