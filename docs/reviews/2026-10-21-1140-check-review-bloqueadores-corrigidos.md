# /check review — correção dos BLOCKERs (lacunas 2 e 3)

**Data**: 2026-10-21  
**Status**: APROVADO (zero BLOCKERs)  
**Arquivos alterados**: `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`, `lib/offers/evidence-canonicalizer.ts`

## Resumo

Ambos os BLOCKERs identificados na revisão anterior foram corrigidos sem casts inseguros, sem `@ts-ignore`, sem desativação de regras ESLint e sem relaxamento global de tipos.

## BLOCKER 1 — `as any` removido (route.ts)

**Antes**:

```ts
const webhookAuth = await verifyWebhookSignature(request, rawBodyText, {
  supabaseClient: serviceClient as any,
});
```

**Depois**: Um adaptador mínimo `SupabaseClientForWebhookNonce` expõe apenas `from().insert()` com o contrato exigido, construído a partir do `SupabaseClient` real sem casts inseguros. O cliente continua sendo usado com seu tipo completo (`SupabaseClient`) para a chamada RPC `evaluate_and_set_verified_price`.

**Tipo importado**: `SupabaseClientForWebhookNonce` de `@/lib/offers/webhook-auth`.

## BLOCKER 2 — Arrays esparsos rejeitados (evidence-canonicalizer.ts)

**Antes**: `canonicalizeJson` usava `value.map(...)` diretamente em arrays, ignorando índices ausentes sem detectar lacunas.

**Depois**: Antes de serializar, o código verifica se todo índice existe (`index in value`). Arrays com qualquer lacuna lançam `InvalidEvidenceFormatError` com mensagem `"Arrays esparsos são proibidos na canonização RFC 8785."` Arrays densos (incluindo `null` explícito) continuam sendo serializados normalmente.

## Testes de regressão

Já existentes em `__tests__/unit/lib/offers/evidence-canonicalizer.test.ts` (38 testes, todos PASS):

- Array esparso: `new Array(2); sparse[1] = 1` → `InvalidEvidenceFormatError`
- Array com lacuna intermediária: `[1, 2]; arr[4] = 5` → `InvalidEvidenceFormatError`
- Array denso com `null` explícito: `[1, null, 3]` → `'[1,null,3]'`
- Arrays densos válidos: `[3, 2, 1]` → `'[3,2,1]'`

Rejeição de surrogates UTF-16 isolados e vetores normativos da RFC 8785 continuam passando (38/38 testes).

## Validação executada

| Comando                                          | Resultado                      |
| ------------------------------------------------ | ------------------------------ |
| `pnpm tsc --noEmit`                              | exit 0                         |
| `npx eslint` (arquivos alterados)                | exit 0                         |
| `npx prettier --check` (arquivos alterados)      | exit 0                         |
| `pnpm vitest run` (canonicalizer + webhook-auth) | 50/50 PASS                     |
| `pnpm check:all`                                 | exit 0 (957 testes, 89 suites) |
| `pnpm security:secrets` (gitleaks)               | 0 findings                     |
| `pnpm security:sast` (semgrep)                   | 0 findings ERROR               |
| `git diff --check`                               | exit 0                         |

## Limitações restantes

A concorrência real de nonces no PostgreSQL (duas conexões independentes) permanece pendente para `/check verify`. Não foi comprovada por testes unitários nem pela existência de chave primária na tabela `offers_ingest_nonces`.

## Veredito

**APROVADO** — zero BLOCKERs, zero WARNINGs relacionados à correção. Pronto para prosseguir com `/check verify` de concorrência de nonces em ambiente de teste.
