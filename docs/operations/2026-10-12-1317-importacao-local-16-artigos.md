# Importação local dos 16 artigos

**Origem:** `/home/jonathan/Área de trabalho/gradualinfo-16-artigos.md`, fornecido pelo proprietário.
**Destino:** `docs/rascunhos-editoriais/` e `lib/editorial/local-posts.json`.

O catálogo local contém 16 artigos com slugs únicos e capas existentes. Os seis Markdown já revisados foram preservados. Dez Markdown novos foram extraídos do documento de origem, formatados e marcados `status: rascunho` e `revisao_editorial: pendente`. Referências opacas como `[web:418]` foram marcadas `[fonte a confirmar]`; os dez arquivos novos não receberam URLs inventadas em `fontes_citadas`.

A busca local por slug agora alcança os 16 artigos, porque `getLocalPosts()` não limita implicitamente o catálogo a dez registros. A home continua com seu limite próprio de consulta.

## Verificação local

- `node scripts/sync-editorial.mjs`: 16 artigos.
- 16 slugs únicos, 16 corpos não vazios e 16 capas existentes.
- `node_modules/.bin/tsc --noEmit`: aprovado.
- Prettier nos dez novos Markdown e em `lib/editorial/local-posts.ts`: aprovado.

## Pendente para publicação

Os dez artigos novos ainda exigem revisão factual, fontes oficiais com URLs e conferência de comandos, preços, versões e afirmações sobre o GradualInfo. Nenhum conteúdo foi enviado ao Sanity e nenhum deploy foi feito nesta tarefa.
