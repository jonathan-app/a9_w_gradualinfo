# /check review: Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-11 03:52 (America/Sao_Paulo)  
**Modo**: review (auditoria imparcial do diff contra a spec)  
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`  
**Sha256 da spec**: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`  
**Commit base**: `cfae385` (antes do feat)  
**Commit head**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f` (HEAD atual)  
**Arquivos auditados**: `lib/sanity/client.ts`, `lib/preview/session.ts`, `lib/preview/auth.ts`, `lib/preview/durable-object.ts`, `lib/preview/config.ts`, `lib/services/posts.ts`, `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `proxy.ts`, `app/api/preview/route.ts`, `app/api/preview/logout/route.ts`, `app/artigos/[slug]/page.tsx`, `app/page.tsx`, `app/editorial-indisponivel.tsx`, `lib/errors/content.ts`, `lib/env.ts`, `lib/site-config.ts`, `lib/security-headers.ts`, `wrangler.jsonc`, `next.config.ts`

---

## Resumo Executivo

A implementação cobre os 8 ACs da spec 0006 com **2 BLOCKERS**, **3 WARNINGS** e **4 NITs**. A arquitetura está correta e alinhada às decisões técnicas da spec (Sanity como fonte primária, DO para revogação imediata, probe de 800ms no proxy, falha fechada 404/503). Os BLOCKERS são lacunas específicas de teste automatizado e inconsistência de configuração que impedem a validação empírica completa.

---

## Análise por Critério de Aceite

### sanity/AC-01 — Fonte única Sanity, sem dual-source ativo

**Status**: ⚠️ **WARNING**  
**Arquivo**: `lib/services/posts.ts:27-29, 79-82, 112-118`  
**Análise**: A função `isSanityActive()` verifica `env.sanity?.projectId && env.sanity?.dataset`. Quando verdadeiro, usa exclusivamente Sanity (`getSanityPublishedPosts`, `getSanityPostBySlug`). Quando falso, cai para Supabase (linhas 84-95, 121-149).  
**Problema**: O código **ainda contém o fallback dual-source** (Supabase), contradizendo "sem dual-source ativo" do AC-01. A spec prevê remoção sequencial (seção 4: "Validação Prévia do Sanity → Retirada Sequencial"), mas o AC-01 descreve o estado final. A implementação atual é o estado de transição.  
**Recomendação**: Após 100% PASS empírico (AC-08), remover o bloco `else` (Supabase) de `getPublishedPosts` e `getPostBySlug`.

---

### sanity/AC-02 — Slugs, URL structure, OpenGraph/canonical

**Status**: ✅ **PASS** (código)  
**Arquivo**: `app/artigos/[slug]/page.tsx:49-98`, `lib/site-config.ts:16`  
**Análise**: `generateMetadata` constrói `canonical: ${SITE_ORIGIN}/artigos/${post.slug}` e OpenGraph `url` idêntico. `SITE_ORIGIN` deriva de `env.siteUrl` (`NEXT_PUBLIC_SITE_URL`). Estrutura de slug preservada (`/artigos/[slug]`).  
**Nota**: Verify empírico marcou UNVERIFIABLE por falta de artigos publicados no Sanity dataset `production`. Código está correto.

---

### sanity/AC-03 — Server-side only, tokens não vazam no bundle

**Status**: ✅ **PASS** (código)  
**Arquivo**: `lib/sanity/client.ts:93-159`, `lib/services/posts.ts`, `app/artigos/[slug]/page.tsx`  
**Análise**: Cliente Sanity só importado em Server Components (`app/page.tsx`, `app/artigos/[slug]/page.tsx`) e Route Handlers (`app/api/preview/*`). Token lido de `env.sanity.readToken` (variável server-only). `lib/env.ts` usa `server-only` no cliente Supabase server. Verify empírico confirmou 0 ocorrências de token no bundle `.next/static/`.

---

### sanity/AC-04 — Preview POST exclusivo, segredo no corpo, origem validada, slug restrito

**Status**: ✅ **PASS** (código)  
**Arquivo**: `app/api/preview/route.ts:77-173`, `app/api/preview/logout/route.ts:31-116`  
**Análise**:

- GET → 405 com `Allow: POST` (ambas rotas)
- Origin check: `request.headers.get('origin') !== SITE_ORIGIN` → 403 (linhas 78-80, 32-36)
- Token no corpo (form/JSON), não na URL (linhas 95-112)
- Slug validado com regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (linha 115)
- Rate limit 20 req/min por IP em memória (linhas 32-55)
- Comparação segredo em tempo constante via `equalSecret` (HMAC-SHA256, `lib/preview/session.ts:58-63`)  
  **Conformidade total** com AC-04.

---

### sanity/AC-05 — DO consistência forte, HMAC-SHA256 1800s, sem cache, falha fechada, logout pós-persistência, teste cookie reuse

**Status**: 🔴 **BLOCKER** (item 6 faltando)  
**Arquivos**: `lib/preview/session.ts`, `lib/preview/durable-object.ts`, `lib/preview/auth.ts`, `app/api/preview/route.ts`, `app/api/preview/logout/route.ts`  
**Análise item a item**:

1. ✅ Sessão criada no DO **antes** de emitir cookie (`app/api/preview/route.ts:130-141`)
2. ✅ Cookie HMAC-SHA256 com key separation (`gradualinfo-preview:v1`), TTL 1800s (`lib/preview/session.ts:26, 71-76, 88-104`)
3. ✅ Consulta ao DO sem cache intermediário a cada auth (`lib/preview/auth.ts:50-83`, `verifyDurableObjectPreviewSession` chama `store.validateSession` direto)
4. ✅ Falha fechada:
   - Grant inválido/expirado/revogado + artigo não público → 404 (`lib/preview/auth.ts:55-71, 113-119`)
   - DO indisponível durante auth → 503 sem entregar rascunho (`lib/preview/auth.ts:79-81`)
   - Artigo público acessível sem preview (`lib/preview/auth.ts:100-102`)
5. ✅ Logout confirma 303 **após** persistir revogação no DO (`app/api/preview/logout/route.ts:44-54, 77-84`)
6. ❌ **BLOCKER**: Teste automatizado de reutilização de cópia do cookie pós-logout **não existe**. A spec exige explicitamente: "Reutilização de cópia do cookie após logout é rejeitada com 404 em teste automatizado". Não há teste em `__tests__/` que: (a) autentica via POST `/api/preview`, (b) captura cookie, (c) acessa rascunho com sucesso, (d) POST `/api/preview/logout`, (e) reenvia cookie capturado e verifica 404.

---

### sanity/AC-06 — Cache-Control no-store, 404 real, 503/500 sem mascarar como 404

**Status**: ✅ **PASS** (código)  
**Arquivo**: `lib/supabase/middleware.ts:127, 189-206, 139-152, 175-180`, `lib/preview/auth.ts:113-119`  
**Análise**:

- `private, no-store` em rotas de artigo/preview/admin (linha 127)
- 404 real via rewrite para `/_not-found` com status 404 + headers segurança (linhas 189-206)
- 503 via `unavailableResponse` para DO indisponível e `ContentUnavailableError` (linhas 175-180, 144-151)
- Home probe retorna 503 em falha Sanity (linhas 139-152)
- Erros de infraestrutura propagam `ContentUnavailableError` → 503, nunca viram 404 (`lib/preview/auth.ts:195-200, 223-227`)

---

### sanity/AC-07 — NEXT_PUBLIC_SITE_URL domínio oficial, sem gradualinfo.pages.dev

**Status**: ✅ **PASS** (código)  
**Arquivo**: `lib/env.ts:42`, `lib/site-config.ts:16`, `wrangler.jsonc`, `app/artigos/[slug]/page.tsx:68`, `app/page.tsx:33`  
**Análise**: `env.siteUrl` = `NEXT_PUBLIC_SITE_URL` (produção: `https://gradualinfo.com.br`). `SITE_ORIGIN` normaliza sem barra final. Canonical em artigo e home usam `SITE_ORIGIN`. `wrangler.jsonc` define `NEXT_PUBLIC_SITE_URL: "https://gradualinfo.com.br"`. Grep em todo código: 0 ocorrências de `gradualinfo.pages.dev` (apenas em docs/histórico). Verify empírico confirmou.

---

### sanity/AC-08 — Supabase desonerado editorial/preview após 100% PASS Sanity

**Status**: ⚠️ **WARNING** (estado de transição)  
**Arquivo**: `lib/services/posts.ts:79-95, 112-149`, `lib/preview/auth.ts:130-171`  
**Análise**: Código ainda mantém caminho Supabase como fallback (`isSanityActive() === false`) e verificação legada de preview via Supabase Auth (`verifyPreviewSession` linhas 130-171). Isso é **por design** conforme seção 4 da spec ("Descomissionamento Sequencial": validar 100% PASS → retirar dependência → preservar backup).  
**Problema**: AC-08 é o passo final que **depende** dos ACs 1-7 estarem 100% PASS. Como AC-05 tem BLOCKER (teste faltando) e AC-01 tem WARNING (dual-source no código), AC-08 não pode ser considerado cumprido.  
**Recomendação**: Resolver BLOCKERS dos ACs 1-7 → reavaliar AC-08 → então remover código Supabase editorial.

---

## Findings Adicionais (não mapeados a AC específico)

### 🔴 BLOCKER: Inconsistência `isSanityActive()` vs `isSanityConfigured`

**Arquivo**: `lib/services/posts.ts:27-29` vs `lib/env.ts:106-110`  
`isSanityActive()` checa apenas `env.sanity?.projectId && env.sanity?.dataset` (vars sem prefixo).  
`isSanityConfigured` checa `SANITY_PROJECT_ID` **OU** `NEXT_PUBLIC_SANITY_PROJECT_ID` **E** `SANITY_DATASET` **OU** `NEXT_PUBLIC_SANITY_DATASET`.  
**Risco**: Se apenas `NEXT_PUBLIC_SANITY_PROJECT_ID` estiver definido (build), `isSanityConfigured=true` mas `isSanityActive()=false` → fallback para Supabase silencioso.  
**Correção**: Unificar a lógica ou documentar explicitamente qual variável controla o path ativo.

### 🟡 WARNING: Preview signing key com fallback inseguro em produção

**Arquivo**: `lib/env.ts:58-61`  
`previewSigningKey` tem fallback `'local-development-preview-signing-key-placeholder'`. Em produção, **deve** vir de Worker Secret (`PREVIEW_SIGNING_KEY`). Não há validação de que o secret está configurado no Worker antes de emitir cookies assinados.  
**Correção**: Adicionar check em `lib/preview/config.ts` ou no boot do Worker que falhe se `env.previewSigningKey` for o placeholder em produção.

### 🟡 WARNING: Durable Object binding não validado em produção

**Arquivo**: `lib/preview/durable-object.ts:214-231`  
`getPreviewSessionStore()` cai silenciosamente para `InMemoryPreviewSessionStore` se binding `PREVIEW_SESSION_DO` ausente. Em produção, isso significa revogação em memória (perde consistência forte, viola AC-05).  
**Correção**: Adicionar validação no entrypoint do Worker (`open-next` ou `instrumentation.ts`) que garanta `PREVIEW_SESSION_DO` binding presente quando `env.isProduction`.

### 🟢 NIT: `ContentUnavailableError` message vaza detalhe interno

**Arquivo**: `lib/errors/content.ts:20`  
Mensagem padrão "Fonte de conteúdo indisponível." é genérica (ok), mas em `lib/sanity/client.ts:138-140` lança com `"Falha na conexão com o Sanity: ${error.message}"` que pode vazar stack trace do `fetch` abortado.  
**Correção**: Sanitizar mensagem em produção ou usar message fixa.

### 🟢 NIT: Probe Sanity no middleware roda em TODAS as requisições à home

**Arquivo**: `lib/supabase/middleware.ts:139-152`  
Probe executa a cada request em `/` quando `isSanityConfigured`. Spec aceita custo (seção 3.C), mas poderia ser otimizado com cache de curta duração (ex: 5s) para evitar hammer no Sanity sob carga.  
**Nota**: Spec diz "Sem cache intermediário nesta sonda" (linha 91 da spec), então isso é **conforme a spec**, não um defeito.

### 🟢 NIT: `proxy.ts` matcher inclui `/artigos/:path*` e `/preview/:path*` desnecessariamente

**Arquivo**: `proxy.ts:49-50`  
Matcher inclui `/artigos/:path*` e `/preview/:path*` mas o `updateSession` já trata proteção de artigo via `lib/supabase/middleware.ts`. O proxy roda `updateSession` para todos os paths do matcher. Incluir `/artigos/:path*` duplica trabalho (middleware roda 2x: proxy + middleware interno do Next).  
**Correção**: Remover `/artigos/:path*` e `/preview/:path*` do matcher do proxy; o `updateSession` no middleware já cobre.

### 🟢 NIT: `lib/preview/auth.ts:130-171` código legado Supabase Auth morto

**Arquivo**: `lib/preview/auth.ts:130-171`  
Função `verifyPreviewSession` mantém caminho legado Supabase Auth (linhas 146-170) que só roda se `isPreviewConfigured()` e grant antigo. Como a spec 0006 define preview **exclusivamente** via DO + HMAC, esse código é dead code após migração.  
**Correção**: Remover após AC-08 PASS.

---

## Contagem Final

| Severidade  | Quantidade |
| ----------- | ---------- |
| **BLOCKER** | 2          |
| **WARNING** | 3          |
| **NIT**     | 4          |

---

## Veredito

**REPROVADO** — 2 BLOCKERS impedem aprovação.

### BLOCKERS que devem ser resolvidos antes de aprovar:

1. **AC-05 item 6**: Implementar teste automatizado de reutilização de cookie pós-logout (`__tests__/integration/preview-cookie-reuse.test.ts` ou similar) que exercite o ciclo completo: login preview → acessa rascunho → logout → reusa cookie → verifica 404.

2. **Inconsistência `isSanityActive()` vs `isSanityConfigured`**: Unificar a lógica de detecção de Sanity ativo para evitar fallback silencioso para Supabase quando apenas variáveis `NEXT_PUBLIC_*` estiverem definidas.

### Próximos Passos (para /develop)

1. Adicionar teste de cookie reuse pós-logout (AC-05.6)
2. Corrigir `isSanityActive()` para alinhar com `isSanityConfigured` ou documentar variáveis canônicas
3. Adicionar validação de `PREVIEW_SIGNING_KEY` e `PREVIEW_SESSION_DO` binding em produção
4. Após 1-3 resolvidos, re-executar `/check verify` empírico contra produção com dados Sanity reais
5. Se 8/8 PASS com evidência, remover código Supabase editorial (AC-08) e dual-source fallback

---

## Autoridade de Decisão

Este relatório é auditoria imparcial (modo review). O veredito final de merge é dado por `scripts/check-decision.mjs` rodando sobre o artefato de resultados do `/check verify` empírico (que já rodou em 2026-10-11 00:24 e reprovou por 3 UNVERIFIABLE). Esta review identifica os defeitos de código que explicam por que a validação empírica não alcança 100% PASS.
