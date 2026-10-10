# Distinção de falhas de preview, spec 0006

Data: 2026-10-09. Alterações locais sobre HEAD `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, árvore com mudanças preexistentes preservadas.

## Correção

`verifyPreviewSession()` lança `PreviewStoreUnavailableError` quando a autorização retorna 503. Grant do contrato atual inválido, expirado ou revogado não recupera autorização pelo fallback legado.

O proxy consulta primeiro a visibilidade pública. Para conteúdo não público, verifica preview. Uma falha do DO recebe resposta HTML direta com status 503, mensagem de indisponibilidade, `private, no-store` e `noindex, nofollow`, antes do streaming. Cookies renovados são preservados. A página pública e seus metadados consultam o artigo público antes de avaliar preview, evitando depender do DO mesmo quando o navegador envia seu cookie.

## Evidência executada nesta rodada

Comandos executados diretamente com Node, pois as chamadas via pnpm não produziram resultado nesta sessão:

| Verificação                                                                                                                                                                                                                    | Resultado                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `node node_modules/vitest/vitest.mjs run __tests__/unit/preview-failure-status.test.ts __tests__/unit/preview-durable-object.test.ts __tests__/unit/lib/services/posts.test.ts __tests__/unit/preview-auth-accessible.test.ts` | 37/37 PASS, 4 arquivos                                                                                                                      |
| `node node_modules/typescript/bin/tsc --noEmit`                                                                                                                                                                                | exit 0                                                                                                                                      |
| ESLint nos três arquivos de aplicação e na nova regressão                                                                                                                                                                      | exit 0                                                                                                                                      |
| Prettier nos três arquivos de aplicação e na nova regressão                                                                                                                                                                    | PASS                                                                                                                                        |
| Suíte Vitest completa                                                                                                                                                                                                          | 189 PASS, 18 bloqueados por `spawnSync git EPERM` no arquivo gates.test.ts; reexecução ampliada solicitada, sem resultado até este registro |

A nova regressão cobre sessão inválida, expirada e revogada retornando 404, cookie inválido sem consulta ao DO, falha de I/O preservando 503 na autorização e no objeto Response do proxy, mensagem de indisponibilidade e cache privado, bloqueio do serviço antes de consulta privada e artigo público sem chamada ao DO. O teste legado preexistente recebeu uma alteração de fixture para usar chaves distintas para contratos legado e DO.

Esses testes exercitam mocks e objetos Response em processo. Não comprovam status recebido pela rede, DOM renderizado no navegador, execução real de GROQ nem armazenamento persistente conectado.

## Validação contra build

| Item exigido                                           | Estado nesta rodada                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Status HTTP recebido com falha editorial induzida      | MEDIDO como HTTP 200 (soft), ver Falha induzida abaixo                                                  |
| Status HTTP recebido com DO indisponível, esperado 503 | UNVERIFIABLE no build local (sem binding DO; ver Falha do DO abaixo)                                    |
| Interface exibida no navegador                         | MEDIDA: Página não encontrada (`app/not-found.tsx`), não `app/error.tsx`                                |
| Ausência de rascunho no HTML, RSC, metadados e DOM     | MEDIDA: ausente (0 ocorrências de conteúdo protegido)                                                   |
| Artigo público HTTP 200 com DO indisponível            | UNVERIFIABLE (Content Lake sem conteúdo público, countPosts=0; exige assinatura do DO ligada no Worker) |

A tentativa anterior de iniciar `next start` foi bloqueada por `listen EPERM`. Um objeto Response com status 503 no teste unitário não é prova de HTTP 503 na rede. A spec não foi concluída nem aprovada.

## Falha induzida medida contra o build (2026-10-09)

Execução de `node scripts/e2e-server.mjs` (TLS na 3100, `next start` na 3101, certs locais) com `SANITY_DATASET` apontado para dataset inexistente — override de processo, sem componentes de código e sem segredos. Todo caminho Sanity recebia HTTP 404 real do Content Lake.

| Cenário medido                                | Wire (curl `-w`/`-D`)                        | Corpo                 |
| --------------------------------------------- | -------------------------------------------- | --------------------- |
| `/artigos/slug-inexistente-*`                 | HTTP 200, `cache-control: private, no-store` | Página não encontrada |
| `/artigos/drafts-artigo-rascunho-sem-preview` | HTTP 200, no-store                           | Página não encontrada |
| `/` (home, lista Sanity)                      | HTTP 200                                     | Página não encontrada |

- O erro do Sanity **realmente aconteceu no servidor** (log: `Falha na consulta ao Sanity (HTTP 404)`, com `digest`, em `generateMetadata` e no render da página).
- **Conclusão: soft 200 confirmado.** O erro de infraestrutura não produz HTTP 500/503 na rede e não aciona `app/error.tsx`; o Next 16 entrega HTTP 200 com a UI de `app/not-found.tsx`. A ressalva da revisão estava correta: exceção propagada até a fronteira de erro não é prova de status na rede, e aqui a falha é mascarada como página inexistente.
- Controle de cache `private, no-store` foi preservado mesmo na resposta de erro.
- Ausência de conteúdo protegido: grep por marcadores de rascunho no HTML foi zero nos cenários acima (UI de 404 não vaza corpo editorial).

## Falha do DO indisponível (503, porém da spec 0006)

`getPreviewSessionStore()` (`lib/preview/durable-object.ts:214`) só usa o binding `PREVIEW_SESSION_DO` quando `@opennextjs/cloudflare` entrega `getCloudflareContext()`; em `next start` puro o fallback é o `InMemoryPreviewSessionStore`, que nunca falha fora de `simulateFailure`. Não há alavanca de ambiente para induzir DO indisponível contra o build local. A resposta 503 existe no código (`verifyDurableObjectPreviewSession` catch, `app/api/preview/*`), coberta por teste unitário (`preview-failure-status.test.ts`), mas a prova de HTTP 503 no fio exige o Worker publicado com o binding de fato — que é uma validação conectada separada, ainda pendente e sem autorização de deploy. Não foi alterado código de produção para criar alavanca de teste.

A correção local (sessão inválida/expirada/revogada → 404, DO indisponível → 503, público sem consultar o DO) permanece coberta por teste unitário (37/37). O caminho de falha editorial mapeado nesta rodada é **distinto**: quando o Sanity lança, a exceção cai no render da página e vira soft 200 com a UI de 404 — o mesh de infraestrutura do `app/error.tsx` não entra nesse caminho no Next 16. O critério de aceite da spec 0006 ("erro explícito de 500/503 sem mascarar indisponibilidade como 404 ou conteúdo vazio") não é satisfeito na rede neste cenário.

Próximo passo: `/check verify` deve gerar um build atualizado, induzir falha editorial e falha no binding DO, e registrar separadamente resposta HTTP, interface e ausência de conteúdo protegido. Cobrir cookie inválido, expirado e revogado (404) e público com DO falhando (200). Validar GROQ e DO conectados separadamente quando houver runtime disponível. A falha editorial medida (Sanity lança no render) precisa voltar ao escopo: que resposta HTTP a spec 0006 exige quando o Content Lake está indisponível.

Resultados anteriores de 4/4 E2E e 175/175 unitários permanecem relatos históricos, não reexecutados nesta rodada. PR #24 permanece em rascunho. Sem commit, merge ou deploy.
