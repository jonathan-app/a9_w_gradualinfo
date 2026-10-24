# Spec: Admin Dashboard – Usuários

**ID:** 0037
**Data:** 2026-10-21
**Status**: Accepted
**Fonte da decisão:** aceite explícito do proprietário na sessão de 2026-10-22 07:36 ("sim, sinal verde").

## Visão geral

Página protegida `/admin-dashboard/usuarios` acessível somente a usuários com papel `admin` e MFA nível AAL2. A página lista os operadores e permite conceder ou revogar papéis; **somente a conta raiz aparece sem controles de atribuição ou revogação**.

## Requisitos

- **Guarda da página (Server Component):** antes de qualquer consulta, a página chama `checkAdminUser()` (`lib/admin/auth.ts`), que aplica a admissão do Cloudflare Access (`guardAdminAccess`), identidade via `auth.getUser()`, papel e AAL2; com `auth.ok`, exige `roleSatisfies(auth.role, 'admin')` e chama `forbidden()` caso contrário. Os demais motivos seguem o padrão de `app/admin-dashboard/(protegido)/layout.tsx` (login, `mfa/setup`, `mfa/verify`, `forbidden()`). O layout protegido sozinho não basta, porque admite `editor` e `revisor`.
- **Guarda dos handlers:** `assertAdminApiAuth(request, 'admin')` continua protegendo `GET`/`POST`/`DELETE` em `/api/admin/usuarios/papeis*`; ele não é a guarda da página.
- **Raiz imutável:** a conta raiz (`root` no GET, `isRoot: true`) aparece destacada e sem controles de atribuição ou revogação; a API já recusa mutação nela com 409 `root_admin_immutable`.
- **Listagem paginada:** tabela de operadores (UUID, email, papel, data de atribuição) com paginação padrão **20** itens por página, máximo **50**, consumindo o endpoint existente `GET /api/admin/usuarios/papeis?page={n}&limit={m}`. O contrato é preservado: `{ root, operadores, meta: { page, limit, total, totalPages } }`, com `root` separado de `operadores`.
- **Formulário por UUID:** formulário independente que permite conceder ou revogar **um** papel a uma conta existente via UUID, mesmo que ainda não conste na listagem.
  - **Atribuir:** `POST /api/admin/usuarios/papeis` payload `{ "userId": "<uuid>", "role": "<papel>" }`, com seletor oferecendo `admin`, `editor` e `revisor` (a API valida e devolve 400 `invalid_role`; conta inexistente devolve 404).
  - **Revogar:** `DELETE /api/admin/usuarios/papeis/[userId]`. Revoga o papel administrativo inteiro, preservando a conta.
- **Confirmação:** diálogo modal com mensagem de sucesso/erro e botão de confirmação **antes** da mutação.
- **Prevenção de envio duplicado:** desabilitar botão após clique até receber resposta.
- **Fechamento:** modal pode ser fechado por tecla `Escape`.
- **Foco:** foco inicial no campo UUID; ao fechar, foco retorna ao controle que o abriu.
- **Estados UI:**
  - Carregamento (`spinner`);
  - Lista vazia (`Nenhum usuário encontrado`);
  - Erro na requisição (`Falha ao buscar usuários`);
  - Atualização automática após mutação (refetch).
- **Navegação:** substituir âncora `#secao-usuarios` por link interno que leva à página completa (`/admin-dashboard/usuarios`). Compatível com navegação por teclado (Tab/Enter).
- **Acessibilidade:** foco gestionado, rótulos aria, contraste conforme `DESIGN.md`.

## Requirements

- **usuarios/AC-1** Apenas usuários com papel `admin` e MFA AAL2, admitidos pelo Access, acessam a página; a guarda `checkAdminUser()` + `roleSatisfies(role, 'admin')` roda no servidor antes de qualquer consulta.
- **usuarios/AC-2** Paginação padrão 20 itens, limite máximo 50.
- **usuarios/AC-3** Listagem exibe UUID, email, papel único e data de atribuição.
- **usuarios/AC-4** Formulário aceita UUID arbitrário, permitindo atribuir papel a conta inexistente na listagem.
- **usuarios/AC-5** Revogação remove o papel administrativo inteiro, mantendo a conta.
- **usuarios/AC-6** Diálogo de confirmação aparece antes da mutação e impede envio duplicado.
- **usuarios/AC-7** Modal pode ser fechado por `Escape` sem disparar requisição.
- **usuarios/AC-8** Ao fechar modal, foco retorna ao elemento que o abriu.
- **usuarios/AC-9** Tratamento adequado de erros 400, 401, 403, 404, 409, 500 e 503 com mensagens claras.
- **usuarios/AC-10** Negar acesso a usuários `editor`, `revisor` ou MFA nível AAL1.

## Testes necessários

1. Permissões AAL2;
2. Navegação via teclado;
3. Diálogo de confirmação para atribuição/revogação;
4. Simulação de falhas de API (500/404) e exibição de mensagens de erro;
5. Estados de carga, vazio e atualização;
6. Cancelamento sem requisição;
7. Prevenção de envio duplicado.

## Integração

Reutiliza os contratos já existentes (`GET /api/admin/usuarios/papeis`, `POST /api/admin/usuarios/papeis`, `DELETE /api/admin/usuarios/papeis/[userId]`) sem criar novos endpoints.

## Design

Seguir tokens de cor e tipografia definidos em `DESIGN.md` (usar `brand-500` para destaques, garantir contraste AA, foco visível). Utilizar componentes UI existentes em `components/admin/` (tabela, modal, botão).

## Documentação

- Atualizar índice `docs/specs/2026-10-08-2228-INDICE.md` incluindo a nova spec.
- Referenciar `DESIGN.md` para estilos.
- Referenciar `lib/admin/AGENTS.md` para guardas de acesso.

_Sem commit, push ou deploy neste momento._
