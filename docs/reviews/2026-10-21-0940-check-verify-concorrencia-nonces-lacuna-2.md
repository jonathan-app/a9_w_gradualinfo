# Relatório `/check verify` — Concorrência Real de Nonces no PostgreSQL (Lacuna 2)

- **Data/Hora:** 2026-10-21 09:40 (BRT)
- **Repositório / Branch:** `a9_w_gradualinfo` (`feat/admin-fases-2-3-4-consolidado`, commit `6ab6ba4`)
- **Escopo:** Verificação empírica de anti-replay e persistência atômica compartilhada em `public.offers_ingest_nonces` com duas conexões independentes ao Supabase/PostgreSQL local (`http://127.0.0.1:54321`) nas rotas [`app/api/ingest/ofertas/route.ts`](../../app/api/ingest/ofertas/route.ts) e [`app/api/admin/ofertas/[id]/avaliar-selo/route.ts`](../../app/api/admin/ofertas/[id]/avaliar-selo/route.ts), além de [`lib/offers/webhook-auth.ts`](../../lib/offers/webhook-auth.ts).
- **Veredito Final:** **PASS**

---

## 1. Resumo Executivo

A verificação empírica com banco PostgreSQL local real (`http://127.0.0.1:54321`) comprovou que a proteção anti-replay da Lacuna 2 opera de forma atômica, determinística e `fail-closed` sob concorrência real entre conexões distintas:

1. **Consumo atômico sob corrida real (60 rodadas / 120 disparos concorrentes no total):** Em 20 rodadas diretas na tabela `public.offers_ingest_nonces`, 20 rodadas em `handleIngestOfertas` (`POST /api/ingest/ofertas`) e 20 rodadas em `handleAvaliarSelo` (`POST /api/admin/ofertas/[id]/avaliar-selo`), **exatamente 1 requisição por rodada teve sucesso (`HTTP 200`)** e **exatamente 1 foi rejeitada como replay (`HTTP 409 nonce_already_consumed` / SQLSTATE `23505`)**, mantendo `count(*) = 1` para cada par `(collector_id, nonce)` no PostgreSQL.
2. **Ordem estrita HMAC antes do consumo do nonce:** Requisições com assinatura HMAC inválida retornam `HTTP 401 invalid_signature` **antes** de tocar em `public.offers_ingest_nonces` (`count(*) = 0`), preservando o nonce legítimo para consumo subsequente válido (`HTTP 200`, `count(*) = 1`) em ambas as rotas.
3. **Fail-closed (`HTTP 503`) em `NODE_ENV=production` sem fallback em memória:** Tanto a ausência de cliente de banco quanto a indisponibilidade de conexão (`http://127.0.0.1:59999`) sob `NODE_ENV=production` retornam `HTTP 503 nonce_storage_error` em ambas as rotas e em `verifyWebhookSignature`, com `getGlobalNonceCache().size() === 0` (zero fallback para memória).
4. **Validações complementares e regressão:** `pnpm typecheck`, `eslint` e as suítes focadas de anti-replay, ingestão, avaliação de selo e canonicalizer RFC 8785 (`85/85` testes unitários + `5/5` testes de integração em `spec-0021-real-db-concurrency.test.ts`) passaram com `exit 0`.

---

## 2. Comandos Executados e Resultados Observados

| #   | Comando executado                                                                                                                                                                                                                     | Exit Code | Resultado observado                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:54321/rest/v1/`                                                                                                                                                            | `0`       | HTTP `200` — Supabase/PostgREST local online em `127.0.0.1:54321`.                                                                                                                                                   |
| 2   | `pnpm vitest run __tests__/integration/spec-0021-real-db-concurrency.test.ts`                                                                                                                                                         | `0`       | `1 passed (1)` arquivo, `5 passed (5)` testes em `220ms` contra PostgreSQL real local (`isSupabaseOnline === true`).                                                                                                 |
| 3   | `pnpm vitest run --config <scratch>/vitest.scratch.mts` (`verify-lacuna2-real-db.test.ts`)                                                                                                                                            | `0`       | `1 passed (1)` arquivo, `5 passed (5)` baterias empíricas em `1093ms` (60 rodadas / 120 requisições simultâneas em 2 conexões `SupabaseClient` independentes + testes de HMAC inválido e `fail-closed` em produção). |
| 4   | `pnpm vitest run __tests__/unit/lib/offers/evidence-canonicalizer.test.ts __tests__/unit/lib/offers/route-avaliar-selo.test.ts __tests__/unit/lib/offers/webhook-auth.test.ts __tests__/unit/lib/offers/route-ingest-ofertas.test.ts` | `0`       | `4 passed (4)` arquivos, `85 passed (85)` testes (`webhook-auth`: 14, `evidence-canonicalizer`: 43, `route-ingest-ofertas`: 10, `route-avaliar-selo`: 18).                                                           |
| 5   | `pnpm typecheck`                                                                                                                                                                                                                      | `0`       | `tsc --noEmit` limpo, zero erros.                                                                                                                                                                                    |
| 6   | `npx eslint lib/offers/webhook-auth.ts lib/offers/evidence-canonicalizer.ts app/api/ingest/ofertas/route.ts "app/api/admin/ofertas/[id]/avaliar-selo/route.ts"`                                                                       | `0`       | Zero erros e zero avisos (adaptador tipado `SupabaseClientForWebhookNonce` sem `as any`).                                                                                                                            |

---

## 3. Matriz de Verificação Empírica (Teste Obrigatório)

A suíte empírica dedicada (`verify-lacuna2-real-db.test.ts`) instanciou **dois clientes independentes** (`client1` e `client2` via `createClient(..., { auth: { persistSession: false, autoRefreshToken: false } })` autenticados com `SUPABASE_SERVICE_ROLE_KEY` `[REDACTED]`) apontando para `http://127.0.0.1:54321`:

| Item      | Requisito verificado                                                                                                                                                             | Rodadas / Volume                                                                                                                         | Resultado observado                                                                                                                                                                                                                               | Status   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **1 & 2** | Preparar nonce e assinatura HMAC-SHA256 válidos e disparar simultaneamente 2 requisições com o mesmo `(collector_id, nonce)` usando 2 conexões independentes ao PostgreSQL local | 20 rodadas SQL direto + 20 rodadas `/api/ingest/ofertas` + 20 rodadas `/api/admin/ofertas/[id]/avaliar-selo` (120 disparos concorrentes) | Disparo via `Promise.all([req1(client1), req2(client2)])` com mesmo timestamp, nonce e assinatura `v1=<hex>`.                                                                                                                                     | **PASS** |
| **3**     | No máximo uma requisição consome o nonce com sucesso                                                                                                                             | 60/60 rodadas                                                                                                                            | Em 100% das rodadas nas duas rotas, exatamente 1 chamada retornou `HTTP 200`.                                                                                                                                                                     | **PASS** |
| **4**     | A outra requisição é rejeitada como replay (`409` / conflito de unicidade `23505`), sem duplicar efeitos colaterais                                                              | 60/60 rodadas                                                                                                                            | Em 100% das rodadas, a chamada concorrente recebeu SQLSTATE `23505` do PostgreSQL e retornou `HTTP 409` com `error: 'nonce_already_consumed'`. Consulta ao banco confirmou `count === 1` em `public.offers_ingest_nonces` em todas as rodadas.    | **PASS** |
| **5**     | Repetir o teste em quantidade suficiente de rodadas para detectar condição de corrida                                                                                            | 20 rodadas por cenário (60 rodadas totais = 120 operações simultâneas)                                                                   | Zero falsos positivos, zero deadlocks, zero duplicações (`220ms` no banco direto, `427ms` em `handleIngestOfertas`, `335ms` em `handleAvaliarSelo`).                                                                                              | **PASS** |
| **6**     | Assinatura HMAC inválida não consome o nonce legítimo                                                                                                                            | Ambas as rotas (`handleIngestOfertas` e `handleAvaliarSelo`)                                                                             | Submissão com assinatura adulterada retornou `HTTP 401` (`invalid_signature`), manteve `count === 0` em `public.offers_ingest_nonces`, e a submissão seguinte com o mesmo nonce e assinatura legítima retornou `HTTP 200` e gravou `count === 1`. | **PASS** |
| **7**     | Indisponibilidade do armazenamento falha fechada (`503`) em ambiente de produção, sem fallback silencioso em memória                                                             | `verifyWebhookSignature` sem cliente + ambas as rotas com banco inacessível (`127.0.0.1:59999`) sob `NODE_ENV=production`                | Todas as chamadas retornaram `503` (`nonce_storage_error`) e `getGlobalNonceCache().size()` permaneceu `0`.                                                                                                                                       | **PASS** |
| **8**     | Comportamento confirmado nas duas rotas consumidoras (`app/api/ingest/ofertas/route.ts` e `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`)                                    | Ambas as rotas testadas ponta a ponta com banco real                                                                                     | `handleIngestOfertas` e `handleAvaliarSelo` (modo `signed_webhook`) passaram em todas as asserções de concorrência, preservação de nonce sob HMAC inválido e `fail-closed` `503`.                                                                 | **PASS** |

---

## 4. Validações Complementares

1. **Constraint `PRIMARY KEY (collector_id, nonce)` em `offers_ingest_nonces`:**
   - Confirmada em [`supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql:6-11`](../../supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql#L6-L11):
     ```sql
     create table if not exists public.offers_ingest_nonces (
       collector_id text not null,
       nonce text not null,
       expires_at timestamptz not null,
       created_at timestamptz not null default now(),
       primary key (collector_id, nonce)
     );
     ```
   - RLS ativa com `enable row level security` (linha 16) sem políticas para `anon`/`authenticated`, restringindo o acesso ao `service_role`.
2. **Tratamento de conflito único (`23505`):**
   - Confirmado em [`lib/offers/webhook-auth.ts:210-221`](../../lib/offers/webhook-auth.ts#L210-L221): `insertError.code === '23505'` retorna `{ ok: false, status: 409, error: 'nonce_already_consumed', message: 'Nonce já utilizado por este coletor (Replay Attack detectado).' }`.
3. **Ausência de fallback em memória em produção (`NODE_ENV === 'production'`):**
   - Confirmada em [`lib/offers/webhook-auth.ts:223-242`](../../lib/offers/webhook-auth.ts#L223-L242): qualquer outro erro do PostgreSQL retorna `503 nonce_storage_error` (linhas 223–228) e a ausência de `supabaseClient` quando `process.env.NODE_ENV === 'production'` retorna `503 nonce_storage_error` (linhas 234–241) antes de tocar em `nonceCache`.

---

## 5. Observações Técnicas Não Bloqueantes (Warnings de Manutenção)

1. **Passagem silenciosa quando o Supabase está offline em `spec-0021-real-db-concurrency.test.ts`:**
   - Em [`__tests__/integration/spec-0021-real-db-concurrency.test.ts:57-59`](../../__tests__/integration/spec-0021-real-db-concurrency.test.ts#L57-L59) e nas guardas `if (!isSupabaseOnline) return;` (linhas 153, 177, 215, 274 e 318), se o container local do Supabase estiver parado ou inacessível, o Vitest reporta `5 passed (5)` em `0ms`. Nesta verificação o banco estava online (`220ms` reais), mas recomenda-se futuramente usar `it.skipIf(!isSupabaseOnline)` para não mascarar testes não executados como `PASS`.
2. **Comportamento de `getOffersServiceClient()` fora de `NODE_ENV=production` em `avaliar-selo/route.ts`:**
   - Em [`app/api/admin/ofertas/[id]/avaliar-selo/route.ts:95-115`](../../app/api/admin/ofertas/[id]/avaliar-selo/route.ts#L95-L115), quando `getOffersServiceClient()` lança exceção por falta de `SUPABASE_SERVICE_ROLE_KEY`, `webhookNonceClient` fica `undefined`. Em `NODE_ENV === 'production'` isso falha fechado com `503` via `verifyWebhookSignature`, mas em `NODE_ENV !== 'production'` (`development`/`test`) cai no `MemoryNonceCache` — divergindo apenas do comentário nas linhas 96–97 da rota.
