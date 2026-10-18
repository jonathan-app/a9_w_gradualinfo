# lib/seo: dados estruturados e sitemap

## Overview

Construtores de JSON-LD (Organization, WebSite com SearchAction, Article e
BreadcrumbList) e o sitemap em índice (`/sitemap.xml` com `geral.xml` e um
filho por editoria). Os valores saem de `lib/site-config.ts` (`SITE_ORIGIN`) e
da leitura de publicados em `lib/services/posts.ts`; nada aqui lê o banco
direto.

## Key files

| File                 | Owns                                                       |
| -------------------- | ---------------------------------------------------------- |
| `structured-data.ts` | Blocos JSON-LD e a resolução de URL absoluta               |
| `sitemap.ts`         | Índice, filhos por editoria, agrupamento e escaping de XML |

Rotas: `app/sitemap.xml/route.ts` (índice) e `app/sitemap/[editoria]/route.ts`
(filho). A renderização dos blocos fica em `components/shared/json-ld.tsx`.

## Conventions

- Todo bloco JSON-LD passa por `serializeJsonLd` (componente `JsonLd`); nenhum
  caminho novo de `innerHTML` para script.
- URL absoluta sempre do `SITE_ORIGIN`; rascunho e não publicado nunca emitem
  JSON-LD nem entram no sitemap.
- `lastmod` de artigo é o `published_at`; o filho `geral.xml` carrega a home.
- Editoria sem artigo publicado não gera filho; colisão de slug resolve por
  sufixo determinístico.

## Gotchas

- Sanity indisponível degrada: índice 200 só com `geral.xml` e filho de
  editoria em 503 com `retry-after`, nunca 500.
- O piso `categories:seo` do `lighthouserc.cjs` vale só para páginas
  indexáveis (`assertMatrix`); `/busca` é noindex de propósito (seo/AC-06).
- A leitura limita a 1000 posts e não há paginação no sitemap.

## Related specs

- `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md`
- `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`

_Drafted by /sync from the introducing change, worth a quick human pass._
