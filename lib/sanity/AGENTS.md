# lib/sanity — leitura editorial no Content Lake

## Overview

Cliente GROQ server side para o Sanity. Quando `env.sanity` tem `projectId` e
`dataset`, `lib/services/posts.ts` usa este cliente como fonte primária de
posts. Sem essa config, o serviço cai no Supabase. Tokens ficam no servidor;
nunca no bundle do cliente. O `proxy.ts` faz probe de disponibilidade.

## Key files

| File        | Owns                                                                  |
| ----------- | --------------------------------------------------------------------- |
| `client.ts` | GROQ público vs preview, mapeamento para o tipo `Post`, erros tipados |

## Conventions

- Só Server Components e Route Handlers; Client Component não carrega token.
- Documento Sanity é normalizado para a interface `Post` do app (campos camel e
  snake convivem no mapeamento).
- Indisponibilidade do dataset vira `ContentUnavailableError` (home 503 com
  `noindex`, conforme spec 0006).
- Arquitetura alvo: Sanity como fonte editorial única após migração autorizada;
  Supabase fica auth e app. Até lá o dual path em `lib/services/posts.ts` é
  real.

## Gotchas

- Dataset `production` vazio: home e artigo ficam vazios ou 404; AC-02 da spec
  0006 exige conteúdo publicado de verdade.
- Probe no proxy e leitura no serviço podem divergir se env de build e de
  Worker não forem os mesmos.
- Com `EDITORIAL_LOCAL=1` (modo de desenvolvimento), o catálogo local responde
  antes do Sanity; a ordem efetiva das fontes está em `lib/services/posts.ts`.

## Related specs

- `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
- `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
