# docs/scope/PLAN.md

## At a glance

# · Feature · Phase · Status

1 · Restaurar entrypoint do Cloudflare Worker · 1 · planned
2 · Provisionar R2 + Bucket Lock + vars de ambiente · 1 · planned
3 · Corrigir rota /api/admin/evidencias/[hash] para storage-factory · 1 · planned
4 · Rate-limit admin por IP/Turnstile (spec 0034) · 2 · planned
5 · wrangler.jsonc observability.redact_query_string: true · 2 · planned
6 · Retenção/limpeza de offers_ingest_nonces · 2 · planned
7 · Rate-limit público em /api/ofertas · 3 · planned
8 · CSP remover unsafe-inline em produção · 3 · planned
9 · Documentar vars faltantes em .env.example · 3 · planned
10 · Confirmar SMTP do Supabase para recovery · 3 · planned
11 · Confirmar SANITY_API_READ_TOKEN como secret · 3 · planned

## Fase 1 — Go-live mínimo de backend (bloqueia deploy)

### 1. Restaurar entrypoint do Cloudflare Worker

· needs a decision · phase 1

Reestabelecer `scripts/cloudflare-worker.ts` como `main` do `wrangler.jsonc`, re-exportando `.open-next/worker.js`, `PreviewSessionDO`, `AdminRateLimitDO` e `dispatchWithAdminAccess`. Sem ele, `wrangler deploy` falha e os Durable Objects / Cloudflare Access não sobem em produção.

Done when: `wrangler deploy --dry-run` passa e o worker responde com a barreira de admin ativa.

- [ ] Ler wrangler.jsonc e confirmar chave `main`
- [ ] Restaurar/reescrever `scripts/cloudflare-worker.ts`
- [ ] Validar com `wrangler deploy --dry-run`

### 2. Provisionar R2 + Bucket Lock + vars de ambiente

· phase 1

Criar bucket R2 com Bucket Lock (retenção 730 dias) e configurar as variáveis de produção ausentes no `.env.example` e no Worker: `R2_EVIDENCE_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `OFFERS_STORAGE_BACKEND`, `OFFERS_STORAGE_WORM_VERIFIED`, `OFFERS_INGEST_SECRET`, `OFFERS_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Só liberar selos após `OFFERS_STORAGE_WORM_VERIFIED=true`.

Done when: Módulo de ofertas para de retornar 503 fail-closed e consegue gravar evidência no R2.

- [ ] Provisionar bucket R2 com Bucket Lock
- [ ] Setar variáveis de ambiente no Worker
- [ ] Validar `getOffersEvidenceStorage()` em produção

### 3. Corrigir rota /api/admin/evidencias/[hash] para storage-factory

· phase 1

Trocar `getEvidenceStorage()` (memory-adapter, vazio em prod → 404) por `getOffersEvidenceStorage()` da `storage-factory` em `app/api/admin/evidencias/[hash]/route.ts`.

Done when: GET `/api/admin/evidencias/[hash]` retorna URL assinada de evidência real em produção, não 404.

- [ ] Editar rota para usar storage-factory
- [ ] Cobrir com teste de unidade
- [ ] Verificar em ambiente de staging

## Fase 2 — Segurança e estabilidade (correções de backend)

### 4. Rate-limit admin por IP/Turnstile (spec 0034)

· needs a decision · phase 2

Substituir o Durable Object global `admin-auth-rate-limit:v1` (5 tentativas / 60 s para todos) por quota chaveada por identificador de origem (`cf-connecting-ip` hash ou Turnstile token), evitando negação de serviço do login para todos os administradores.

Done when: Cinco falhas de login de um IP não bloqueiam login de outro IP.

- [ ] Decidir entre IP hash e Turnstile
- [ ] Implementar chaveamento no rate-limit-do
- [ ] Cobrir com teste de unidade de concorrência

### 5. wrangler.jsonc observability.redact_query_string: true

· phase 2

Definir `observability.redact_query_string: true` no `wrangler.jsonc` para evitar vazamento do código PKCE de recovery e tokens de preview nos logs do Worker.

Done when: Logs do Worker não contêm query strings sensíveis.

- [ ] Editar wrangler.jsonc
- [ ] Revalidar deploy

### 6. Retenção/limpeza de offers_ingest_nonces

· phase 2

Confirmar unique constraint de `offers_ingest_nonces` (se é `(collector_id, nonce)` ou só `nonce`) e adicionar política de retenção/limpeza para evitar crescimento indefinido da tabela.

Done when: Tabela de nonces tem retenção definida e não cresce sem limite.

- [ ] Inspecionar migration da tabela
- [ ] Adicionar limpeza periódica ou retention policy

## Fase 3 — Menor / verificação

### 7. Rate-limit público em /api/ofertas

· phase 3

Adicionar limite de requisições por IP na borda para o endpoint público de ofertas, mitigando scraping.

Done when: Endpoint `/api/ofertas` responde 429 após excesso de requisições de um IP.

- [ ] Implementar limite por IP
- [ ] Cobrir com teste

### 8. CSP remover unsafe-inline em produção

· phase 3

Remover `'unsafe-inline'` do `script-src` da Content Security Policy em produção, fortalecendo mitigação de XSS.

Done when: CSP de produção não contém `'unsafe-inline'`.

- [ ] Editar `lib/security-headers.ts`
- [ ] Verificar que nada quebra no frontend

### 9. Documentar vars faltantes em .env.example

· phase 3

Adicionar as variáveis de produção ausentes ao `.env.example` para não quebrar onboarding e deploys futuros.

Done when: `.env.example` lista todas as variáveis de produção exigidas pelo backend.

- [ ] Atualizar .env.example

### 10. Confirmar SMTP do Supabase para recovery

· phase 3

Verificar se o projeto Supabase tem SMTP configurado para o fluxo de recovery de senha por e-mail (feature Spec 0019).

Done when: Recovery por e-mail entrega mensagem na caixa de entrada.

- [ ] Confirmar SMTP no projeto Supabase
- [ ] Testar fluxo de recovery end-to-end

### 11. Confirmar SANITY_API_READ_TOKEN como secret

· phase 3

Confirmar que `SANITY_API_READ_TOKEN` está configurado como secret no Worker para preview de rascunhos do Sanity.

Done when: Preview de rascunhos funciona com token de leitura do Sanity.

- [ ] Verificar secret no wrangler/ambiente
- [ ] Testar preview de rascunho

## Legend

- `planned`: não começou ainda
- `Phase 1/2/3`: ordem de execução
- `needs a decision`: exige escolha do time antes de desenvolver
