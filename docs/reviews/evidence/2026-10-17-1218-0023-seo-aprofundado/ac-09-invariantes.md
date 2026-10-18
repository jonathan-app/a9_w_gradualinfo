# seo/AC-09: invariantes preservadas

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia.

## 1. Rascunho nunca aparece em sitemap nem em JSON-LD

Os três fixtures não públicos existem no banco local (vistos via service role, 18 posts no total):

```text
fixture-agendado | publicado | 2126-10-17T14:09:01.556857+00:00 | Mão na Massa
fixture-arquivado | arquivado | 2026-10-16T14:09:01.556857+00:00 | Mão na Massa
fixture-rascunho | rascunho | sem data | Mão na Massa
```

Ainda assim:

- Nenhum dos três aparece no HTML da home (`mentions fixture-rascunho: false`, idem agendado e arquivado).
- Nenhum aparece no índice do sitemap nem nos filhos (detalhe em `ac-04-sitemap-indice-filhos.md`).
- Cada um responde 404 com `robots: noindex` e **zero** blocos JSON-LD: `/artigos/fixture-rascunho`, `/artigos/fixture-agendado` (publicado com data futura) e `/artigos/fixture-arquivado`.

## 2. URLs absolutas saem sempre de SITE_ORIGIN

Todas as URLs absolutas observadas começam com `http://localhost:3000` (o `SITE_ORIGIN` do build): `url`, `mainEntityOfPage`, `logo`, `image`, `item` do breadcrumb, `urlTemplate` do SearchAction e os `<loc>` do sitemap. Nenhuma URL relativa escapou para os documentos.

## 3. Nenhuma variável de ambiente nova e nenhuma dependência nova

- `lib/site-config.ts` consome apenas variáveis existentes de `lib/env.ts` (`env.siteUrl` para `SITE_ORIGIN` e `env.googleSiteVerification`); nenhum nome de variável novo entra no arquivo.
- A árvore carrega mudanças não commitadas de sessões concorrentes em `package.json`, `.env.example` e `pnpm-lock.yaml` (ex.: scripts `check:targets`, `dev:editorial`; limpeza de comentários do Sanity). Nenhuma delas adiciona biblioteca de sitemap/SEO/JSON-LD nem variável nova: o diff de `.env.example` mexe apenas em `NEXT_PUBLIC_SITE_URL` e comentários, mantendo o mesmo conjunto de nomes, e o diff de `package.json` não contém dependência relacionada a esta feature.
- Os arquivos da feature (listados no relatório da auditoria e no build plan da spec) não incluem `package.json`, lockfile nem `.env.example`.

## Conclusão

As três invariantes foram observadas com evidência bruta neste run. A ressalva de atribuição está registrada como WARNING no `results.json`: a revisão avaliada é a árvore de trabalho com trabalho concorrente, ancorada por um commit efêmero.
