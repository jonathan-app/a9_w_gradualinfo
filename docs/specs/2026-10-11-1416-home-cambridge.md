# Home Cambridge — GradualInfo

Estado: implementado; validação de runtime e aprovação visual pendentes.
Autorização: pedido explícito de composição Cambridge apenas na home.

- AC-01: Um hero com capa prioritária, título, lead, autor e data real.
- AC-02: Até dois destaques com capas e até quatro últimas leituras, sem repetir o hero no topo. Com poucos posts, colunas vazias são omitidas.
- AC-03: Uma seção por editoria presente nos dados; até quatro cards iniciais, expansão nativa “Ver todos” se houver mais. Não exige quatro posts onde só há um.
- AC-04: Navegação local por âncoras para todas as seções existentes. Nenhuma rota de editoria, busca ou newsletter fictícia.
- AC-05: Todos os links de card levam a `/artigos/[slug]`; apenas hero contém lead.
- AC-06: Layout de uma coluna no celular, duas no tablet e três no desktop, sem largura fixa em cards.
- AC-07: Tokens e dark mode herdados. CSS Module exclusivo da home; globals.css, header, layout e artigo preservados byte a byte.
- AC-08: Consome getPublishedPosts, com limite explícito de 60. A lista pública mantém seus filtros; os seis rascunhos só aparecem em dev:editorial. “Ver todos” expande somente o conjunto carregado, não o catálogo completo.
- AC-09: Rascunhos mostram “Rascunho · prévia local”, nunca data de publicação inventada.
- AC-10: Estados vazio e indisponível, canonical, renderização dinâmica e tratamento de erros mantidos.

As cinco editorias do catálogo local são usadas sem renomeação. As editorias do scope não são convertidas em novas categorias por esta mudança; o catálogo/CMS continua sendo a fonte das etiquetas exibidas.

/check: desktop 1280, tablet 768, mobile 390 e 320; claro/escuro; Tab e âncoras; expansão com mais de quatro posts; zero, um e seis posts; erro de fonte; comparar artigo diagnosticar-erro-500-503-site antes/depois.
