# lib/preview — sessões de preview editorial

## Overview

Preview de rascunho e agendado usa um grant assinado (cookie) mais um
Durable Object na Cloudflare para revogação imediata. A camada de serviços lê o
cookie e pergunta ao DO se a sessão ainda vale. Sem o DO publicado, criação e
logout de preview falham com 503.

## Key files

| File                | Owns                                                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| `session.ts`        | Cookie `gradualinfo-preview`, HMAC, TTL 30 min, schema v1                       |
| `auth.ts`           | Verificação do grant + consulta ao repositório de sessão                        |
| `durable-object.ts` | `PreviewSessionDO`: create, validate, revoke; fallback em memória só para teste |
| `config.ts`         | Leitura tipada de segredos/bindings de preview                                  |

## Conventions

- Cookie é `payload.assinatura` em base64url; verificação em tempo constante;
  falha sempre com `null`, sem throw no meio do request.
- `version !== 1` rejeita o grant; mudança de formato exige nova versão.
- Revogação imediata exige o Durable Object (não KV): consistência forte.
- Segredos `PREVIEW_SECRET` e `PREVIEW_SIGNING_KEY` são Worker Secrets, não
  valores no bundle.

## Gotchas

- Binding e migration do `PreviewSessionDO` ausentes: rotas de preview/logout
  respondem 503. Conferir `wrangler migrations list` e deploy.
- Server Components não são o lugar certo para emitir cookie; emissão fica nas
  rotas de API/login de preview.
- Fallback em memória do DO é só local/teste; não use como modelo de produção.

## Related specs

- `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md` (preview no
  fluxo editorial)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
