# seo/AC-04: sitemap em índice com filho por editoria

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia (fonte: Supabase local).

## Como foi verificado

`curl` em `/sitemap.xml`, `/sitemap/geral.xml`, `/sitemap/mao-na-massa.xml` e `/sitemap/programacao.xml`, com corpos salvos e conferidos contra o banco local (18 posts, 15 publicados). Regras negativas e escaping também cobertos em unidade (nomes citados no fim).

## Índice (`/sitemap.xml`, status 200)

```xml
<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://localhost:3000/sitemap/geral.xml</loc></sitemap><sitemap><loc>http://localhost:3000/sitemap/mao-na-massa.xml</loc></sitemap><sitemap><loc>http://localhost:3000/sitemap/programacao.xml</loc></sitemap></sitemapindex>
```

Filho `geral` primeiro, um filho por editoria com ao menos um publicado ("Mão na Massa" e "Programação" são as únicas editorias com posts no banco local).

## Filho `geral` (`/sitemap/geral.xml`, status 200)

```xml
<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:3000</loc><lastmod>2026-10-17T14:26:10.301+00:00</lastmod></url></urlset>
```

Carrega a home; `lastmod` é o maior `published_at` entre os publicados (bate com `fixture-malicioso`/`fixture-sem-fontes`, `2026-10-17T14:26:10.301+00:00`).

## Filho de editoria (`/sitemap/mao-na-massa.xml`, status 200)

```xml
<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:3000/artigos/fixture-publicado</loc><lastmod>2026-10-16T14:09:01.556857+00:00</lastmod></url></urlset>
```

Apenas o publicado da editoria, com `lastmod` igual ao `published_at` do banco (`fixture-publicado`, `2026-10-16T14:09:01.556857+00:00`). O `fixture-agendado` (publicado com data futura) e o `fixture-arquivado` não aparecem.

## Filho de editoria (`/sitemap/programacao.xml`, status 200)

14 `<loc>`, exatamente os 14 publicados de "Programação": `fixture-malicioso`, `fixture-sem-fontes` e `fixture-ordenacao-0` a `fixture-ordenacao-11`, cada um com `lastmod` igual ao `published_at` correspondente no banco (conferido linha a linha).

## Conclusão

- Índice no formato sitemapindex listando `geral.xml` e um filho por editoria com publicado: presente.
- Cobertura exata: 1 (geral) + 1 (Mão na Massa) + 14 (Programação) = os 15 publicados do banco, cada URL uma vez; nenhum rascunho, agendado ou arquivado no índice ou nos filhos.
- Regras não observáveis em runtime local (provadas em unidade, `__tests__/unit/sitemap.test.ts`): "não gera filho para editoria sem artigo publicado", "resolve colisão de slug de editoria deterministicamente", "dobra a editoria chamada Geral no filho reservado", "escapa os caracteres reservados de XML", "escapa o loc e preserva o lastmod no urlset". No banco local toda editoria com post tem ao menos um publicado, então a regra negativa não tem caso runtime.
- Unicidade e cobertura também provadas em e2e (`e2e/seo-audit.spec.ts`, "sitemap em índice cobre os publicados e ignora os não públicos").
