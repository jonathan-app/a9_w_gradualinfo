# Relatório de Verificação — Execução Local e Acessibilidade (md-0002)

**Data:** 2026-10-07  
**HEAD Git:** `2639744b44b82cb7e659e941f60c460ad5873182` (commit limpo da branch `feat/md-0002-casca-editorial-home`)  
**Status do Gate Mecânico:** APROVADO (13/13 PASS mecânico comprovado em `scripts/check-gate.mjs`)  
**Status de Governança:** MERGE E DEPLOY BLOQUEADOS (retenção expressa por determinação do usuário)

---

## 1. Contexto e Objetivos

Execução empírica das suítes de teste de banco de dados, unidade, end-to-end de preview HTTP e acessibilidade (Axe Core) na árvore real do projeto `a9_w_gradualinfo`:

1. **Banco de Dados Local (Supabase):** Aplicação de migrations, seed limpo e execução da suíte pgTAP (`rls_posts_test.sql`) comprovando RLS para artigos e rascunhos.
2. **Suíte Unitária (Vitest):** Validação dos testes unitários de formatação, sanitização contra XSS e lógica de negócio (92/92 PASS em 14 arquivos).
3. **Acessibilidade (Axe Core via Playwright):** Auditoria automatizada de conformidade WCAG AA nas páginas Home (`/`), Artigo Publicado (`/artigos/fixture-publicado`) e Rascunho com Preview Autenticado (`/artigos/fixture-rascunho`), além de navegação com foco de teclado visível.
4. **Preview HTTP e Autorização (Playwright E2E):** Validação de 21 cenários de teste em servidor de produção simulada (`next start` na porta 3101 com terminação TLS na 3100 e proxy de falhas na 3110), cobrindo HTTP 404 em rascunhos anônimos/artigos inexistentes, simulação de falha 503 em logout com limpeza local e expiração real de token JWT de 60s.

---

## 2. Evidências Empíricas Executadas

### 2.1. Supabase Local e pgTAP (AC-11)

- **Comando:** `pnpm supabase:test`
- **Ambiente:** PostgreSQL 17 gerenciado pelo container local `supabase_db_gradualinfo-editorial`.
- **Resultado:** **PASS (63/63 asserções)**
- **Log de Evidência:**
  ```text
  /home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/supabase/tests/rls_posts_test.sql .. ok
  All tests successful.
  Files=1, Tests=63, 1 wallclock secs
  Result: PASS
  ```
- **Detalhes:** Validação das políticas de Row Level Security (RLS) para leitura de rascunhos, agendados e artigos publicados com papéis `anon`, `authenticated` e controle de permissão por `app_metadata.preview`.

### 2.2. Vitest — Testes Unitários e Sanitização (AC-06 / AC-09)

- **Comando:** `pnpm test:run`
- **Resultado:** **PASS (92/92 testes em 14 arquivos)**
- **Destaques:** Testes de `serializeJsonLd` comprovando que caracteres de escape e tags perigosas em JSON-LD (`<`, `>`, `&`) são serializados como sequências seguras Unicode (`\u003c`, `\u003e`, `\u0026`). Especificamente, o payload malicioso `</script><script>alert(1)</script>` é codificado como `\u003c/script\u003e\u003cscript\u003ealert(1)\u003c/script\u003e`, o que impede o fechamento prematuro do bloco de script pelo parser HTML, preservando ao mesmo tempo a integridade para `JSON.parse` sem quebrar o objeto de dados estruturados.

### 2.3. Acessibilidade — Axe Core Playwright (AC-12)

- **Comando:** `playwright test e2e/accessibility.spec.ts e2e/verify-md0002-tarefa4.spec.ts`
- **Resultado:** **PASS (0 violações axe; navegação com foco visível)**
  - Home (`/`): 0 violações de acessibilidade
  - Artigo Publicado (`/artigos/fixture-publicado`): 0 violações de acessibilidade
  - Rascunho com Preview Autenticado: 0 violações de acessibilidade (validado também em `e2e/verify-md0002-acessibilidade.spec.ts`)
  - Teclado com foco visível no link "Pular para o conteúdo" e elementos interativos.

### 2.4. Resposta HTTP 404 e Streaming (AC-07)

- **Problema Anterior:** No Next.js 16 com streaming SSR, quando o Server Component assíncrono emitia `notFound()` após a busca no banco, os headers de chunk do layout síncrono já haviam sido enviados com status 200 (renderizando a página 404 com status HTTP 200).
- **Correção Implementada:**
  - `lib/preview/auth.ts`: Função pura `isArticleAccessible` e `verifyPreviewSession`.
  - `lib/supabase/middleware.ts`: O middleware intercepta `/artigos/[slug]` antes da renderização e avalia acessibilidade (verificando publicação e sessão de preview em cookie). Se o artigo for inacessível, rascunho sem preview ou inexistente, reescreve imediatamente para `/_not-found` com status **404** nos headers da resposta.
- **Resultado:** **PASS**. `e2e/verify-md0002-tarefa5.spec.ts` (4/4 testes) e `e2e/verify-md0002-tarefa8.spec.ts` confirmam que `/artigos/fixture-rascunho` (sem sessão), `/artigos/fixture-agendado` e `/artigos/inexistente-12345` retornam status HTTP **404** exato.

### 2.5. Preview HTTP, Logout com Falha e Expiração Real de Token (AC-08)

- **Comando:** `playwright test e2e/verify-md0002-tarefa8.spec.ts`
- **Ambiente de Execução:** Servidor HTTPS de produção local (`https://localhost:3100`), proxy de falhas Supabase na 3110 e container GoTrue local com `jwt_expiry = 60` definido em `supabase/config.toml` (escopo de teste local; não afeta ambiente de produção).
- **Resultado:** **PASS (11/11 testes)**
  1. Rascunho anônimo retorna HTTP 404.
  2. GET antigo não autentica (405) e POST inválido falha (401).
  3. Sessão válida lê rascunho com status 200, sem indexação (`noindex`) e sem cache (`Cache-Control: no-store`).
  4. Autorização vencida nega rascunho mantendo a sessão Supabase.
  5. Logout remove cookies e nega leitura subsequente.
  6. Outra identidade com claim válida não lê rascunho de terceiro.
  7. Identidade permitida sem claim não lê rascunho.
  8. Conta sem claim com sessão real permanece pública.
  9. Falha real de transporte no GoTrue (`503` induzido pelo proxy de falhas) é tratada respondendo `503` com limpeza local de cookies.
  10. Sessão GoTrue realmente expirada (aguardando ~61s sob `jwt_expiry = 60` em `supabase/config.toml`) nega rascunho sem apagar cookies indevidamente.
  11. Cookies de preview preservam atributos `HttpOnly`, `Secure` e `SameSite=lax` em HTTPS.

---

## 3. Matriz Consolidada de Critérios de Aceite (md-0002)

| AC                | Requisito                                                  | Status Empírico | Evidência                                         |
| :---------------- | :--------------------------------------------------------- | :-------------- | :------------------------------------------------ |
| **md-0002/AC-01** | Home lista no máximo 10 artigos publicados sem rascunhos   | PASS            | `verify-md0002-tarefa4.spec.ts`                   |
| **md-0002/AC-02** | Cards exibem capa, editoria, título, resumo e data         | PASS            | `verify-md0002-tarefa4.spec.ts`                   |
| **md-0002/AC-03** | Estado vazio vs. estado de erro distintos                  | PASS            | `verify-md0002-tarefa4.spec.ts` (transporte 503)  |
| **md-0002/AC-04** | Artigo em destaque no topo + grade                         | PASS            | `verify-md0002-tarefa4.spec.ts`                   |
| **md-0002/AC-05** | Renderização semântica de Markdown                         | PASS            | `verify-md0002-tarefa5.spec.ts`                   |
| **md-0002/AC-06** | Sem `dangerouslySetInnerHTML` no corpo do artigo           | PASS            | `verify-md0002-tarefa5.spec.ts`                   |
| **md-0002/AC-07** | Artigo inexistente ou futuro devolve 404                   | PASS            | `verify-md0002-tarefa5.spec.ts` + `middleware.ts` |
| **md-0002/AC-08** | Preview protegido por token/credencial, expiração e logout | PASS            | `verify-md0002-tarefa8.spec.ts` (11/11 PASS)      |
| **md-0002/AC-09** | JSON-LD Article estruturado e sanitizado                   | PASS            | `verify-md0002-tarefa5.spec.ts`                   |
| **md-0002/AC-10** | Canonical absoluto e sitemap dinâmico                      | PASS            | `verify-md0002-tarefa5.spec.ts`                   |
| **md-0002/AC-11** | RLS e proibição de `service_role` em leituras públicas     | PASS            | `rls_posts_test.sql` (63/63 PASS no pgTAP)        |
| **md-0002/AC-12** | Acessibilidade WCAG AA (Axe Playwright)                    | PASS            | `accessibility.spec.ts` (0 violações)             |
| **md-0002/AC-13** | Exibição de fontes citadas no final do corpo               | PASS            | `verify-md0002-tarefa5.spec.ts`                   |

---

## 4. Veredito do Gate Mecânico e Governança

- **Veredito Mecânico (`scripts/check-gate.mjs`):** **APROVADO**
  - SHA do commit avaliado: `2639744b44b82cb7e659e941f60c460ad5873182`
  - Árvore avaliada: `8cc6ced73f8aa464fcce42de7ffb0cc16257a098`
  - Total de ACs: 13 | PASS: 13 | FAIL: 0 | UNVERIFIABLE: 0 | BLOCKER: 0
- **Governança:** **MERGE E DEPLOY NÃO AUTORIZADOS**. A aprovação mecânica comprova a correção funcional e a conformidade dos contratos da spec `md-0002`. Nenhuma ação de merge para a branch principal ou deploy em ambientes externos foi realizada ou autorizada. O `jwt_expiry = 60` em `supabase/config.toml` é uma configuração de teste local para validação real de expiração (AC-08), não um valor de produção. Documentado no relatório de execução.
- **Achado CI (não afeta aprovação):** Job `Segredos no histórico e árvore` falha operacionalmente porque `scripts/run-gitleaks.mjs` (linha 143) passa `--redact` como flag booleana, enquanto gitleaks 8.28.0 requer `--redact=100` (percentual). A falha é operacional, não um achado de segredo. A correção do script fica fora do escopo desta entrega.
