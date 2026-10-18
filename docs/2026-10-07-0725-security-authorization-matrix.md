# Matriz de autorização

> Papéis, claims e permissões no MVP. Este documento é a fonte de verdade
> para autorização; o código deve refletir estas regras.

## Papéis

| Papel           | Origem                      | Escopo                                                                        |
| --------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `anon`          | Sem sessão                  | Leitura pública de posts publicados + perfil público                          |
| `authenticated` | Sessão Supabase válida      | Igual a `anon`, mais acesso a conteúdo preview via `app_metadata.preview`     |
| `preview`       | `app_metadata.preview=true` | Leitura de todos os posts (inclui rascunho/agendado/arquivado)                |
| `service_role`  | Server-only (nunca cliente) | Leitura/escrita completa; usado apenas em Server Components e routes de admin |
| `editor`        | Futuro                      | CRUD de posts; ainda não implementado                                         |

## Claims usadas

| Claim                        | Local   | Uso                                                    |
| ---------------------------- | ------- | ------------------------------------------------------ |
| `app_metadata.preview`       | Boolean | Habilita leitura de rascunhos via RLS                  |
| `user_metadata.display_name` | Text    | Nome de exibição no perfil público                     |
| `email`                      | String  | Login e comunicação; nunca exposto em resposta pública |

## Regras

- `anon` e `authenticated` sem `preview=true` **não** veem rascunhos.
- `preview` vê rascunhos, mas **não** pode alterar nada (apenas leitura).
- `service_role` não é emitido para clientes; apenas server-side.
- Qualquer nova role exige revisão de segurança e atualização desta matriz.
