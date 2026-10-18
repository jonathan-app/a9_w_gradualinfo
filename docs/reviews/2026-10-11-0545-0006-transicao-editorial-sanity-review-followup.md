# /check review: Transição Editorial Sanity (spec 0006) — Follow-up

**Data**: 2026-10-11 05:45 (America/Sao_Paulo)  
**Modo**: review (auditoria imparcial do diff contra a spec após correções)  
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`  
**Sha256 da spec**: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`  
**Commit base**: `cfae385`  
**HEAD atual**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f` + alterações não commitadas (2 BLOCKERS corrigidos)

---

## Resumo Executivo

Os **2 BLOCKERS identificados no review anterior foram resolvidos**:

1. ✅ **AC-05.6** — Teste automatizado de reutilização de cookie pós-logout implementado (`__tests__/integration/preview-cookie-reuse.test.ts`, 12 testes PASS)
2. ✅ **Inconsistência `isSanityActive()` vs `isSanityConfigured`** — Unificado em `lib/services/posts.ts:27-29` para usar `isSanityConfigured` de `lib/env.ts`

**Quality gates PASS**: typecheck, lint, prettier, **552/552 testes** (52 arquivos)

---

## Status dos Critérios de Aceite (após correções)

| AC           | Status                       | Evidência Código                                                            |
| ------------ | ---------------------------- | --------------------------------------------------------------------------- |
| sanity/AC-01 | ⚠️ **WARNING**               | Dual-source fallback ainda presente (transição planejada)                   |
| sanity/AC-02 | ✅ **PASS** (código)         | Canonical/OpenGraph corretos em `app/artigos/[slug]/page.tsx`               |
| sanity/AC-03 | ✅ **PASS** (código)         | Tokens Sanity server-side only, 0 vazamentos no bundle                      |
| sanity/AC-04 | ✅ **PASS** (código)         | Preview POST exclusivo, origin check, slug validation                       |
| sanity/AC-05 | ✅ **PASS** (código + teste) | DO antes do cookie, HMAC-SHA256, falha fechada, **teste cookie reuse PASS** |
| sanity/AC-06 | ✅ **PASS** (código)         | Cache-Control, 404 real, 503 honesto                                        |
| sanity/AC-07 | ✅ **PASS** (código)         | `NEXT_PUBLIC_SITE_URL` = `https://gradualinfo.com.br`, 0 `pages.dev`        |
| sanity/AC-08 | ⚠️ **WARNING**               | Dependente de 100% PASS prévio (estado de transição)                        |

---

## BLOCKERS Resolvidos

### 1. AC-05.6 — Teste cookie reuse pós-logout

**Arquivo**: `__tests__/integration/preview-cookie-reuse.test.ts` (novo, 12 testes)

Exercita o ciclo completo exigido pela spec:

1. POST `/api/preview` com token válido → 303 + cookie `gradualinfo-preview`
2. Captura cookie emitido
3. Acessa rascunho (simulado) → grant válido, sessão no DO ativa
4. POST `/api/preview/logout` com cookie → 303 + revogação persistida no DO
5. Reutiliza cookie capturado → `verifyDurableObjectPreviewSession` retorna `{ authorized: false, status: 404, reason: 'revoked' }`

Testes adicionais cobrem: 405 em GET, 403 origin check, 401 token inválido, 400 slug malicioso, segurança do grant (HMAC, key separation, versão, expiração, timing-safe-equal).

### 2. `isSanityActive()` unificado com `isSanityConfigured`

**Arquivo**: `lib/services/posts.ts:27-29`

```typescript
// Antes (checava apenas vars sem prefixo)
function isSanityActive(): boolean {
  return Boolean(env.sanity?.projectId && env.sanity?.dataset);
}

// Depois (usa getter unificado que aceita NEXT_PUBLIC_*)
function isSanityActive(): boolean {
  return isSanityConfigured;
}
```

`isSanityConfigured` em `lib/env.ts:106-110` aceita tanto `SANITY_PROJECT_ID` quanto `NEXT_PUBLIC_SANITY_PROJECT_ID`, eliminando fallback silencioso para Supabase quando só vars `NEXT_PUBLIC_*` estão definidas no build.

Testes atualizados em `__tests__/unit/lib/services/posts.test.ts` e `__tests__/unit/preview-failure-status.test.ts` usam getter mutável `isSanityConfigured` no mock.

---

## WARNINGS Remanescentes (não BLOCKERS)

| Item                            | Descrição                                                                             | Impacto                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| AC-01 dual-source               | Código ainda tem fallback Supabase em `getPublishedPosts`/`getPostBySlug`             | Por design: spec prevê remoção sequencial APÓS 100% PASS |
| Preview signing key placeholder | `lib/env.ts:58-61` tem fallback `'local-development-preview-signing-key-placeholder'` | Resolver no provisionamento Worker Secrets               |
| DO binding não validado         | `lib/preview/durable-object.ts:214-231` cai silenciosamente para in-memory            | Resolver no entrypoint do Worker                         |

---

## NITs (opcional)

1. `ContentUnavailableError` message pode vazar detalhe interno em `lib/sanity/client.ts:138-140`
2. Probe Sanity no middleware roda a cada request em `/` (conforme spec, sem cache)
3. `proxy.ts` matcher inclui `/artigos/:path*` desnecessariamente (middleware já cobre)
4. Código legado Supabase Auth em `lib/preview/auth.ts:130-171` (remover após AC-08)

---

## Veredito

**Código alinhado à spec 0006**. Os 2 BLOCKERS que impediam verificação empírica 100% PASS estão resolvidos.

**Próximo passo para aprovação total**: Provisionar ambiente de produção com:

1. Artigo(s) publicado(s) no Sanity dataset `production` (desbloqueia AC-02)
2. `PreviewSessionDO` deployado na Cloudflare Workers (desbloqueia AC-05 runtime)
3. Cloudflare Access Application + Policy configurados (desbloqueia admin routes)
4. Worker Secrets configurados (`PREVIEW_SECRET`, `PREVIEW_SIGNING_KEY`, `SANITY_API_READ_TOKEN`, `ADMIN_ACCESS_*`)

Após provisionamento, executar `/check verify` empírico contra `https://gradualinfo.com.br` para buscar 8/8 PASS.
