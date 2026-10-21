# Relatório `/check review` + `/ponytail-review` — Auditoria Independente da Lacuna 4 (Sanitização de Erros HTTP 5xx)

- **Data/Hora:** 2026-10-21 10:04 (BRT)
- **Repositório / Branch:** `a9_w_gradualinfo` (`feat/admin-fases-2-3-4-consolidado`, base `6ab6ba4`)
- **Escopo:** Auditoria independente do diff real dos 13 arquivos modificados na Lacuna 4 (8 arquivos de aplicação e 5 arquivos de teste), conferindo proteção contra vazamento em respostas `5xx`, preservação dos contratos públicos `4xx`/`5xx`, higiene de logs e cobertura de testes de regressão.
- **Veredito Final:** **PASS** (`0` BLOCKERs, `0` WARNINGs bloqueantes, `2` NITs não bloqueantes documentados)

---

## 1. O que esta alteração faz (`What this change does`)

Esta alteração blinda o helper central [`apiErrorResponse`](../../lib/utils/api-response.ts) para que respostas HTTP `5xx` nunca serializem o campo `details` (política `fail-closed`) e sempre filtrem `message` contra vazamentos de SQL, RLS, URIs de banco, stack traces, exceções de runtime e tokens. Além disso, remove a exposição direta de `err.message` em `POST /api/ingest/ofertas`, `PreviewSessionDO.fetch` e `readLimitedTextBody`, adiciona captura de topo (`try/catch`) em `POST /api/admin/ofertas/[id]/avaliar-selo` e `GET /api/ofertas`, e restringe logs de erro de RPC/exceções a códigos ou nomes de classe (`code` / `name`).

---

## 2. Arquivos Inspecionados no Diff Real

1. [`lib/utils/api-response.ts`](../../lib/utils/api-response.ts) (`+161/-30`)
2. [`lib/utils/http-stream.ts`](../../lib/utils/http-stream.ts) (`+1/-4`)
3. [`lib/preview/durable-object.ts`](../../lib/preview/durable-object.ts) (`+2/-3`)
4. [`app/api/ingest/ofertas/route.ts`](../../app/api/ingest/ofertas/route.ts) (`+30/-44`)
5. [`app/api/admin/ofertas/[id]/avaliar-selo/route.ts`](../../app/api/admin/ofertas/[id]/avaliar-selo/route.ts) (`+31/-31`)
6. [`app/api/ofertas/route.ts`](../../app/api/ofertas/route.ts) (`+21/-7`)
7. [`app/api/admin/evidencias/[hash]/route.ts`](../../app/api/admin/evidencias/[hash]/route.ts) (`+11/-14`)
8. [`app/api/admin/usuarios/papeis/route.ts`](../../app/api/admin/usuarios/papeis/route.ts) (`+5/-6`)
9. [`app/api/admin/usuarios/papeis/[userId]/route.ts`](../../app/api/admin/usuarios/papeis/[userId]/route.ts) (`+5/-6`)
10. [`__tests__/unit/lib/utils/api-response.test.ts`](../../__tests__/unit/lib/utils/api-response.test.ts) (`+84/-1`)
11. [`__tests__/unit/lib/utils/http-stream.test.ts`](../../__tests__/unit/lib/utils/http-stream.test.ts) (`+27/-0`)
12. [`__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`](../../__tests__/unit/lib/offers/route-ingest-ofertas.test.ts) (`+27/-1`)
13. [`__tests__/unit/lib/offers/route-avaliar-selo.test.ts`](../../__tests__/unit/lib/offers/route-avaliar-selo.test.ts) (`+28/-1`)
14. [`__tests__/unit/lib/offers/route-ofertas.test.ts`](../../__tests__/unit/lib/offers/route-ofertas.test.ts) (`+26/-0`)
15. [`__tests__/unit/durable-object.test.ts`](../../__tests__/unit/durable-object.test.ts) (`+6/-3`)

---

## 3. Verificações dos 8 Itens da Auditoria

| #     | Item Auditado                                                                                                                                                       | Evidência no Código Real                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Resultado |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **1** | Política para `status >= 500` e validação de `details` em `4xx` em [`lib/utils/api-response.ts`](../../lib/utils/api-response.ts#L92-L195)                          | Em `apiErrorResponse` (linhas 175–188), `isServerError = status >= 500` força `includeDetails = false` incondicionalmente e aplica `sanitizeRpcErrorMessage(message, 'Erro interno no servidor.')`. Em `status < 500`, `isSafeClientDetailsValue` limita a profundidade (`depth <= 4`), rejeita `value instanceof Error`, objetos não planos, chaves em `UNSAFE_DETAIL_KEYS` (`stack`, `cause`, `sql`, `sqlstate`, `query`, `parameters`, `table`, `column`, `constraint`, `detail`, `hint`, `token`, `secret`, `password`, `authorization`, `apikey`, `service_role`) e strings com vazamento. | **PASS**  |
| **2** | Ausência de serialização de `message` interna, `details`, `Error`, stack traces, dados de banco, tokens e segredos em `5xx`                                         | Dupla barreira: (a) todas as rotas passam mensagens estáticas em português para `apiErrorResponse(500/503, ...)`; (b) `apiErrorResponse` aplica `hasInternalErrorLeak` (regex de frame `\n\s*at\s+`, prefixo JWT `eyJ...` e 43 substrings de SQL/RLS/runtime/segredos) e descarta `details` em qualquer `status >= 500`.                                                                                                                                                                                                                                                                        | **PASS**  |
| **3** | Compatibilidade de códigos e mensagens públicas com chamadores existentes                                                                                           | Todos os códigos de erro (`secret_missing`, `service_client_unavailable`, `nonce_storage_error`, `storage_unavailable`, `storage_error`, `internal_error`, `unavailable`, `role_assignment_failed`, `role_revocation_failed`, `read_error`) e status HTTP (`400`, `409`, `422`, `500`, `503`) foram preservados sem quebra de contrato.                                                                                                                                                                                                                                                         | **PASS**  |
| **4** | Inspeção dos `catch` e retornos de erro nas rotas alteradas                                                                                                         | `POST /api/ingest/ofertas` (`route.ts:512-525`) e `POST /api/admin/ofertas/[id]/avaliar-selo` (`route.ts:487-506`) capturam qualquer rejeição não tratada e devolvem `500 internal_error` com mensagem estática e `Cache-Control: private, no-store`. `GET /api/ofertas` (`route.ts:111-138`) captura tanto `result.error` quanto exceção lançada por `await query`, devolvendo `503 unavailable`.                                                                                                                                                                                              | **PASS**  |
| **5** | Inspeção de [`lib/preview/durable-object.ts`](../../lib/preview/durable-object.ts#L334-L339) e [`lib/utils/http-stream.ts`](../../lib/utils/http-stream.ts#L81-L88) | `PreviewSessionDO.fetch` retorna `{ error: 'internal_error' }` fixo em `500` (antes retornava `err.message`). `readLimitedTextBody` retorna `'Falha na leitura do corpo da requisição.'` fixo em `400 read_error` (antes retornava `err.message`).                                                                                                                                                                                                                                                                                                                                              | **PASS**  |
| **6** | Avaliação de segurança dos logs restritos a `code` ou `name`                                                                                                        | Em `ingest/ofertas` e `avaliar-selo`, `console.error` grava `{ code: rpcError.code ?? 'unknown' }` (SQLSTATE de 5 caracteres do PostgreSQL/PostgREST) ou `{ name: err instanceof Error ? err.name : 'UnknownError' }` (nome do construtor da exceção). Nenhum payload do cliente, token, cabeçalho ou valor SQL refletido é gravado.                                                                                                                                                                                                                                                            | **PASS**  |
| **7** | Varredura por outros caminhos de serialização direta de exceções                                                                                                    | Restam apenas erros de domínio explicitamente tipados em `4xx`: `InvalidEvidenceFormatError` (`400`), `EvidenceCollisionConflictError` (`409`) e `RoleMutationError` (`404`), todos instanciados pelo próprio código com mensagens controladas.                                                                                                                                                                                                                                                                                                                                                 | **PASS**  |
| **8** | Cobertura dos testes de regressão                                                                                                                                   | Os 6 novos testes cobrem: `500` com `Error` + `stack` + `details` em `apiErrorResponse`, `503` com preservação de mensagem humana e supressão de `details`, `400`/`422` com `Error` e chave `stack` bloqueados, `sanitizeRpcErrorMessage` contra RLS/stack/JWT, `read_error` de stream com `ECONNRESET`, `POST /api/ingest/ofertas` com URI PostgreSQL, `POST /api/admin/ofertas/[id]/avaliar-selo` com `sb_secret_`, `GET /api/ofertas` com `ECONNREFUSED` e `PreviewSessionDO` com erro interno.                                                                                              | **PASS**  |

---

## 4. Comandos Executados e Resultados Reais

| #   | Comando                                                                                                                                                                                                                                                                                                                                                                                             | Exit Code | Resultado                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| 1   | `pnpm vitest run __tests__/unit/lib/utils/api-response.test.ts __tests__/unit/lib/utils/http-stream.test.ts __tests__/unit/lib/offers/route-ingest-ofertas.test.ts __tests__/unit/lib/offers/route-avaliar-selo.test.ts __tests__/unit/lib/offers/route-ofertas.test.ts __tests__/unit/lib/offers/route-evidencias.test.ts __tests__/unit/durable-object.test.ts __tests__/unit/admin-rbac.test.ts` | `0`       | `8 passed (8)` suítes, `96 passed (96)` testes em `2.04s`. |
| 2   | `pnpm typecheck`                                                                                                                                                                                                                                                                                                                                                                                    | `0`       | `tsc --noEmit` limpo, zero erros.                          |
| 3   | `npx eslint <16 arquivos tocados>`                                                                                                                                                                                                                                                                                                                                                                  | `0`       | Zero erros, zero warnings.                                 |
| 4   | `npx prettier --check <16 arquivos tocados>`                                                                                                                                                                                                                                                                                                                                                        | `0`       | `All matched files use Prettier code style!`               |
| 5   | `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                  | `0`       | Zero problemas de formatação/diff.                         |

---

## 5. Observações Não Bloqueantes (`Nice to have` / NITs)

Nenhum código foi modificado durante esta revisão independente. Dois pontos menores de manutenção futura foram anotados:

1. **NIT-01 — Substrings genéricas em inglês em `INTERNAL_LEAK_SUBSTRINGS` ([`lib/utils/api-response.ts:46-90`](../../lib/utils/api-response.ts#L46-L90)):**
   - **O que é:** A lista `INTERNAL_LEAK_SUBSTRINGS` inclui palavras isoladas em inglês como `'table'`, `'column'` e `'schema'`.
   - **Impacto atual:** Zero impacto nas rotas existentes, pois todas as mensagens públicas são em português (`'tabela'`, `'coluna'`) e todos os códigos de negócio de RPC (`coupon_scope_mismatch`, `operation_key_payload_conflict`) passam sem colisão. Se no futuro um código de negócio legítimo em inglês contiver a substring `'table'`, será mascarado pelo fallback.
2. **NIT-02 — Parsing de `request.json()` sem `try/catch` local em 3 rotas de formulário administrativo (`app/api/admin/preview/route.ts:41`, `app/api/admin/auth/login/route.ts:60`, `app/api/admin/auth/mfa/verify/route.ts:90`):**
   - **O que é:** Quando chamadas com `content-type: application/json` e JSON malformado após passar pelos guards de autenticação, `await request.json()` lança `SyntaxError` capturado pelo boundary do Next.js (que devolve `500` genérico em produção sem vazar stack trace), em vez de devolver `400` explícito como em `recovery/route.ts:53`.

---

## 6. Conclusão e Próximos Passos

- **Verdict:** **PASS** (`Ship` local — sem bloqueadores).
- **Sequência recomendada:**
  1. Corrigir o falso positivo de [`__tests__/integration/spec-0021-real-db-concurrency.test.ts`](../../__tests__/integration/spec-0021-real-db-concurrency.test.ts) quando o Supabase local está offline.
  2. Auditar as Lacunas 5 (atomicidade/integridade de RBAC e auditoria) e 6 (histórico de migrations e políticas RLS), mais documentação operacional do expurgo de nonces.
