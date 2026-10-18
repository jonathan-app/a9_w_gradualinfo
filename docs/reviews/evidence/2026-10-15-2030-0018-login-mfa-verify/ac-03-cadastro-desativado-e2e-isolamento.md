# Evidência AC-03 — Cadastro desativado e isolamento E2E_TEST

## Status: PASS

## Critério
admin-auth/AC-03: A diretiva enable_signup é definida como false nas seções [auth] e
[auth.email] do arquivo supabase/config.toml, e a simulação por cookie em lib/supabase/server.ts
exige a flag explícita E2E_TEST=1 com bloqueio incondicional caso NODE_ENV === 'production'.

## O que foi verificado
- `supabase/config.toml` linha 179: `enable_signup = false` na seção `[auth]`
- `supabase/config.toml` linha 224: `enable_signup = false` na seção `[auth.email]`
- `supabase/config.toml` linha 262: `enable_signup = false` na seção `[auth.sms]`
- `lib/supabase/server.ts` linha 45: `isMockAllowed = process.env.NODE_ENV !== 'production' && !env.NEXT_PUBLIC_SITE_URL.includes('gradualinfo.com.br') && process.env.E2E_TEST === '1'`
- `lib/supabase/server.ts` linha 50: o cookie `__e2e_session_role` só é lido quando `isMockAllowed` é `true`; caso contrário é `undefined` (bloqueio absoluto)
- `scripts/e2e-server.mjs`: remove explicitamente `delete workerEnv.E2E_TEST` antes de iniciar o `wrangler dev` quando `E2E_REAL_SUPABASE === '1'`
- `e2e/admin-dashboard.spec.ts` (`Fluxo REAL`): comprova `expect(process.env.E2E_TEST).toBeUndefined()`, injeta `__e2e_session_role=admin_aal2` no navegador e verifica que o servidor ignora o cookie e redireciona para `/admin-dashboard/login`, além de confirmar ausência de `__e2e_session_role` após o login real no GoTrue
- `__tests__/integration/spec-0018-real-auth.test.ts` (AC-03): confirma HTTP 422 ao tentar `signUp` contra o GoTrue local

## Comandos executados
- `./node_modules/.bin/vitest run __tests__/unit/supabase-server.test.ts __tests__/integration/spec-0018-real-auth.test.ts` (exit 0)
- `E2E_REAL_SUPABASE=1 ./node_modules/.bin/playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"` (3/3 PASS, exit 0)

## Resultado
Configuração verificada em código, GoTrue local e navegador real com mocks desativados.
