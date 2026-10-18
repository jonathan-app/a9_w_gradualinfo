# Evidência AC-01 — Worker entrypoint com validação real de JWT

## Status: PASS

## Critério
admin-auth/AC-01: O servidor local e o harness de testes executam através do entrypoint do Worker
(scripts/cloudflare-worker.ts). O harness envia JWTs de teste pelo fluxo real de validação do Worker
(Cf-Access-Jwt-Assertion), garantindo que o contexto ADMIN_ACCESS_REQUEST_CONTEXT seja gerado
estritamente após a validação criptográfica bem sucedida do token contra o JWKS de teste, sem
qualquer injeção direta que contorne essa etapa.

## O que foi verificado
1. **Entrypoint do Worker e Patch Versionado**: `scripts/cloudflare-worker.ts` atua como interceptor do Cloudflare Worker
   e despacha para `dispatchWithAdminAccess` em `lib/admin/access-worker.ts`. O patch `patches/@opennextjs__cloudflare@1.20.10.patch`
   está registrado em `pnpm-workspace.yaml` e `pnpm-lock.yaml`, validado com instalação limpa (`rm -rf node_modules && pnpm install`)
   seguida de `./node_modules/.bin/opennextjs-cloudflare build` (exit 0).
2. **Chaves e JWKS de Teste Efêmeros e Isolados**: `scripts/e2e-server.mjs` gera par RS256 efêmero em
   `.wrangler/test-access-keys.json` (ignorado pelo Git) e injeta somente a chave pública em `ADMIN_ACCESS_KEY_PAIR`
   no `.dev.vars`. O helper `isTestAccessHarnessAllowed(bindings)` em `lib/admin/access.ts` garante que chaves de
   teste e normalizações locais nunca operem em produção (`NODE_ENV === 'production'` ou domínio `gradualinfo.com.br`).
3. **Validação Criptográfica**: `admitAdminAccess` em `lib/admin/access.ts` valida a assinatura RS256,
   confere `iss`, `aud`, `exp`, `email === ADMIN_ACCESS_OWNER_EMAIL` e `type === 'app'`, congelando
   o contexto `ADMIN_ACCESS_REQUEST_CONTEXT` (`Object.freeze`) antes de repassar ao OpenNext.
4. **Execução Integrada Vitest (16/16 PASS)**: `__tests__/integration/spec-0018-real-auth.test.ts` (AC-01) valida que o
   entrypoint aceita token assinado com a chave de teste, gera o contexto, rejeita qualquer token adulterado e
   **ignora `ADMIN_ACCESS_KEY_PAIR` quando os bindings indicam produção** (`NODE_ENV=production` ou `gradualinfo.com.br`).
5. **Execução Integrada E2E no Navegador (sem `E2E_TEST`)**: `e2e/admin-dashboard.spec.ts` (`Fluxo REAL`) inicia o
   Worker via `scripts/e2e-server.mjs` (`wrangler dev --port 3101 --local`) com `E2E_TEST` removido do processo, enviando o
   cookie `CF_Authorization` assinado com a chave privada efêmera de teste e validado no entrypoint.

## Comandos executados
- `rm -rf node_modules && pnpm install && ./node_modules/.bin/opennextjs-cloudflare build` (exit 0)
- `./node_modules/.bin/vitest run __tests__/integration/spec-0018-real-auth.test.ts` (16/16 PASS, exit 0)
- `E2E_REAL_SUPABASE=1 ./node_modules/.bin/playwright test e2e/admin-dashboard.spec.ts -g "Fluxo REAL"` (3/3 PASS, exit 0, sem `E2E_TEST=1`)

## Resultado
Aprovado com execução empírica real (instalação limpa + build OpenNext + Vitest integrado + Playwright E2E em navegador Chromium com mocks desativados).
