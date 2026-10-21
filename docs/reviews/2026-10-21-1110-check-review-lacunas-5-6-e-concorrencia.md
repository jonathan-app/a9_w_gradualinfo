# /check review Independente — Confiabilidade de Concorrência (Etapa 1), RBAC Transacional (Lacuna 5) e RLS Histórica (Lacuna 6)

- **Data:** 2026-10-21 11:10 (BRT)
- **Repositório:** `a9_w_gradualinfo`
- **Modo:** `/check review` + `/ponytail-review` (auditoria independente sem alteração de código de aplicação ou testes)
- **Relatório auditado:** `docs/reviews/2026-10-21-1048-auditoria-lacunas-5-6-e-concorrencia.md`
- **Restrições operacionais:** Zero modificações em código de aplicação ou testes durante a revisão; zero operações Git de escrita (`commit`, `push`, `merge`, `rebase`) e zero deploy.

---

## 1. Veredito Executivo por Frente

| Frente Auditada                                                                                                                                                    | Veredito | Blocker | Warning | Nit | Resumo Técnico                                                                                                                                                                                                                                                                                                      |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :-----: | :-----: | :-: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Etapa 1:** Confiabilidade do teste de concorrência (`__tests__/integration/spec-0021-real-db-concurrency.test.ts`)                                               | **PASS** |    0    |    0    |  0  | Eliminado o `if (!isSupabaseOnline) return;` silencioso. Comprovado empiricamente nos 3 estados: `6/6 skipped` quando opcional e offline, `1 failed` (`Error: REQUIRE_REAL_DB=1: Supabase local indisponível...`, `exit 1`) quando obrigatório e offline, e `6/6 passed` (`exit 0`) contra o PostgreSQL local real. |
| **Lacuna 5:** RBAC e trilha de auditoria transacional (`20261021103000_rbac_atomicity_and_rls_hardening.sql`, `lib/admin/roles.ts`, `scripts/admin-bootstrap.mjs`) | **PASS** |    0    |    0    |  1  | `assign_admin_role` e `revoke_admin_role` executam em transação única com `pg_advisory_xact_lock` + `FOR UPDATE`, fazem rollback integral se `admin_audit_log` falhar (`23514`), e `admin_user_roles` revoga escrita direta até de `service_role` (`42501`).                                                        |
| **Lacuna 6:** Auditoria histórica de RLS e privilégios (`supabase/migrations/20261003000000` a `20261021103000`)                                                   | **PASS** |    0    |    0    |  2  | Todas as 13 tabelas base de `public` têm `relrowsecurity = true` e policies explícitas; 12 tabelas sensíveis têm `FORCE ROW LEVEL SECURITY`; 13 funções `SECURITY DEFINER` usam `search_path = ''`, owner `postgres` e `REVOKE ALL FROM PUBLIC`.                                                                    |

**Veredito Consolidado da Revisão Independente:** **PASS** (`0` BLOCKERs, `0` WARNINGs bloqueantes, `3` NITs não bloqueantes).

---

## 2. Respostas às 7 Perguntas de Verificação Independente

### 2.1. As RPCs de RBAC são realmente atômicas no banco, inclusive sob concorrência e falha intermediária?

- **Constatação:** **Sim (PASS).**
- **Evidência no código (`supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql:39-156`):**
  1. `public.assign_admin_role` (linhas 39–96) e `public.revoke_admin_role` (linhas 99–156) executam em transação PL/pgSQL única, sem `EXCEPTION WHEN OTHERS` que engula falhas de constraint ou escrita.
  2. Ambas adquirem `PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin_user_roles:' || p_user_id::text, 0));` antes de ler `public.admin_user_roles ... FOR UPDATE`, serializando chamadas concorrentes para o mesmo `p_user_id` mesmo quando a linha ainda não existe na tabela.
  3. Se o `INSERT INTO public.admin_audit_log` subsequente violar qualquer constraint (ex.: `admin_audit_actor_email_shape` ou `admin_audit_ip_shape` com SQLSTATE `23514`), toda a transação da RPC sofre rollback automático no PostgreSQL, desfazendo o `INSERT`/`UPDATE`/`DELETE` em `public.admin_user_roles`.
- **Evidência empírica:** Comprovado em `supabase/tests/database/admin_rbac.test.sql` (testes de rollback de `assign_admin_role` e `revoke_admin_role` com `p_actor_email := 'email-invalido-sem-arroba'` e `p_ip_address := 'ip_malformado_invalido'`) e no teste #6 de `__tests__/integration/spec-0021-real-db-concurrency.test.ts` (corrida paralela `Promise.all` entre `editor` e `revisor` com `previous_role` encadeado na trilha WORM + rollback em falha intermediária).

### 2.2. `service_role`, `PUBLIC`, `anon` ou `authenticated` mantêm algum caminho de escrita direta que contorne a auditoria?

- **Constatação:** **Não (PASS).**
- **Evidência no código (`supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql:15-31, 166-215`):**
  - Em `public.admin_user_roles`:
    - `REVOKE ALL ON public.admin_user_roles FROM public, anon, authenticated;`
    - `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_user_roles FROM service_role;`
    - `GRANT SELECT ON public.admin_user_roles TO authenticated, service_role;`
    - Como `assign_admin_role` e `revoke_admin_role` são `SECURITY DEFINER` com `OWNER TO postgres`, o único caminho de mutação de papéis passa obrigatoriamente pelas duas RPCs auditadas.
  - Em `scripts/admin-bootstrap.mjs:74-80`:
    - O antigo `.from('admin_user_roles').upsert(...)` foi substituído por `supabase.rpc('assign_admin_role', ...)`, garantindo que até o provisionamento de CLI grave no `admin_audit_log`.
  - Em `public.admin_audit_log` e `public.price_audit_logs`:
    - `UPDATE`, `DELETE` e `TRUNCATE` estão revogados e adicionalmente bloqueados por triggers `BEFORE UPDATE OR DELETE` (`FOR EACH ROW`) e `BEFORE TRUNCATE` (`FOR EACH STATEMENT`) com SQLSTATE `55000`.

### 2.3. As funções `SECURITY DEFINER` usam `search_path` seguro e privilégios mínimos de execução?

- **Constatação:** **Sim (PASS).**
- **Evidência no código e no catálogo `pg_proc` (`supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql:254-288` e `supabase/tests/database/admin_rbac.test.sql:246-273`):**
  - Todas as 13 funções `SECURITY DEFINER` do schema `public` (`handle_new_user`, `is_post_public`, `tg_prevent_audit_log_mutation`, `calculate_offer_median`, `classify_price_observation`, `tg_classify_price_history`, `evaluate_offer_shipping`, `evaluate_and_set_verified_price` de 12 e 13 argumentos, `is_admin`, `tg_prevent_admin_audit_mutation`, `assign_admin_role`, `revoke_admin_role`, `purge_expired_offers_ingest_nonces`) possuem:
    - `proconfig = ARRAY['search_path=""']` (verificado por asserção pgTAP no catálogo `pg_proc`);
    - `OWNER TO postgres`;
    - `REVOKE ALL ON FUNCTION ... FROM public, anon, authenticated`.
  - Apenas `is_post_public(bigint)` (`anon, authenticated`) e `is_admin()` (`authenticated, service_role`) expõem `EXECUTE` fora de `service_role`, pois são predicados de leitura invocados dentro de policies RLS.

### 2.4. Os `REVOKE`, `GRANT`, `FORCE ROW LEVEL SECURITY` e policies da migration nova estão corretos e não quebram fluxos legítimos?

- **Constatação:** **Sim (PASS).**
- **Evidência:**
  - `public.profiles` recebeu `REVOKE ALL FROM public, anon`, `GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated` e `FORCE ROW LEVEL SECURITY`, mantendo as policies `profiles_select_own`, `profiles_insert_own` e `profiles_update_own` intactas e bloqueando `DELETE` por `authenticated` (`42501`).
  - `public.offers_ingest_nonces` e `public.offer_operation_keys` receberam `FORCE ROW LEVEL SECURITY`, policies explícitas `offers_ingest_nonces_service_role_select_insert` e `offer_operation_keys_service_role_select_insert`, e revogação de `UPDATE, DELETE, TRUNCATE` até para `service_role`.
  - Nenhum fluxo legítimo de ingestão (`POST /api/ingest/ofertas`), avaliação de selo (`POST /api/admin/ofertas/[id]/avaliar-selo`) ou leitura/escrita de RBAC (`GET/POST/DELETE /api/admin/usuarios/papeis`) foi quebrado, conforme comprovado pelas 7 suítes pgTAP (`228/228` PASS) e pelos testes de integração com banco real (`6/6` PASS).

### 2.5. A RPC de expurgo de nonces (`purge_expired_offers_ingest_nonces`) é segura, limitada e executável apenas por identidade autorizada?

- **Constatação:** **Sim (PASS).**
- **Evidência (`supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql:220-248`):**
  - Valida `IF p_retention IS NULL OR p_retention < interval '10 minutes' THEN RAISE EXCEPTION 'retention_below_minimum_replay_window' USING ERRCODE = '22023';`, impedindo expurgo de nonces dentro da janela ativa de replay de 5 minutos (`MAX_SKEW_MS = 300_000`).
  - Executa exclusivamente `DELETE FROM public.offers_ingest_nonces WHERE consumed_at < pg_catalog.now() - p_retention;` apoiado pelo índice `idx_offers_ingest_nonces_consumed_at`.
  - `REVOKE ALL ON FUNCTION public.purge_expired_offers_ingest_nonces(interval) FROM public, anon, authenticated; GRANT EXECUTE ... TO service_role;`.

### 2.6. Os testes exercitam de fato rollback, concorrência e permissões, sem mocks escondendo falhas de banco?

- **Constatação:** **Sim (PASS).**
- **Evidência:**
  - `supabase/tests/database/admin_rbac.test.sql` (52 asserções pgTAP) e `supabase/tests/database/offers_ingest_idempotencia.test.sql` (25 asserções pgTAP) rodam diretamente dentro do PostgreSQL real via `supabase test db`.
  - `__tests__/integration/spec-0021-real-db-concurrency.test.ts` (6 testes) conecta-se ao Supabase local real em `http://127.0.0.1:54321` com duas instâncias independentes de `createClient` (`clientA` e `clientB`) e executa chamadas concorrentes reais às RPCs e rotas, sem mockar `supabase.rpc` ou `supabase.from`.
  - `__tests__/unit/admin-rbac.test.ts` (20 testes) cobre complementarmente a sanitização em camada de aplicação (`sanitizeAuditIp` e `sanitizeAuditEmail` em `lib/admin/roles.ts`).

### 2.7. O teste de concorrência distingue explicitamente banco indisponível de teste aprovado?

- **Constatação:** **Sim (PASS).**
- **Evidência empírica nos 3 modos de execução de `__tests__/integration/spec-0021-real-db-concurrency.test.ts`:**
  1. **Modo opcional sem banco acessível (`BypassSandbox: false`, sem `REQUIRE_REAL_DB`):**
     - Resultado: `✓ __tests__/integration/spec-0021-real-db-concurrency.test.ts (6 tests | 6 skipped)` — nenhum teste é contabilizado como `passed`.
  2. **Modo obrigatório sem banco acessível (`REQUIRE_REAL_DB=1` no sandbox sem acesso a `127.0.0.1:54321`):**
     - Resultado: `FAIL __tests__/integration/spec-0021-real-db-concurrency.test.ts` com `Error: REQUIRE_REAL_DB=1: Supabase local indisponível em http://127.0.0.1:54321. Inicie o banco local antes de executar a suíte de concorrência real.` (`EXIT_CODE=1`).
  3. **Modo obrigatório com PostgreSQL local ativo (`REQUIRE_REAL_DB=1` conectado a `http://127.0.0.1:54321`):**
     - Resultado: `Test Files 1 passed (1) | Tests 6 passed (6)` (`EXIT_CODE=0`).

---

## 3. Observações Não Bloqueantes (NITs)

1. **`NIT-01` — `actor_role` fixo como `'admin'` dentro de `assign_admin_role` e `revoke_admin_role` (`20261021103000_rbac_atomicity_and_rls_hardening.sql:88, 146`):**
   - As duas RPCs gravam `'admin'::public.admin_role_type` na coluna `actor_role` de `public.admin_audit_log`. Isso é coerente com o modelo do projeto (onde apenas operadores com papel `'admin'` — incluindo a conta raiz `ADMIN_USER_ID` definida via variável de ambiente — podem atribuir ou revogar papéis após `assertAdminApiAuth(request, 'admin')`), mas a função SQL em si confia que a camada chamadora (`service_role`) já autenticou o papel `'admin'` do `p_actor_id`. Não há risco de escalada porque apenas `service_role` possui `EXECUTE` nas RPCs.
2. **`NIT-02` — Caso de teste positivo de `purge_expired_offers_ingest_nonces` em pgTAP (`supabase/tests/database/offers_ingest_idempotencia.test.sql:179-184`):**
   - A suíte pgTAP valida a rejeição de janela inferior a 10 minutos (`22023`) e a revogação de `EXECUTE` para `anon`/`authenticated`. Adicionar futuramente uma asserção positiva que insira um nonce com `consumed_at = now() - interval '25 hours'` e verifique `purge_expired_offers_ingest_nonces('24 hours') = 1` completará o par positivo/negativo no pgTAP.
3. **`NIT-03` — Linha em branco no fim de `supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql`:**
   - O arquivo não rastreado `supabase/migrations/20261021103000_rbac_atomicity_and_rls_hardening.sql` possui uma linha vazia extra na linha 289 (`new blank line at EOF`). Pode ser removida antes do `git add`/`git commit`.

---

## 4. Comandos Executados nesta Revisão Independente

| Comando                                                                                                                                                             | Resultado                                                             |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------- |
| `pnpm vitest run __tests__/unit/admin-rbac.test.ts __tests__/integration/spec-0021-real-db-concurrency.test.ts` (sandbox sem DB)                                    | `exit 0` (`20 passed \| 6 skipped`)                                   |
| `REQUIRE_REAL_DB=1 pnpm vitest run __tests__/integration/spec-0021-real-db-concurrency.test.ts` (sandbox sem DB)                                                    | `exit 1` (`Error: REQUIRE_REAL_DB=1: Supabase local indisponível...`) |
| `REQUIRE_REAL_DB=1 pnpm vitest run __tests__/integration/spec-0021-real-db-concurrency.test.ts` (com Supabase local ativo)                                          | `exit 0` (`6 passed`)                                                 |
| `pnpm supabase:test` (com Supabase local ativo)                                                                                                                     | `exit 0` (`Files=7, Tests=228, Result: PASS`)                         |
| `pnpm typecheck`                                                                                                                                                    | `exit 0` (`tsc --noEmit` limpo)                                       |
| `npx eslint lib/admin/roles.ts scripts/admin-bootstrap.mjs __tests__/integration/spec-0021-real-db-concurrency.test.ts __tests__/unit/admin-rbac.test.ts`           | `exit 0`                                                              |
| `npx prettier --check lib/admin/roles.ts scripts/admin-bootstrap.mjs __tests__/integration/spec-0021-real-db-concurrency.test.ts __tests__/unit/admin-rbac.test.ts` | `exit 0` (`All matched files use Prettier code style!`)               |

---

## 5. Recomendação de Próximo Passo

Com todas as **6 lacunas de segurança** e a **confiabilidade do teste de concorrência** auditadas e aprovadas localmente (`PASS` em todas as frentes), o próximo passo recomendado antes de qualquer operação Git é:

1. Executar a rodada local integrada `pnpm check:all` (e remover a linha em branco final de `20261021103000_rbac_atomicity_and_rls_hardening.sql:289`) para consolidar o gate de qualidade na árvore atual.
2. Solicitar decisão do usuário para commit/push (ex.: primeiro da correção isolada de tipagem E2E ou do pacote de segurança) e validação na CI remota, mantendo o deploy de produção condicionado aos 5 critérios objetivos de `docs/operations/2026-10-20-2200-relatorio-prontidao-producao.md`.
