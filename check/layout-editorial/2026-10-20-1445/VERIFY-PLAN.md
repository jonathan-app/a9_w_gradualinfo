# Plano de verificação do layout editorial

**Estado:** Not run
**Spec vigente:** `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`, Revisão 3

Este plano não é evidência de execução.

1. `layout-editorial/AC-01`: preparar 60 artigos publicados e confirmar uma consulta, topo sem repetição interna, grade recente com no máximo 16 artigos e no máximo 25 instâncias de card.
2. `layout-editorial/AC-02`: comparar cada variante com os campos distintos das fixtures. Capa usa imagem, editoria, título, resumo, autor e data. Destaques usam imagem, editoria, título, autor e data. Últimas leituras usam editoria, título, resumo, autor e data. Recentes usam imagem, editoria, título, autor e data.
3. `md-0002/AC-06`: inspecionar a rota do artigo e todos os componentes editoriais. Confirmar ausência de `dangerouslySetInnerHTML` e permitir somente o componente JSON-LD com `serializeJsonLd`. Executar também a fixture maliciosa no navegador.
4. `md-0002/AC-10`: comparar canonical com a origem configurada e cada `lastmod` do sitemap com `published_at` da mesma fixture.
5. `md-0002/AC-13`: confirmar cabeçalho com autoria antes da capa, corpo Markdown antes das fontes, dados e URL absoluta da fonte, isolamento do Markdown e ausência da seção quando a lista estiver vazia.

O resultado continua `UNVERIFIABLE` enquanto o Playwright real não produzir artefato na mesma revisão.
