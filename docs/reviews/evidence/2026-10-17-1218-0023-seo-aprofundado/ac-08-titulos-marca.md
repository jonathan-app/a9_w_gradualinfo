# seo/AC-08: títulos sem sufixo duplicado e grafia canônica

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia.

## Como foi verificado

`<title>` de cada rota no HTML servido, mais a busca pelo padrão de duplicação `Gradualinfo | Gradualinfo` nos HTMLs salvos.

## Títulos observados

| Rota | `<title>` |
| --- | --- |
| `/` | `Gradualinfo` |
| `/artigos/fixture-publicado` | `Fixture publicado \| Gradualinfo` |
| `/artigos/nao-existe-abc` (404) | `Gradualinfo` |
| `/busca` | `Pesquisa de artigos \| Gradualinfo` |

O padrão `Gradualinfo | Gradualinfo` aparece 0 vezes na home, no artigo, na busca e no 404: o template do layout monta o título uma vez, com o sufixo de `SITE_NAME`.

A grafia "Gradualinfo" também é a canônica nos metadados estruturados (ac-02) e coberta em unidade por "layout publica a grafia canônica no título, na descrição e no Open Graph" (`__tests__/unit/seo-metadata.test.ts`).

## Limitação observada (documentada)

- O painel autenticado não foi observado em runtime local: `/admin-dashboard/login` respondeu 503 ("Acesso restrito") porque a configuração do Cloudflare Access não existe no ambiente local, limitação já documentada em `AGENTS.md`. A cobertura do painel é a de unidade ("painel administrativo e preview ficam fora do índice, sem sufixo duplicado"), mais o template compartilhado provado em runtime nas outras quatro rotas. O cenário autenticado pertence à suíte admin (`e2e/`), que exige o stack de Access em seu próprio job.
