# 0010. Layout editorial da home e do artigo

**Date**: 2026-10-09 20:38, America/Sao_Paulo.
**Status**: Accepted
**Decision source**: Escolhas explícitas do proprietário nesta conversa: spec complementar, home e artigo primeiro, plano escrito e DESIGN.md, três publicações mais recentes, categorias adiadas, tipografia atual, dez artigos sem repetição, bloco neutro e capa decorativa, estrutura administrativa preservada, composição recomendada do artigo e referências somente do projeto. O proprietário autorizou aplicar R1 a R5 da revisão independente registrada em `2026-10-09-2059-0010-revisao-layout-editorial.md`. Aceite integral explícito do proprietário em 2026-10-09: “Aceitar e implementar localmente”. Sem autorização de merge ou deploy.

## Summary

Organizar a home como revista digital com uma capa, dois destaques e até sete artigos recentes. Melhorar a leitura do artigo com resumo e metadados antes da capa e texto limitado a 720 px. Usar os dados e a identidade visual existentes, sem criar pesquisa, categorias, contas de leitores ou novas consultas editoriais.

## Context

A home atual apresenta um destaque horizontal e uma grade de nove artigos. O artigo usa o corpo Markdown e fontes citadas, mas o resumo não aparece e os metadados ficam ao final. A proposta recebida pede hierarquia editorial mais clara e leitura confortável.

O projeto está em transição editorial com verificação pendente. O layout deve consumir a camada de serviços vigente, sem escolher outra fonte, mudar sua ativação ou manter duas fontes editoriais. A nova decisão complementa md-0002; publicação, preview, cache, URLs, segurança e SEO continuam regidos pelos contratos atuais.

Há bloqueio editorial independente registrado na rodada de verificação de 20:29: a home sob falha da fonte retorna 200 com interface de 404. Esta spec não aprova esse comportamento nem escolhe a solução de infraestrutura. A decisão e a correção desse bloqueio precisam ser resolvidas antes da aprovação empírica do novo layout.

## Requirements

- **layout-editorial/AC-01**: Home consulta getPublishedPosts com limite 10 uma vez para os blocos. Mantém a ordem retornada: índice 0 na capa, índices 1 e 2 nos destaques secundários, índices 3 a 9 nos recentes. Cada artigo aparece uma única vez.
- **layout-editorial/AC-02**: Com conteúdo suficiente, desktop amplo mostra capa, coluna de dois destaques e lista de recentes em três colunas, com título da capa visualmente dominante e links reais para /artigos/{slug}. Não há conteúdo fixo de demonstração.
- **layout-editorial/AC-03**: Com zero, um, dois, três ou quatro artigos, a home mantém o h1 institucional, mostra somente artigos existentes e omite blocos vazios. Zero artigos usa o estado vazio existente; não duplica artigos para preencher espaços.
- **layout-editorial/AC-04**: Layout funciona em larguras de 320, 375, 768, 1024 e 1440 px sem rolagem horizontal da página. Em mobile a ordem é capa, secundários, recentes. Em tablet recentes ficam abaixo das duas colunas principais.
- **layout-editorial/AC-05**: Artigo exibe navegação para Início, editoria como texto, título h1, resumo quando disponível, autor e data quando disponíveis, capa, Markdown e fontes citadas. Corpo tem largura máxima de 720 px, tamanho entre 17 e 19 px no desktop e entrelinha de 1,6 a 1,8. Links do corpo são sublinhados.
- **layout-editorial/AC-06**: Capas e miniaturas usam proporção reservada, URLs aprovadas pelo resolvedor existente e alt vazio por serem decorativas nesta etapa. Ausência, URL rejeitada ou falha de carregamento produz bloco neutro sem fotografia de demonstração. Texto do artigo e seu link continuam acessíveis. Imagens do corpo preservam o alt do Markdown e cabem na coluna.
- **layout-editorial/AC-07**: Navegação por teclado tem foco visível e um link principal por card, sem links aninhados. Hierarquia tem um h1 por página, landmarks e nomes das seções. Tema claro e escuro preservam contraste de texto e controles e o seletor de tema existente.
- **layout-editorial/AC-08**: Slugs, canonical, Open Graph, JSON-LD seguro, sitemap, regras de visibilidade pública e preview, Markdown e políticas de cache permanecem conformes aos contratos vigentes. Conteúdo inexistente e falha de infraestrutura permanecem estados distintos; a falha da home citada em Context impede declarar este AC aprovado até sua resolução independente.
- **layout-editorial/AC-09**: Cabeçalho mantém marca, Início, Login para /admin-dashboard/login sem prefetch e seletor de tema. Nenhum controle de pesquisa, categoria, cadastro de leitor, relacionados ou Ver todos aponta para destino inexistente. Não altera guards, autenticação ou estrutura de /admin-dashboard e /api/admin.
- **layout-editorial/AC-10**: Entrega registra tipos, lint, formatação, testes pertinentes e prova visual e de navegação nos tamanhos do AC-04, incluindo artigo com título longo, corpo extenso, lista, tabela e imagem. Evidências identificam commit, árvore e hashes dos arquivos locais testados se houver alterações não commitadas; nenhum PASS atravessa mudança posterior da árvore.

## Options considered

### Opção 1: Ajustar a apresentação sobre os serviços atuais

Reusa as duas rotas e o modelo Post. Vantagem: mudança visual pequena e reversível. Limite: não oferece curadoria manual, pesquisa ou acervo por categoria. (basis: app/page.tsx, lib/services/posts.ts, decisões do proprietário)

### Opção 2: Novo portal com curadoria e navegação completas

Inclui campos de destaque, categorias e pesquisa. Vantagem: maior controle editorial e descoberta do acervo. Limite: requer contratos de dados e rotas adicionais e ultrapassa a primeira entrega escolhida. (basis: plano de layout recebido, escopo delimitado pelo proprietário)

## Decision

**Chosen option**: Opção 1, ajuste da apresentação sobre os serviços atuais. Nova spec complementar, sem substituir md-0002 integralmente. Após o aceite desta proposta, as disposições abaixo têm precedência somente no escopo visual de home e artigo. Identidade definida por DESIGN.md, sem fontes externas ou paleta paralela. (basis: DESIGN.md, AGENTS.md, decisões do proprietário)

**Detalhes de implementação recomendados**: manter Server Components para leitura e composição; folhas interativas somente para controles existentes e fallback de imagem quando necessário. Reutilizar o componente de card onde couber e criar variantes editoriais, sem consultas por card. Alternativa considerada: componentes duplicados independentes, que multiplicariam regras de imagem e metadados. (basis: AGENTS.md, components/shared/post-card.tsx)

### Precedência pontual após aceite

| Contrato anterior | Disposição especializada pela 0010                                                                    | Contrato preservado                         |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| md-0002/AC-02     | Campos por variante conforme tabela abaixo; recentes sem resumo                                       | Dados reais, links e visibilidade           |
| md-0002/AC-04     | Dez artigos no total, distribuídos em capa, dois secundários e sete recentes; três colunas no desktop | Ordem por recência e estado vazio           |
| md-0002/AC-13     | Autor e data antes da capa; fontes após o corpo, sem repetir assinatura ao final                      | Fontes citadas e identidade editorial reais |

Demais disposições de md-0002 continuam vigentes. A transição editorial e o mecanismo vigente de preview são regidos por `2026-10-08-2228-0006-transicao-editorial-sanity.md` e seus contratos especializados; esta spec não reintroduz o mecanismo antigo de preview descrito em md-0002. Não promove fonte editorial, não altera segurança nem aprova os gates pendentes.

## Rationale

O objetivo atual é melhorar a apresentação do conteúdo existente. A seleção por recência e o limite de dez permitem a composição pedida sem mudar o trabalho do editor. Preservar as fontes e os tokens mantém coerência com o tema e evita dependências de carregamento adicionais. Uma reformulação de dados e navegação pode ser feita depois com contrato próprio.

## Feature design

### Dados e origem dos valores

Nenhuma tabela, campo, relação, persistência, API ou variável de ambiente nova. Modelo de leitura: Post existente, identificado por id, navegável pelo slug. A ordem é responsabilidade de getPublishedPosts; o layout não cria desempate ou curadoria novos. A consulta do artigo continua getPostBySlug com as regras vigentes de preview.

| Valor                          | Origem e tratamento                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| Ordem e seleção da home        | Lista de getPublishedPosts(cliente público, 10), fatias do AC-01           |
| Destino do artigo              | /artigos/ concatenado ao slug existente                                    |
| Título e corpo                 | Post.title e Post.content, Markdown pelo renderer existente                |
| Resumo                         | Post.excerpt, omitir se vazio                                              |
| Editoria                       | Post.editoria, omitir se vazio, sem inventar categoria ou link             |
| Autor                          | Post.author_name, omitir se vazio                                          |
| Data                           | Post.published_at, formatDate no fuso America/Sao_Paulo; omitir se ausente |
| Capa                           | Post.cover_image_url pelo resolvedor existente; fallback neutro local      |
| Alternativa da capa            | String vazia, capa decorativa conforme escolha explícita                   |
| Alternativa de imagem do corpo | Texto informado no próprio Markdown                                        |
| Fontes citadas                 | Post.fontes_citadas, títulos e URLs existentes                             |
| Cores, fontes e tema           | DESIGN.md e tokens atuais em app/globals.css                               |
| SEO e visibilidade             | md-0002, contratos de preview e camada editorial vigentes                  |

### Campos por variante

| Variante            | Campos quando disponíveis                          |
| ------------------- | -------------------------------------------------- |
| Capa                | Imagem decorativa, editoria, título, resumo e data |
| Secundário          | Imagem decorativa, editoria, título, resumo e data |
| Recente             | Miniatura decorativa, editoria, título e data      |
| Cabeçalho do artigo | Editoria, título, resumo, autor e data             |

Autor aparece somente no artigo. Ausências seguem a tabela de origem, sem valores inventados e sem separadores órfãos.

### Composição e limites

Home conserva h1 institucional. A área editorial tem capa com imagem 16:9, editoria, título, resumo de até três linhas visuais e metadados; dois secundários usam imagem 16:9, título completo, resumo e data; recentes usam miniatura 4:3, título e metadados, com nome da seção Artigos recentes. Textos ausentes não geram separadores órfãos. Títulos não são truncados de forma a ocultar o nome acessível do link.

Recomendação de layout: container público de até 1200 px na home, espaçamento lateral mínimo de 16 px; a partir de 1280 px três colunas com pesos 45:25:30 descontando os espaços; entre 768 e 1279 px duas colunas principais e recentes abaixo; abaixo de 768 px uma coluna. Artigo mantém capa 16:9 e corpo central de até 720 px. Os máximos de 1200 px na home e 720 px no corpo, os pontos de quebra de 768 e 1280 px e o intervalo tipográfico do AC-05 são limites obrigatórios propostos pelo autor, sujeitos ao aceite integral. Os pesos 45:25:30 são aproximados e podem ser ajustados dentro das três colunas para títulos legíveis, sem mudar ordem, número de artigos ou campos.

Não ampliar globalmente o container do layout raiz de modo que mude a área administrativa. A largura pública deve ser aplicada somente ao escopo das rotas desta spec; a solução usa um marcador de escopo exclusivo na raiz das páginas públicas desta spec e uma regra CSS específica sobre o main ancestral que contém esse marcador. O padrão max-w-5xl permanece nas demais rotas, incluindo admin; não criar grupos de rotas ou detectar pathname no layout raiz. Cabeçalho e rodapé permanecem na largura atual. A verificação compara login e painel antes e depois para provar ausência de alteração administrativa.

### Resolução de imagens

Separar validação de URL de fallback visual: extrair uma função compartilhada que retorne a URL aprovada ou null, mantendo as regras de origem e protocolo existentes. O wrapper coverImageUrl conserva sua assinatura e fallback atual para Open Graph e JSON-LD. A apresentação usa o resultado nullable para mostrar bloco bg-muted local; onError remove a imagem que falhou e mantém esse bloco e a proporção. Não substituir globalmente editorial-cover.svg nem ampliar allowlist. URLs de cdn.sanity.io atualmente rejeitadas continuam sem imagem visual até decisão independente de origem autorizada.

### Interface, segurança e falhas

| Rota            | Método | Entrada        | Saída                    | Autorização e erros                                                       |
| --------------- | ------ | -------------- | ------------------------ | ------------------------------------------------------------------------- |
| /               | GET    | Nenhuma nova   | Home com lista publicada | Contrato público atual; vazio não equivale a falha da fonte               |
| /artigos/[slug] | GET    | slug existente | Artigo e metadata        | Regras públicas e preview atuais; 404 e falha de infraestrutura distintos |

Sem novos endpoints. Sem chamada editorial pelo navegador. Nenhuma mudança de cache, RLS, sanitização Markdown, sessão, MFA ou Access. Sem logs novos de conteúdo ou credenciais.

Carregamento usa a fronteira existente com dimensões coerentes. Lista vazia não mostra skeleton permanente. Falha de imagem mantém o espaço neutro e o texto. Falha editorial é propagada para o tratamento contratado, sem converter erro em lista vazia ou notFound. Sem retry automático introduzido nesta apresentação.

## Build plan

Abordagem Tracer Bullet, com conteúdo real pela camada de serviços, sem dados fictícios na aplicação:

1. Entregar uma fatia home, link e leitura do artigo usando os componentes existentes, aplicando capa e largura de leitura, preservando contratos. Atende AC-01, AC-05, AC-08 e AC-09.
2. Ampliar para os dois destaques e sete recentes, completar imagens e todos os volumes de conteúdo. Atende AC-02, AC-03 e AC-06.
3. Ajustar as composições por largura e estados claro e escuro, teclado, título longo e Markdown extenso. Atende AC-04 e AC-07.
4. Executar regressões pertinentes e verificação visual e funcional, com rastreabilidade da árvore. Atende AC-10 e confirma AC-01 a AC-09. O bloqueio da home sob falha precisa estar resolvido em sua frente própria antes do aceite empírico.

Arquivos de partida: app/page.tsx, app/artigos/[slug]/page.tsx, components/shared/post-card.tsx, components/layout/site-header.tsx, app/globals.css. Ler o layout raiz e os helpers de imagem e data para compatibilidade; não alterar a ativação das fontes editoriais.

## Critical test scenarios

- AC-01 a AC-03: listas com 0, 1, 2, 3, 4 e 10 artigos; conferir ordem, destinos e ausência de repetição.
- AC-04, AC-05 e AC-07: provas visuais em cinco larguras, dois temas, teclado e Markdown com tabela larga.
- AC-06: capa vazia, URL rejeitada e resposta de imagem 404; espaço neutro e link permanecem utilizáveis.
- AC-08 e AC-09: comparação visual do login/painel antes e depois, artigo público, rascunho sem e com preview, slug inexistente, falha da fonte e Login protegido; preservar status e cache contratados.
- AC-10: vincular evidências à árvore efetivamente testada e registrar bloqueios sem declará-los PASS.

## Consequences

A home ganha hierarquia editorial, mas exibe somente dez artigos e não oferece listagem completa. A seleção muda com novas publicações e não permite fixar capa. Capas decorativas não transmitem informação exclusiva; informação essencial precisa estar no texto. Categorias, pesquisa, descrição alternativa editorial e separação estrutural do layout administrativo continuam fora desta entrega.

Aumentar a largura pública exige cuidado com o container raiz compartilhado. A publicação continua condicionada aos gates e às autorizações próprias; o aceite desta spec concede apenas o contrato de implementação local.

## Follow-up

- Aceite integral e revisão de completude desta proposta antes de /develop.
- Resolver a decisão editorial independente da home sob falha registrada em workflow/STATE.md e no relatório de 20:29.
- Categorias, pesquisa, curadoria manual e descrição de capa exigem contratos posteriores, se priorizados pelo proprietário.

## References

Fontes do projeto: plano de layout enviado nesta conversa; DESIGN.md; AGENTS.md; docs/specs/2026-10-07-1350-md-0002-casca-editorial-home.md; app/page.tsx; lib/services/posts.ts; components/shared/post-card.tsx. Sem pesquisa externa ou ferramenta nova.
