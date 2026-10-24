# 0036. Listagem paginada de operadores administrativos (junção servidor)

**Date**: 2026-10-21
**Status**: Accepted
**Revisão**: 2; data: 2026-10-21; responsável: proprietário
**Escopo**: fatia de gestão de operadores (`/api/admin/usuarios/papeis`)
**Substitui**: N/A (novo contrato de leitura)

---

## Problema, público e limites

O painel administrativa precisa listar os operadores delegados com e-mail, papel, data de atribuição e sinalização da conta raiz, paginado e ordenado, sem expor nem varrer `auth.users` inteiro a cada requisição e sem consulta por linha (N+1) para trazer o e-mail de cada operador.

**Público**: operador com papel `admin` e sessão AAL2 (Cloudflare Access mantido).

**Fora deste escopo**: cadastro, convite, exclusão de contas, recuperação de delegados, página/UI de listagem (Fase 3) e mutações (já cobertas por `POST/DELETE /api/admin/usuarios/papeis`, Spec 0032).

---

## Requirements

- **operadores/AC-01**: Dado um operador com papel em `admin_user_roles`, quando `GET /api/admin/usuarios/papeis?page=1&limit=20` por `admin` autenticado em AAL2, então retorna 200 com o operador, e-mail vindo de `auth.users`, `assignedAt` e sem `isRoot`.
- **operadores/AC-02**: Dado `env.adminUserId` configurado, quando a listagem é requisitada, então `root` vem preenchido com `isRoot: true`, `role: "admin"` e `assignedAt: null` (e-mail de `env.adminEmail`), destacado separadamente dos `operadores`.
- **operadores/AC-03**: Dado `limit=100`, quando requisitado, então responde 400 (teto de 50 por página, sem ajuste silencioso).
- **operadores/AC-04**: Dado `page` fora do intervalo (ex: 0 ou negativo), ou `page`/`limit` fracionários, quando requisitado, então responde 400.
- **operadores/AC-05**: Dado requisitante sem papel `admin` ou sem AAL2, quando requisitado, então responde 403.
- **operadores/AC-06**: Dado banco indisponível, quando requisitado, então responde 503 sanitizado, sem vazar SQL nem detalhes internos.
- **operadores/AC-07**: Dado mais de 50 delegados, quando `page=2`, então a ordenação `created_at DESC, user_id ASC` é mantida e `totalPages` bate com `ceil(total/limit)`.
- **operadores/AC-08**: Dado `page` além do último registro, quando requisitado, então `operadores` vem vazio e `total`/`totalPages` ainda retornam o total correto dos delegados.
- **operadores/AC-09**: Dado o UUID da raiz também presente em `admin_user_roles`, quando a listagem é requisitada, então a raiz não aparece em `operadores` nem é contada no total de delegados.
- **operadores/AC-10**: Dado dois delegados com `created_at` igual, quando listados, então o desempate usa `user_id` em ordem crescente.
- **operadores/AC-11**: Dado chamada direta à RPC `list_admin_operadores` por `anon` ou `authenticated`, quando requisitado, então o banco recusa a execução (42501 / privilégio insuficiente).

---

## Decisões técnicas

### Dados

- Fonte de papel e data de atribuição: `public.admin_user_roles` (`user_id`, `role`, `created_at` como `assigned_at`).
- Fonte do e-mail: `auth.users.email`, obtida exclusivamente no servidor via cliente `service_role` (a coluna `email` de `auth.users` não é exposta pelo PostgREST ao cliente comum nem ao papel `authenticated`).
- Conta raiz (`env.adminUserId`): resolvida como `admin` no servidor, sem linha obrigatória em `admin_user_roles`, injetada como linha destacada e separada (`isRoot: true`). Seu e-mail vem de `env.adminEmail` e `assignedAt` é `null` (não se aplica). Não entra na paginação nem na contagem dos delegados.
- Campos devolvidos por operador: `userId` (uuid), `email` (text), `role` (admin/editor/revisor), `assignedAt` (timestamptz). A raiz recebe também `isRoot: true`.

### Migração e rollback

N/A nesta spec: a tabela `admin_user_roles`, o enum `admin_role_type`, as RPCs `assign_admin_role`/`revoke_admin_role` e o cliente `service_role` já existem (Spec 0032). Apenas uma nova função de leitura será adicionada, em migration própria com timestamp posterior, idempotente (`create or replace`) e revertível por remoção da função.

### API

`GET /api/admin/usuarios/papeis` (adicionado ao `route.ts` existente, reuso do endpoint).

- Autenticação: `assertAdminApiAuth(request, 'admin')` → exige `admin` + AAL2 + Cloudflare Access + validação de origem (CSRF).
- Query strings: `page` (default 1, mínimo 1), `limit` (default 20, máximo 50).
- Resposta 200:
  ```json
  {
    "root": { "userId": "<uuid>", "email": "<email>", "role": "admin", "assignedAt": null, "isRoot": true } | null,
    "operadores": [
      { "userId": "<uuid>", "email": "<email>", "role": "editor", "assignedAt": "2026-10-20T10:00:00Z" }
    ],
    "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
  ```
- `total`/`totalPages` contam apenas delegados (raiz é separada).

### Contrato de leitura (RPC)

Nova função `public.list_admin_operadores(p_root_id uuid, p_limit int, p_offset int)`:

- `SECURITY DEFINER`, `set search_path = ''`, executável apenas por `service_role`.
- `p_root_id` é o UUID da conta raiz (`env.adminUserId`), passado pela aplicação; quando nulo ou ausente não há exclusão. O UUID raiz é excluído da consulta **antes** da ordenação, da paginação e da contagem, para que nunca apareça como delegado nem distorça o total.
- Junção única no servidor: `public.admin_user_roles aur JOIN auth.users u ON u.id = aur.user_id`, com filtro `aur.user_id <> p_root_id` (ou `p_root_id IS NULL`).
- Ordenação: `aur.created_at DESC, aur.user_id ASC`.
- Paginação: `LIMIT p_limit OFFSET p_offset`, com `p_limit` limitado a 50 no banco (`least(greatest(p_limit,1),50)`) e `p_offset` pisoado em 0.
- Contagem total: computada sobre o conjunto já filtrado e independente do `LIMIT/OFFSET`, de modo que a página vazia (ex: `page` além do fim) ainda devolva `total` correto e `operadores` vazio.
- Colunas de saída (projeção estrita): `user_id`, `email`, `role`, `assigned_at` (alias de `aur.created_at`), `total_count`. Nenhum outro campo do `auth.users` é exposto.

A raiz não entra nesta RPC: é montada na camada da aplicação a partir de `env.adminUserId` e `env.adminEmail`, nunca de uma varredura de `auth.users`.

### Validação de parâmetros (decisão fechada em 2026-10-21)

- Ausentes: `page=1` e `limit=20`.
- Informados: inteiros positivos; `limit` entre 1 e 50.
- Inválidos, vazios, repetidos ou `limit > 50`: HTTP 400 (sem ajuste silencioso).
- Página válida além do fim: HTTP 200, `operadores: []` e `total` correto.
- Offset fora do intervalo suportado pela RPC: HTTP 400.
- `p_root_id`: obtido exclusivamente de `env.adminUserId`, nunca da requisição.
- A RPC valida `p_limit` e `p_offset` internamente (piso em 0, teto em 50), independente do caller.

### Erros

- 401 sessão ausente; 403 origem inválida / papel insuficiente / sem AAL2 / execução da RPC por `anon` ou `authenticated` (negado por privilégio); 503 banco indisponível (sanitizado, sem detalhe SQL); 400 `page`/`limit` fora do intervalo.
- Respostas 5xx suprimem `details` e sanitizam `message` via `apiErrorResponse` (fail-closed, padrão já existente).

### Regras

- Não listar todos os usuários do Auth por requisição.
- Não executar uma consulta por operador para obter o e-mail (junção única).
- Limite rígido de 50 por página.
- Raiz imutável: nem aparece como delegado mutável nem pode ser alvo de `POST/DELETE` de papel (já aplicado nos endpoints existentes, 409); é excluída da consulta de delegados antes da ordenação, paginação e contagem.

### Integrações

- Durable Object de rate limit e guard `assertAdminApiAuth` (mesmos dos endpoints de papel existentes).
- Nenhum novo provedor externo.

### Ambiente

- Variáveis usadas: `ADMIN_USER_ID` (raiz), `ADMIN_EMAIL` (e-mail da raiz), `SUPABASE_SERVICE_ROLE_KEY` (cliente privilegiado, servidor apenas). Todas já existem em `lib/env.ts`.
- Sem segredos no cliente; leitura exclusivamente no servidor (`server-only` para o serviço de leitura, se houver).

---

## UI e acessibilidade

N/A justificado nesta fatia: o contrato formalizado é o de leitura do servidor. A renderização da página, estados (vazio, carregamento, erro), teclado e foco ficam para a UI da listagem (Fase 3), que consumirá este endpoint. Acesso à página: exclusivamente `admin` + AAL2, com Cloudflare Access.

---

## Segurança e limites

- Matriz de permissões: apenas `admin` lê a listagem; `editor`/`revisor` recebem 403. A raiz não é listada como delegado nem pode ser modificada.
- Validação sempre no servidor; o cliente nunca informa papel nem e-mail do alvo na leitura.
- Paginação: ordenação `created_at DESC, user_id ASC`; cursor/offset (`page` × `limit`); tamanho máximo 50, padrão 20.
- Rate limit: chave por IP/ator via Durable Object existente, janela e cota iguais às dos endpoints de papel; 429 quando excedido.

---

## Critérios de aceite (ACs)

- [x] AC-01: Dado um operador com papel em `admin_user_roles`, quando `GET /api/admin/usuarios/papeis?page=1&limit=20` por `admin` autenticado em AAL2, então retorna 200 com o operador, e-mail vindo de `auth.users`, `assignedAt` e sem `isRoot`.
- [x] AC-02: Dado `env.adminUserId` configurado, quando a listagem é requisitada, então `root` vem preenchido com `isRoot: true`, `role: "admin"` e `assignedAt: null` (e-mail de `env.adminEmail`), destacado separadamente dos `operadores`.
- [x] AC-03: Dado `limit=100`, quando requisitado, então responde 400 (teto de 50 por página, sem ajuste silencioso).
- [x] AC-04: Dado `page` fora do intervalo (ex: 0 ou negativo), ou `page`/`limit` fracionários, quando requisitado, então responde 400.
- [x] AC-05: Dado requisitante sem papel `admin` ou sem AAL2, quando requisitado, então responde 403.
- [x] AC-06: Dado banco indisponível, quando requisitado, então responde 503 sanitizado, sem vazar SQL nem detalhes internos.
- [x] AC-07: Dado mais de 50 delegados, quando `page=2`, então a ordenação `created_at DESC, user_id ASC` é mantida e `totalPages` bate com `ceil(total/limit)`.
- [x] AC-08: Dado `page` além do último registro, quando requisitado, então `operadores` vem vazio e `total`/`totalPages` ainda retornam o total correto dos delegados.
- [x] AC-09: Dado o UUID da raiz também presente em `admin_user_roles`, quando a listagem é requisitada, então a raiz não aparece em `operadores` nem é contada no total de delegados.
- [x] AC-10: Dado dois delegados com `created_at` igual, quando listados, então o desempate usa `user_id` em ordem crescente.
- [x] AC-11: Dado chamada direta à RPC `list_admin_operadores` por `anon` ou `authenticated`, quando requisitado, então o banco recusa a execução (42501 / privilégio insuficiente).

---

## Plano de validação

| AC    | Como reproduzir                            | Resultado esperado                        | Evidência (arquivo)         | Teste (caminho)                                           |
| ----- | ------------------------------------------ | ----------------------------------------- | --------------------------- | --------------------------------------------------------- |
| AC-01 | `GET` com operador delegado + `admin` AAL2 | 200, e-mail de `auth.users`, `assignedAt` | `check/0036-*/results.json` | `__tests__/integration/admin-operadores-listagem.test.ts` |
| AC-02 | `GET` com `ADMIN_USER_ID` definido         | `root.isRoot === true`, separado          | idem                        | idem                                                      |
| AC-03 | `?limit=100`                               | ≤ 50 itens (ou 400)                       | idem                        | idem                                                      |
| AC-04 | `?page=0`                                  | 400                                       | idem                        | idem                                                      |
| AC-05 | `GET` com `editor` ou sem AAL2             | 403                                       | idem                        | idem                                                      |
| AC-06 | Banco fora / erro de RPC                   | 503 sanitizado                            | idem                        | idem                                                      |
| AC-07 | Mais de 50 delegados, `page=2`             | ordem preservada, `totalPages` correto    | idem                        | idem                                                      |
| AC-08 | `page` além do último registro             | `operadores` vazio, `total` correto       | idem                        | idem                                                      |
| AC-09 | Raiz também em `admin_user_roles`          | raiz excluída de `operadores` e do total  | idem                        | idem                                                      |
| AC-10 | Dois delegados com `created_at` igual      | desempate por `user_id` crescente         | idem                        | idem                                                      |
| AC-11 | Chamada à RPC por `anon`/`authenticated`   | recusa de execução (42501)                | idem                        | idem                                                      |

Testes pgTAP para a nova função `list_admin_operadores` (junção, ordenação, limite, contagem) em `supabase/tests/database/admin_rbac.test.sql` ou suíte dedicada.

---

## Decision Check (antes de passar para /develop)

- [ ] Todas as decisões têm fonte verificável (decisões do proprietário neste documento).
- [ ] Dados, contratos, autorização, erros e estados de UI estão decididos ou N/A justificado.
- [ ] ACs são observáveis e têm método de validação.
- [ ] Não restam placeholders relevantes.
- [ ] Aguarda aceite do proprietário (`Proposed` → `Accepted`) antes de `/develop`.
