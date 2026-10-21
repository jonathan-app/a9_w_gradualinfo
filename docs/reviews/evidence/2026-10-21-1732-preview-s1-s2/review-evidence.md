# Evidência da revisão de S1 e S2

Commit avaliado: `c92e1bb24ab209c530e34f77742722846d23fad1`.

Spec vigente: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`, especialmente `sanity/AC-05`.

## S1, autorização de preview

`app/api/preview/route.ts` valida o segredo em tempo constante, a origem, o usuário retornado por `auth.getUser()`, o UUID exato configurado, os claims assinados `sub` e `session_id`, e cria a sessão no Durable Object antes de emitir o cookie. O commit remove apenas `app_metadata.preview` como autoridade paralela.

Resultado: PASS.

## S2, revogação sem fallback legado

`lib/preview/auth.ts` consulta primeiro o Durable Object. Um grant atual autorizado retorna `true`. Um grant atual existente, porém recusado pelo Durable Object, retorna `false` antes do caminho legado. Assim, sessão revogada, expirada ou ausente não pode ser recuperada por claims antigos do Supabase.

`__tests__/unit/preview-security.test.ts` comprova que uma cópia do cookie capturada antes do logout recebe 404 depois da revogação. `__tests__/integration/preview-cookie-reuse.test.ts` comprova a persistência do estado revogado e a recusa da mesma cópia.

Resultado: PASS.

## Comandos executados

`node_modules/.bin/vitest run __tests__/unit/preview-route.test.ts __tests__/unit/preview-auth-accessible.test.ts __tests__/unit/preview-security.test.ts __tests__/integration/preview-cookie-reuse.test.ts`

Resultado: 4 arquivos e 44 testes aprovados.

`node_modules/.bin/tsc --noEmit --pretty false`

Resultado: código de saída 0.

## Achados

Nenhum BLOCKER, WARNING ou NIT no escopo de S1 e S2.
