# seo/AC-05: degradação com o Sanity indisponível

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: mesmo build de produção, segundo servidor `next start --port 3101` com `SANITY_PROJECT_ID=check-verify-invalid-0023` e `SANITY_DATASET=production` (Sanity configurado e indisponível, projeto dummy inexistente).

## Como foi verificado

`curl` contra o servidor em `localhost:3101`. Este é o cenário que a auditoria de 11:34 registrou como não observado em runtime; o run fecha essa lacuna.

## Resultados brutos

| Rota | Status | Observação |
| --- | --- | --- |
| `/sitemap.xml` | 200 | corpo abaixo, listando **apenas** `geral.xml` |
| `/sitemap/geral.xml` | 200 | corpo abaixo, contendo a home |
| `/sitemap/mao-na-massa.xml` | 503 | header `retry-after: 3600` |
| `/busca?q=teclado` | 200 | mantém o aviso existente (trecho abaixo) |
| `/` | 503 | sonda do `proxy.ts` (spec 0006): "Serviço temporariamente indisponível"; comportamento conhecido, fora do escopo deste AC |

Índice degradado (200, nunca 500):

```xml
<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://localhost:3000/sitemap/geral.xml</loc></sitemap></sitemapindex>
```

Filho geral (200, com a home):

```xml
<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:3000</loc></url></urlset>
```

Aviso da busca (presente no HTML de `/busca?q=teclado`):

```text
A pesquisa está indisponível agora. Tente novamente em instantes.
```

## Conclusão

- Com o Sanity indisponível, `/sitemap.xml` responde 200 listando apenas `/sitemap/geral.xml`, que contém a home; nunca 500: observado.
- A busca mantém o aviso de indisponibilidade existente: observado.
- O filho de editoria degrada de forma explícita (503 + `retry-after`), sem substituição silenciosa; a unidade cobre o mesmo caminho com `ContentUnavailableError` ("degrada para o filho geral sob ContentUnavailableError" e "devolve 503 para editoria indisponível, mas mantém o filho geral" em `__tests__/unit/sitemap.test.ts`).
