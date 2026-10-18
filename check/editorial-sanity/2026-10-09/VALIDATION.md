# Validação Operacional: 0006-transicao-editorial-sanity

> Registro formal de evidências empíricas, testes contra build de produção e delimitações da spec 0006 (`docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`).

---

## 1. Identidade e Versão

- **Spec**: [`docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md) (Status: `Accepted`)
- **Branch**: `feat/transicao-editorial-sanity`
- **Data**: 2026-10-09
- **Frameworks de Teste**: Vitest 4.1 (jsdom/node), Playwright 1.63 (Chromium) e OpenNext / Next.js 16.4

---

## 2. Delimitações Rigorosas de Evidência

As quatro premissas de fronteira permanecem documentadas e respeitadas:

1. **Mocks não executam GROQ no Sanity:**
   - A suíte unitária comprova a estrutura léxica da consulta GROQ montada (`!(_id in path("drafts.**"))`, `publishedAt <= $now`, `status == "publicado"`, precedência `order(_id match "drafts.*" desc)[0]`), passagem de parâmetros (`$slug`, `$now`) e o parsing de documentos para a interface de domínio `Post`.
   - **Não comprova** a filtragem remota do Content Lake nem a precedência real dos rascunhos em infraestrutura externa.

2. **`null → notFound()` não comprova HTTP 404 isoladamente:**
   - No App Router do Next.js com streaming, a invocação tardia de `notFound()` durante a fase de renderização enviava historicamente HTTP 200 de streaming com corpo de erro (soft 200).
   - **Prova empírica realizada:** A interceptação prévia no proxy (`lib/preview/auth.ts` + `lib/supabase/middleware.ts`) associada ao teste contra build de produção (`e2e/editorial-sanity.spec.ts`) atestou **HTTP 404 real na rede** com cabeçalhos `Cache-Control: private, no-store`.

3. **HTTP 200 não comprova papel Viewer:**
   - Consultas públicas a datasets abertos respondem sem exigir autenticação. A restrição a privilégios mínimos (`Viewer`) e a revogação efetiva do token anterior exigem auditoria no console do Sanity Manage.

4. **Tratamento de Falhas de Infraestrutura vs. 404:**
   - Falhas transitórias de infraestrutura (500/503 ou erro de rede) propagam erro explícito via `getSanityPostBySlug` e `isArticleAccessible`. O erro atinge a fronteira de erro `app/error.tsx` (HTTP 500), **impedindo que indisponibilidade externa seja mascarada como 404 ou conteúdo vazio**.

---

## 3. Escopo e Arquivos de Teste

1. **`__tests__/unit/sanity-client.test.ts` (9 testes unitários — Vitest)**:
   - Configuração de credenciais (`projectId`, `dataset`, `apiVersion`);
   - Mapeamento e fallback de autores, imagens e campos tipados;
   - Consultas de publicados com corte temporal estrito (`publishedAt <= $now`) e sem token `Authorization` em chamadas públicas;
   - Consultas por slug com isolamento de rascunhos para anônimos e prioridade de draft para preview autenticado;
   - Propagação de erro HTTP 500/503 e falha de rede sem mascarar como 404.

2. **`e2e/editorial-sanity.spec.ts` (4 testes E2E — Playwright contra servidor de produção)**:
   - `slug de artigo inexistente devolve status HTTP 404 real na rede` (1.7s);
   - `tentativa de acesso direto a rascunho sem preview devolve HTTP 404 real` (1.3s);
   - `respostas de erro 404 emitem cabeçalho de cache no-store` (1.4s);
   - `home pública responde HTTP 200 com headers de segurança` (1.4s).

---

## 4. Comandos Executados e Resultados Empíricos

| Comando                                                                   |     Resultado     | Testes Passando | Observações                                                            |
| :------------------------------------------------------------------------ | :---------------: | :-------------: | :--------------------------------------------------------------------- |
| `pnpm test:run` (Vitest)                                                  | **PASS (exit 0)** |   **175/175**   | 21 arquivos de teste passando                                          |
| `pnpm test:coverage` (V8)                                                 | **PASS (exit 0)** |        —        | **77,6% Linhas**, **77,18% Stmts**, **75,19% Branches** (piso 60%)     |
| `E2E_PRODUCTION=1 pnpm exec playwright test e2e/editorial-sanity.spec.ts` | **PASS (exit 0)** |     **4/4**     | Executado contra servidor de produção com terminação TLS na porta 3100 |
| `pnpm typecheck` (`tsc --noEmit`)                                         | **PASS (exit 0)** |        —        | Zero erros de tipagem                                                  |
| `pnpm lint` (`eslint .`)                                                  | **PASS (exit 0)** |        —        | Zero erros de linting                                                  |
| `pnpm format:check` (`prettier`)                                          | **PASS (exit 0)** |        —        | 100% dos arquivos formatados                                           |
| `pnpm check:all`                                                          | **PASS (exit 0)** |   **175/175**   | Portão global de qualidade aprovado                                    |
| `pnpm build` (OpenNext Cloudflare)                                        | **PASS (exit 0)** |        —        | Gera `.open-next/worker.js` com sucesso                                |
| `wrangler deploy --dry-run`                                               | **PASS (exit 0)** |        —        | Validação de bindings e assets Cloudflare                              |

---

## 5. Rastreabilidade com os Critérios de Aceite (Spec 0006)

- **`editorial/AC-01`**: Mapeamento do modelo Sanity em `lib/sanity/client.ts` com tipagem estrita e testes em `sanity-client.test.ts`.
- **`editorial/AC-02`**: Consulta de publicados com filtro temporal `publishedAt <= $now` e exclusão de drafts `!(_id in path("drafts.**"))`.
- **`editorial/AC-03`**: Rota `/artigos/[slug]` emitindo status HTTP 404 real na rede para artigos inexistentes e rascunhos anônimos (comprovado no E2E contra build).
- **`editorial/AC-04`**: Distinção estrita entre 404 e erros de infraestrutura (falhas 500/503 propagadas para fronteira de erro).
- **`editorial/AC-05`**: Headers `Cache-Control: private, no-store` emitidos para respostas 404 e rotas protegidas.
- **`editorial/AC-06`**: Precedência de rascunhos sob sessão de preview autenticada via Durable Object (`order(_id match "drafts.*" desc)[0]`).
- **`editorial/AC-07`**: Compatibilidade com build Cloudflare Worker via OpenNext validada por `pnpm build` e `wrangler deploy --dry-run`.
- **`editorial/AC-08`**: Sigilo de segredos permanente (sem exposição de credenciais em código, relatórios ou logs).

---

## 6. Governança e Próximos Passos

- **PR #24**: Mantida estritamente em **rascunho (Draft)**.
- **Merge e Deploy**: Seguem **desautorizados**.
- **Próximo Passo**: Aguardar confirmação de revogação do token Sanity anterior no console Sanity Manage para execução da verificação conectada (GROQ real, perspectivas de rascunhos e autorização pelo Durable Object).
