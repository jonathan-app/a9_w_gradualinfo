# 0006 · Transição editorial para Sanity · registro de testes

Data: 2026-10-09 20:10 (America/Sao_Paulo). Escopo desta rodada: apenas os dois arquivos que a correção da AC-06 tocou, `lib/preview/auth.ts` e `lib/supabase/middleware.ts`.

## Identidade da versão testada

| Item           | Valor                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| Branch         | `feat/transicao-editorial-sanity`                                                        |
| HEAD           | `ed00c4b` (247 caminhos não commitados na árvore)                                        |
| Node           | v22.23.1                                                                                 |
| Vitest         | 5.0.3                                                                                    |
| Next           | 16.4.0                                                                                   |
| Governing spec | `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md` (`**Status**: Accepted`) |

## Gate de segurança prévio

O registro anterior em `workflow/STATE.md` cobria o HEAD commitado, e a árvore mudou desde então. Os dois scans do projeto foram reexecutados sobre a árvore atual antes de escrever qualquer teste:

| Comando                 | Exit | Resultado                                          |
| ----------------------- | ---- | -------------------------------------------------- |
| `pnpm security:sast`    | 0    | Semgrep: 0 findings ERROR                          |
| `pnpm security:secrets` | 0    | Gitleaks: 0 findings redigidos, histórico e árvore |

Nenhum achado Critical ou High aberto. Entrada no `/test` liberada.

## Execução

| Comando                                     | Exit | Resultado                          |
| ------------------------------------------- | ---- | ---------------------------------- |
| `pnpm test:run`                             | 0    | 326/326 testes PASS em 34 arquivos |
| Foco nos dois arquivos da rodada            | 0    | 22/22 PASS                         |
| `npx prettier --check` nos arquivos tocados | 0    | PASS                               |

Antes desta rodada a suíte tinha 320 testes. Os 6 novos estão listados abaixo.

## Cobertura por AC

| AC           | O que a AC exige                                                    | Estado nesta rodada                                   | Onde                                                                                                                                  |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| sanity/AC-05 | DO consultado a cada autorização, sem cache intermediário           | Automatizado                                          | `preview-failure-status.test.ts`: duas requisições consecutivas ao proxy, `validateSession` chamado duas vezes                        |
| sanity/AC-05 | Sessão inválida, expirada ou revogada + artigo não público → 404    | Automatizado (já existia)                             | `preview-failure-status.test.ts`: `it.each` de três motivos                                                                           |
| sanity/AC-05 | DO indisponível → 503 sem entregar rascunho                         | Automatizado (já existia)                             | `preview-failure-status.test.ts`                                                                                                      |
| sanity/AC-05 | Artigo público acessível sem exigir preview nem o estado do DO      | Automatizado                                          | `preview-failure-status.test.ts`: `evaluateArticleAccess({ isPublicArticle: true })` e o caso de proxy, `validateSession` não chamado |
| sanity/AC-05 | Rascunho visível em sessão de preview                               | Automatizado                                          | `preview-auth-accessible.test.ts`: consulta Sanity com `{ isPreview: true }`                                                          |
| sanity/AC-06 | `Cache-Control: no-store`, com `private, no-store` no preview       | Automatizado                                          | Artigo público bloqueado e rascunho bloqueado respondem `private, no-store`                                                           |
| sanity/AC-06 | Slug inexistente → 404 real                                         | Automatizado no proxy; no fio já medido em 2026-10-09 | Rewrite 404 com `private, no-store`; prova de rede em `workflow/STATE.md`, linha 155                                                  |
| sanity/AC-06 | Indisponibilidade de infraestrutura → 503/500 sem mascarar como 404 | Automatizado nas duas pernas                          | Leitura pública falhando e perna de preview falhando, ambas 503 com `private, no-store` e corpo sem conteúdo editorial                |

## Não coberto, e por quê

- **sanity/AC-06 na home `/`**: sob falha do Sanity a home ainda responde HTTP 200 com a UI de 404. Não é lacuna de teste, é decisão de design ainda não registrada (bastão editorial marcado BLOCKED em `workflow/STATE.md`).
- **Reutilização da cópia do cookie pós logout (sanity/AC-05, passos 1 a 5)**: exige `/api/preview`, `/api/preview/logout` e um Durable Object conectado. A semântica de sessão revogada está coberta em unidade (404), a prova ponta a ponta fica para `/check verify` com runtime publicado.
- **503 no fio do Durable Object**: não há alavanca de ambiente para induzir DO indisponível contra `next start` local (o fallback é `InMemoryPreviewSessionStore`). Prova exige Worker publicado com o binding.
- **Proxy exercitado só com Sanity ativo**: o caminho de fallback Supabase dentro de `isArticleAccessible` está coberto em unidade (`preview-auth-accessible.test.ts`); o proxy recebe o mesmo tipo de erro dos dois casos.
- **Erros inesperados no proxy**: as duas rotas de falha públicas normalizam em `ContentUnavailableError` ou `PreviewStoreUnavailableError`, então o ramo de rethrow do proxy não é alcançável pela interface pública sem mockar internos.

## Arquivos de teste

| Arquivo                                          | Testes     | Mudança   |
| ------------------------------------------------ | ---------- | --------- |
| `__tests__/unit/preview-failure-status.test.ts`  | 12 (era 7) | estendido |
| `__tests__/unit/preview-auth-accessible.test.ts` | 10 (era 9) | estendido |

`test-preferences.json` foi normalizado para o esquema da skill (`tool`, `testDir`, `filePattern`, `packageManager`) preservando `a11y`, `componentTesting` e os limites de cobertura de 60%.

Nenhum arquivo de aplicação foi alterado nesta rodada.
