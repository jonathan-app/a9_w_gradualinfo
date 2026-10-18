# Plano de verificação

Estado: Executado em 2026-10-17 (run `2026-10-17-1218-0023-seo-aprofundado`),
veredito APROVADO no `results.json` deste diretório (9 ACs PASS, 0 BLOCKER,
3 WARNING), evidências com SHA-256 em
`docs/reviews/evidence/2026-10-17-1218-0023-seo-aprofundado/` e relatório em
`docs/reviews/2026-10-17-1240-0023-seo-aprofundado-verificacao.md`. Contrato:
`docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md` (Accepted).
Execução do build registrada em
`docs/reviews/2026-10-17-1134-0023-seo-aprofundado-auditoria.md`.

- seo/AC-01: rodar `pnpm dlx @lhci/cli@0.15.1 autorun --config=lighthouserc.cjs`
  contra build de produção com as fixtures provisionadas
  (`scripts/ci-fixtures.mjs`). Esperado: exit 0, com home, artigo e `/busca`
  dentro do orçamento por métrica; observar as medianas das 3 URLs. Atenção: o
  piso de `categories:seo` vale para páginas indexáveis (home e artigo); `/busca`
  é noindex por AC-06 e o Lighthouse reprova `is-crawlable` de propósito (ver
  relatório, seção do gate).
- seo/AC-02: na home, observar WebSite com SearchAction
  (`/busca?q={search_term_string}`), `inLanguage` pt-BR, e Organization com
  `name` "Gradualinfo", `logo` absoluto (`/icon.png`) e `description`.
- seo/AC-03: no artigo publicado, observar Article com `publisher`, `url`,
  `mainEntityOfPage`, `image` 1200x630 e BreadcrumbList de dois itens
  ("Início" e o artigo), todos parseáveis.
- seo/AC-04: observar `/sitemap.xml` como índice e um filho por editoria com
  publicado (`geral.xml` para home e artigos sem editoria); `lastmod` do
  artigo igual ao `published_at`; XML escapado.
- seo/AC-05: com Sanity configurado e fora do ar, observar 200 no índice e em
  `geral.xml` (só home) e 503 com `retry-after` no filho de editoria; sem
  substituição silenciosa pelo catálogo local. (No run local a fonte era o
  Supabase, com Sanity desligado por env; exercitar a indisponibilidade real.)
- seo/AC-06: rodar o teste automatizado no `pnpm check:all` e observar a
  cobertura: canonical e robots coerentes em home, artigo e 404; `/busca` com
  noindex follow e sem canonical; preview, painel e APIs fora do índice;
  sitemap cobrindo exatamente os publicados.
- seo/AC-07: conferir o relatório datado em `docs/reviews/` com as capturas
  do Lighthouse (3 URLs) e dos dados estruturados, incluindo a lista do que
  não foi observado.
- seo/AC-08: observar `/busca` e painel sem sufixo duplicado da marca, home
  com metadados no layout e "Gradualinfo" como grafia canônica em todos os
  metadados.
- seo/AC-09: com post não publicado (rascunho, agendado, arquivado) e slug
  inexistente, observar 404 e nenhuma emissão de JSON-LD; rascunho fora do
  sitemap. Fixtures `fixture-rascunho`, `fixture-agendado` e `fixture-arquivado`
  existem no seed local; a leitura anônima depende de RLS para escondê-los.
- Regressão: `pnpm check:all` verde e specs `e2e/seo-audit.spec.ts` e
  `e2e/verify-md0002-tarefa5.spec.ts` verdes contra servidor de produção.

O plano não é evidência de execução ou aceite de entrega.
