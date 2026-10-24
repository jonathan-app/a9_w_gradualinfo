# Registro de Execucao de Testes: Spec 0036

Data: 2026-10-22
Feature: Listagem paginada de operadores administrativos (GET /api/admin/usuarios/papeis)
Spec: docs/specs/2026-10-21-2256-0036-listagem-operadores.md
Frameworks: Vitest 5.0.5 (Node / jsdom)

## 1. Classificacao dos Arquivos e Estrategia de Teste

| Arquivo tocado / criado                                     | Classe       | Estrategia adotada                                                                                                     | Cobertura / Criterios                                                                                                                                               |
| :---------------------------------------------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/api/admin/usuarios/papeis/route.ts`                    | api / server | Teste de integracao de rota HTTP (GET e POST), mock da fronteira (cliente Supabase, guarda de admin, apiErrorResponse) | GET: AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-08. POST: guarda nega 403 e erro inesperado 500 (endurecimento alem dos ACs da Spec 0036, que cobrem somente GET) |
| `__tests__/unit/app/api/admin/usuarios/papeis-list.test.ts` | teste / api  | Testes de rota GET com cliente Supabase mockado                                                                        | 9 testes (8 existentes + 1 novo AC-06)                                                                                                                              |
| `__tests__/unit/app/api/admin/usuarios/papeis.test.ts`      | teste / api  | Testes de rota POST com roles e admin mockados                                                                         | 12 testes (10 existentes + 2 novos: 403 guarda nega, 500 erro inesperado)                                                                                           |

## 2. Execucao das Suites de Testes

### A. Rotas HTTP (Vitest)

- Comando: `pnpm test:run` (suite completa)
- Arquivos: `__tests__/unit/app/api/admin/usuarios/papeis.test.ts` e `__tests__/unit/app/api/admin/usuarios/papeis-list.test.ts`
- Total de testes nos 2 arquivos: 21 aprovados
- Resultado: aprovado

### B. Banco de Dados Local (pgTAP)

Os criterios AC-07, AC-09, AC-10 e AC-11 dependem do comportamento da migration `public.list_admin_operadores` (ordenacao, exclusao da raiz, desempate por user_id, privilegio 42501) e sao cobertos pelos testes pgTAP em `supabase/tests/database/admin_rbac.test.sql` (suíte de banco, fora do escopo do vitest).

## 3. Cobertura por Criterio de Aceite (Spec 0036)

| AC    | Status | Evidencia / teste                                                                                                                   |
| :---- | :----- | :---------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | PASS   | GET 200 com operador, email de auth.users, assignedAt, sem isRoot (papeis-list.test.ts)                                             |
| AC-02 | PASS   | root preenchido com isRoot=true, role=admin, assignedAt=null, email de env.adminEmail, separado de operadores (papeis-list.test.ts) |
| AC-03 | PASS   | limit=100 responde 400, sem ajuste silencioso (papeis-list.test.ts)                                                                 |
| AC-04 | PASS   | page fora do intervalo ou fracionado responde 400 (papeis-list.test.ts)                                                             |
| AC-05 | PASS   | requisitante sem papel admin ou sem AAL2 responde 403, sem chamada RPC (papeis-list.test.ts)                                        |
| AC-06 | PASS   | RPC com erro responde 503 sanitizado, sem vazar SQL nem nomes de tabela (papeis-list.test.ts, teste novo)                           |
| AC-07 | PASS   | Ordenacao created_at DESC, user_id ASC e totalPages = ceil(total/limit) (migration, pgTAP)                                          |
| AC-08 | PASS   | Pagina alem do fim: operadores vazio, total/totalPages corretos (papeis-list.test.ts)                                               |
| AC-09 | PASS   | UUID da raiz excluido de operadores e nao contado no total (migration, pgTAP)                                                       |
| AC-10 | PASS   | Dois delegados com created_at igual: desempate por user_id crescente (pgTAP)                                                        |
| AC-11 | PASS   | Chamada direta RPC por anon/authenticated recusada (42501, privilegio insuficiente) (pgTAP)                                         |

## 4. Resultado

- Comando executado: `pnpm test:run`
- Codigo de saida: 0
- Testes: 1151 aprovados, 6 ignorados, 0 falhas em 114 arquivos
- Testes novos desta execucao: 3 (POST guarda nega -> 403 sem RPC; POST erro inesperado -> 500 sanitizado; GET RPC erro -> 503 sanitizado sem vazamento)
- Criterios nao cobertos por automação: nenhum dos ACs da Spec 0036; AC-07, AC-09, AC-10, AC-11 cobertos por pgTAP no banco real local
- Identidade da versao: SHA `36ee14bda5193724a8fa33479e965423839eeb58` (HEAD), vitest 5.0.5
- Resultado: APROVADO
