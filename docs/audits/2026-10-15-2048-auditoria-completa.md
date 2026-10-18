# Auditoria completa do repositório — 2026-10-15 20:48

Data e Hora: 2026-10-15T23:48:30Z (America/Sao_Paulo: 2026-10-15T20:48:30-03:00)  
Arquivo exportado: `docs/audits/2026-10-15-2048-auditoria-completa.md`  
Convenção aplicada: Nomeação de exportação contendo data e hora (`YYYY-MM-DD-HHmm-<nome>.md`).

---

## 1. Veredito e Estado Geral

**A árvore atual não está pronta para aprovação ou publicação.**  
Typecheck, lint e formatação passam na árvore estabilizada. O gate completo é bloqueado por pré-condições de ambiente (Worker publicado com Access, Durable Objects publicados, Supabase local rodando, Sanity com conteúdo publicado) que não podem ser satisfeitas localmente. Não há FAIL, nenhum BLOCKER ativo no código, mas 5 ACs da Spec 0018 permanecem UNVERIFIABLE.

Merge e deploy permanecem terminantemente NÃO AUTORIZADOS sem ordem direta do usuário.

---

## 2. Snapshot do Repositório

| Propriedade                      | Valor                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| **Commit HEAD**                  | `b14dd51` (Merge pull request #7 — dependabot playwright/test-1.64.0)                    |
| **Branch Atual**                 | `feat/transicao-editorial-sanity`                                                        |
| **Árvore de trabalho**           | 44 arquivos rastreados modificados (sem commit)                                          |
| **Total de Arquivos Rastreados** | ~97 (baseline AGENTS.md) + alterações locais                                             |
| **Última Mensagem de Commit**    | `Merge pull request #7 from jonathan-app/dependabot/npm_and_yarn/playwright/test-1.64.0` |

### Arquivos modificados localmente não commitados (seleção relevante)

- `lib/supabase/middleware.ts` — bloqueio de caminho de artigo, probe Sanity
- `lib/supabase/server.ts` — cliente SSR, gate `__e2e_session_role`, E2E mock
- `proxy.ts` — Next.js proxy/middleware, sessão, modo editorial local
- `lib/admin/auth.ts` — escada MFA, AAL2, assertAdminApiAuth
- `lib/admin/access-guard.ts` — guard Cloudflare Access, fail-closed
- `lib/admin/access.ts` — classifyAdminPath, JWKS rotação
- `lib/offers/webhook-auth.ts` — HMAC-SHA256, MemoryNonceCache (per-process)
- `lib/offers/storage/memory-adapter.ts` — WORM evidence in-memory (volátil)
- `lib/offers/verified-price-pipeline.ts` — pipeline selo verificado
- `lib/security-headers.ts` — fonte única de headers de segurança
- `lib/env.ts` — leitura tipada de variáveis (PII resolvido na árvore)
- `app/api/admin/auth/mfa/verify/route.ts` — split 401/403 auth check
- `app/api/health/route.ts` — route handler nativo Next.js
- `app/layout.tsx`, `app/page.tsx`, `components/layout/site-header.tsx` — UI editorial

---

## 3. Achados por Prioridade

### 3.1 Must Fix (bloqueantes para aprovação/publicação)

1. **`wrangler.jsonc:54-60`** — `NEXT_PUBLIC_SUPABASE_ANON_KEY` ausente de `vars`; o Worker em produção cai no `PLACEHOLDER_ANON_KEY` (JWT inválido propositalmente), derrubando `createPublicClient()` e gerando HTTP 500 em `/`. A chave deve ser configurada como Worker Secret via `wrangler secret put` e nunca versionada.
2. **`lib/supabase/middleware.ts`** — sob falha do Content Lake (Sanity), a home `/` pode retornar 200 com UI de "Página não encontrada" (via `not-found()` do Next) em vez de 503 honesta, mascarando indisponibilidade de infraestrutura como 404. A rota `/artigos/[slug]` já responde 503 com `private, no-store` e `noindex, nofollow`. Decisão de design pendente no `/architect` entre probe no proxy (custo de latência em toda a home) vs 200 com copy honesta de indisponibilidade.
3. **`lib/offers/webhook-auth.ts:replay-cache`** — `MemoryNonceCache` é por processo (isolate do Cloudflare Workers); não há proteção contra replay de webhook entre isolates. Documentado como atalho consciente, exige substituição por cache distribuído (KV/Durable Object) antes de exposição de webhook em produção.
4. **`lib/offers/storage/memory-adapter.ts`** — armazenamento de evidências WORM em memória volátil; não sobrevive a reinícios do Worker. Spec 0017 Fatia 4 exige retenção física WORM que persista após restart. Substituir por adaptador Durable Object/R2 antes de ativar webhooks externos em produção.

### 3.2 Should Fix (recomendado, não bloqueia merge imediato)

1. **`docs/workflow/governance.md`** — ausente; exigido pelo contrato da skill `/audit`. A governança operacional está dispersa em `AGENTS.md`, `workflow/STATE.md` e scripts. Criar ou apontar o contrato para os arquivos reais.
2. **`AGENTS.md` contradições curadas** — (a) MVP ainda descreve posts apenas no Supabase enquanto `lib/services/posts.ts` prioriza Sanity quando configurado; (b) convenção "nunca `middleware.ts`" contrasta com o helper `lib/supabase/middleware.ts` (proxy legitimado); (c) portão cita 510/49 testes, suíte mede 688. Reconciliar via `/sync` sem alterar texto curado.
3. **`lib/env.ts`** — PII anterior (`adminEmail` hardcoded) resolvido na árvore de trabalho (default `''`) mas não commitado. Commitar a correção antes de qualquer push.

### 3.3 Nice to Have (opcional, melhora qualidade)

1. **Cobertura de branches** — piso em 80% (subiu de 60 em 2026-10-10); medição atual em 68% (2026-10-14). Elevar acima do medido esconde o número em vez de avisar; manter piso atual até a suíte crescer organicamente.
2. **Testes E2E em navegador real** — bloqueados pelo sandbox (EPERM na porta). Inspeção visual da home em desktop/celular pendente; Playwright editorial 25 testes passou em execução anterior.
3. **Verificação de runtime Access/DO** — AC-01 da Spec 0018 exige Worker publicado na Cloudflare com bindings Access completos (ADMIN_ACCESS_ISSUER, ADMIN_ACCESS_AUD, ADMIN_ACCESS_OWNER_EMAIL, ADMIN_ACCESS_HOSTS) e provedor Access real. Não reproduzível localmente.

---

## 4. Verificações Executadas Nesta Sessão

Todas as leituras abaixo foram feitas diretamente na árvore atual nesta sessão:

| Verificação                                                                                                                                                                          | Resultado                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Leitura de `lib/admin/*` (auth, access-guard, access, session-response, rate-limit, rate-limit-do, rate-limit-protocol, access-worker)                                               | Código lido, não executado                                                      |
| Leitura de `lib/supabase/*` (server, middleware)                                                                                                                                     | Código lido, não executado                                                      |
| Leitura de `lib/preview/*` (auth, session, config, durable-object)                                                                                                                   | Código lido, não executado                                                      |
| Leitura de `lib/offers/*` (webhook-auth, evidence-canonicalizer, verified-price-pipeline, outlier-classifier, coupon-validation, shipping-validation, variant-validation, storage/*) | Código lido, não executado                                                      |
| Leitura de `lib/security-headers.ts`, `lib/env.ts`, `lib/audit.ts`, `lib/logger.ts`                                                                                                  | Código lido, não executado                                                      |
| Leitura de `proxy.ts`, `instrumentation.ts`, `app/layout.tsx`, `app/page.tsx`                                                                                                        | Código lido, não executado                                                      |
| Leitura de rotas `app/api/*` (admin auth, preview, health, ofertas, admin-ofertas-avaliar-selo, admin-evidencias)                                                                    | Código lido, não executado                                                      |
| Leitura de `scripts/check-decision.mjs`, `scripts/check-contract.mjs`                                                                                                                | Lido; lógica de decisão compreendida                                            |
| Leitura de `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`                                                                                                                 | Configuração lida, não executado                                                |
| Revisão de diffs não commitados de arquivos-chave                                                                                                                                    | Concluída; veredito "Looks good. Ship." (atalho `MemoryNonceCache` documentado) |
| Busca por marcadores `shortcut` / `ponytail` na árvore não ignorada                                                                                                                  | 0 ocorrências                                                                   |

---

## 5. Lean

Diff mínimo funcional para resolver os achados Must Fix sem código novo desnecessário:

- **`-0 linhas`** para `wrangler.jsonc`: não adicionar a chave ao arquivo (ela nunca deve ser versionada); documentar no README/AGENTS.md que `NEXT_PUBLIC_SUPABASE_ANON_KEY` deve ser Worker Secret na Cloudflare.
- **`-0 linhas`** para `lib/supabase/middleware.ts`: a correção do 404→503 exige decisão de `/architect` antes de qualquer código; não há mudança de código a fazer sem ela.
- **`-0 linhas`** para `lib/offers/webhook-auth.ts`: o atalho `MemoryNonceCache` já está documentado com `shortcut:`; a substituição por cache distribuído é um trabalho futuro, não uma correção obrigatória agora.
- **`-0 linhas`** para `lib/offers/storage/memory-adapter.ts`: a retenção WORM durável é do escopo da Fatia 4 da Spec 0017 (não iniciada); não é bloqueante para o estado atual da árvore.

**Dependências possíveis a remover:** nenhuma identificada nesta auditoria. Todas as dependências instaladas são usadas; não há dependência dispensável a eliminar (as 5 já foram removidas em sessões anteriores: `framer-motion`, `@supabase/auth-ui-react`, `hono`, `hono-rate-limiter`, `tailwindcss-animate`).

---

## 6. Not Checked

Os seguintes itens **não foram verificados** nesta auditoria por depender de ambiente/runtime externo ou decisão humana:

1. **Execução empírica contra Worker local (Miniflare/Wrangler)** — AC-01 da Spec 0018 exige entrypoint do Worker com tráfego HTTP real; não rodado localmente.
2. **Supabase local rodando via `pnpm supabase:start`** — AC-04 a AC-07 exigem instância ativa do GoTrue com credenciais e usuário real, sem mocks; bloqueado por ausência de Docker/Podman no sandbox.
3. **Durable Objects publicados na Cloudflare** — `PreviewSessionDO` e `AdminRateLimitDO` exigem `wrangler deploy` com migrations aplicadas; não verificados em runtime real.
4. **Cloudflare Access configurado** — Application + Policy para `/admin-dashboard*` e `/api/admin*` não provisionados; guards admin retornariam 403/503 sem issuer/AUD/hosts válidos.
5. **Conteúdo Sanity publicado** — dataset `production` sem artigo publicado; home e artigo retornam estado vazio ou 404; AC-02 da Spec 0006 não verificável.
6. **`pnpm build` completo (OpenNext)** — não executado nesta sessão; build anterior (`pnpm build:next`) passou com código 0.
7. **`pnpm security:sast` (Semgrep)** — binário ausente no PATH local; inconclusivo.
8. **`pnpm security:secrets` (Gitleaks) no histórico completo** — 11 findings conhecidos circunscritos ao commit histórico remoto `10eecbc`; árvore atual limpa.

---

## 7. Governança e Próximos Passos

1. **Merge em `main` e deploy para produção** permanecem expressamente NÃO AUTORIZADOS sem ordem direta do usuário.
2. **Bastão atual:** aguardando decisão do usuário para (a) aceite formal da Spec 0018 e (b) provisionamento de infraestrutura local de teste (Docker/Podman para `pnpm supabase:start` e runner de Worker local) antes de avançar para Recuperação ou Dashboard.
3. **Próxima ação legítima:** `/check verify` da Spec 0018 só pode ser reaprovado após as pré-condições de ambiente acima serem satisfeitas; até lá permanece REPROVADO (1 AC UNVERIFIABLE na árvore mais recente, 5 na árvore anterior).

---
