# Correção das capas dos artigos

Data: 2026-10-12. Alteração local, sem publicação no Sanity ou deploy.

## Causa encontrada no código

`scripts/seed-sanity-drafts.py` gravou `cover_image_url` com o caminho relativo do Markdown, por exemplo `/1. Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram.jpeg`. `mapSanityDocumentToPost` preservava esse caminho, mas `approvedCoverImageUrl` chamava `new URL(value)` sem base e o rejeitava. A interface então mostrava o fallback. Após a organização das 16 capas em `public/artigos/<slug>.jpeg`, o nome numerado antigo também deixou de existir na raiz de `public/`. O caractere `?` presente em um dos nomes seria interpretado como início da query caso o caminho fosse convertido diretamente em URL.

O catálogo local criava URLs absolutas com `env.siteUrl`. Isso fazia as capas seguirem a origem configurada, mesmo quando a prévia era aberta em outra origem ou porta. Os documentos que usam ativos do CDN do Sanity também eram rejeitados pela lista de origens permitidas.

## Correção

- Capas do catálogo local agora usam o caminho relativo `/artigos/<slug>.jpeg`.
- O mapeamento de documentos Sanity converte os nomes numerados antigos em `/artigos/<slug>.jpeg`, sem alterar o conteúdo remoto. O valor bruto é analisado antes de interpretar `?` como query.
- O validador aceita apenas o padrão local `/artigos/<slug>.jpeg`, além da origem do site, do bucket público configurado e do caminho do projeto e dataset configurados em `cdn.sanity.io`.
- `coverImageUrl` transforma o caminho local aprovado em URL absoluta apenas quando precisa gerar metadados.

## Evidência e limite

As 16 capas existem em `public/artigos/`. TypeScript e ESLint passaram. Quatro suítes focadas passaram com 41 testes, incluindo a correspondência dos 16 caminhos locais com arquivos reais, conversão do nome antigo com `?`, aceitação da URL do CDN configurado e renderização de `<img src="/artigos/<slug>.jpeg">` pelo componente de capa.

A requisição HTTP ao servidor local não foi comprovada nesta rodada porque a conexão à porta 3000 foi bloqueada pelo sandbox. O teste de runtime e a inspeção visual devem ser repetidos na instância que o proprietário usa para visualizar o site. Uma instância com build antigo precisa ser reiniciada para carregar esta correção.
