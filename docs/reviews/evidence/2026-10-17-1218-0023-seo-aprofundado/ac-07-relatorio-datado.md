# seo/AC-07: relatório datado da auditoria

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Spec: `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md`

## Como foi verificado

Leitura do relatório produzido na entrega e conferência do conteúdo contra o contrato do AC.

## Artefato

- Arquivo: `docs/reviews/2026-10-17-1134-0023-seo-aprofundado-auditoria.md`
- sha256: `0a81c8b4ba871453f175b16077b2cb865218ca0d7640f805673f1f57ce29c374`
- Título: "Auditoria de SEO e dados estruturados (spec 0023)"

## Conteúdo conferido

- "Método e ambiente": comandos, URLs, versões e limitações do ponto de medida.
- "Capturas do Lighthouse (mediana de 3 execuções por URL)": tabela com as **três** URLs (home, artigo e `/busca`) e as métricas do orçamento, mais o achado de gate do piso de SEO da `/busca`.
- "Dados estruturados validados em browser real": os quatro tipos (WebSite, Organization, Article, BreadcrumbList), robots.txt e sitemap, todos com os valores observados.
- "O que não foi observado": lista explícita com deploy/CI, o caminho TLS do worker e2e, o cenário runtime do seo/AC-05 (fechado por este run, ver `ac-05-degradacao-sanity.md`), leitura direta dos rascunhos sob RLS, variância de runner e INP de campo.

## Conclusão

O relatório datado existe, registra cada verificação com as capturas do Lighthouse das três URLs e dos dados estruturados, e inclui explicitamente o que não foi observado. A única lacuna então registrada que era observável localmente (seo/AC-05 em runtime) foi fechada neste run de verificação.
