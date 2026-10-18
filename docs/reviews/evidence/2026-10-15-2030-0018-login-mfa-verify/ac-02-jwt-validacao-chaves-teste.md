# Evidência AC-02 — Validação de JWT contra chaves de teste

## Status: PASS

## Critério
admin-auth/AC-02: A admissão local valida tokens JWT contra par de chaves e configurações
exclusivas do ambiente de teste, rejeitando comprovadamente assinaturas forjadas, tokens
expirados, emissores invalidos e audiencias divergentes de ADMIN_ACCESS_AUD.

## O que foi verificado
- `admin-access.test.ts`: 21 testes passando, incluindo `isTestAccessHarnessAllowed` (bloqueio incondicional quando `NODE_ENV === 'production'`, `NEXT_PUBLIC_SITE_URL` contém `gradualinfo.com.br` ou `ADMIN_ACCESS_HOSTS` contém `gradualinfo.com.br`), classificação de caminhos e respostas de falha.
- `admin-access-crypto.test.ts`: 11 testes passando, incluindo validação de chaves JWK (somente RSA, somente RS256, sem chaves privadas, kid único, key_ops somente verify).
- `spec-0018-real-auth.test.ts` (AC-02): 4 testes integrados comprovando rejeição de JWT com assinatura forjada, token expirado, audiência divergente e emissor inválido.

## Comandos executados
- `./node_modules/.bin/vitest run __tests__/unit/admin-access.test.ts __tests__/unit/admin-access-crypto.test.ts __tests__/integration/spec-0018-real-auth.test.ts`

## Resultado
48 testes passando (21 + 11 + 16), 0 falhas.
