# lib/editorial: leitura e catálogo editorial local

## Overview

Esta área prepara o catálogo de rascunhos para a prévia local e calcula dados de leitura dos artigos. O catálogo local é uma exceção para desenvolvimento. A seleção da fonte pública ocorre em `lib/services/posts.ts`.

## Key files

| File                                  | Owns                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `local-mode.ts`                       | Reconhece loopback e os caminhos públicos aceitos para a prévia local. |
| `local-posts.ts` e `local-posts.json` | Carregam o catálogo local e o adaptam ao tipo `Post`.                  |
| `reading.ts`                          | Calcula tempo de leitura, IDs do sumário e artigos relacionados.       |

## Conventions

- `getLocalPosts` retorna conteúdo apenas com `env.editorialLocal` ativo (`NODE_ENV=development && EDITORIAL_LOCAL=1`). Os registros continuam com status `rascunho` e sem data de publicação; nunca atua como fallback silencioso em produção caso o Sanity falhe.
- A leitura de `local-posts.json` em disco permite atualizar a prévia local. A importação estática serve como reserva se a leitura falhar.
- Os IDs dos títulos devem ser únicos na página e nascer da mesma árvore Markdown que renderiza o corpo.
- Artigos relacionados priorizam a mesma editoria, preservam a ordem original e não repetem slugs.

## Gotchas

- `proxy.ts` decide o 404 do catálogo local antes do streaming para rotas de artigo em `localhost`. Mudanças na visibilidade local precisam considerar esse caminho e `lib/services/posts.ts` juntos.
- O catálogo local não publica nem modifica documentos no Sanity.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
