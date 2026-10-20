# 0010. Layout editorial da home e do artigo

**Date**: 2026-10-09 20:38, America/Sao_Paulo.
**Status**: Accepted
**Decision source**: Escolhas explícitas do proprietário nesta conversa: spec complementar, home e artigo primeiro, plano escrito e DESIGN.md, três publicações mais recentes, categorias adiadas, tipografia atual, dez artigos sem repetição, bloco neutro e capa decorativa, estrutura administrativa preservada, composição recomendada do artigo e referências somente do projeto. O proprietário autorizou aplicar R1 a R5 da revisão independente registrada em `2026-10-09-2059-0010-revisao-layout-editorial.md`. Aceite integral explícito do proprietário em 2026-10-09: “Aceitar e implementar localmente”. Atualizada em 2026-10-16 (Revisão 2) via /architect, a pedido do proprietário, para alinhar o contrato da home à composição unificada Cambridge efetivamente aprovada e verificada em 2026-10-16 (relatório `docs/reviews/2026-10-16-2001-home-pendentes-verify.md`, 10/10 PASS): incorpora a spec 0013 (que passa a Superseded) e registra o cabeçalho com busca e faixa de letreiro, até então sem spec própria. Revisão 3 aceita em 2026-10-20 por solicitação explícita de reconciliação do proprietário: torna inequívoca a precedência sobre `md-0002/AC-01`, `AC-02`, `AC-04` e `AC-13`, sem alterar `AC-06` nem `AC-10`. Sem autorização de commit, merge ou deploy.

## Summary

Organizar a home como revista digital com matéria de capa, até quatro destaques secundários em grade 2×2, seção própria de Últimas leituras com até quatro artigos e grade de recentes com até dezesseis. Melhorar a leitura do artigo com resumo e metadados antes da capa e texto limitado a 720 px. O cabeçalho mantém a marca, a navegação pública, a busca e a faixa de letreiro. Usar os dados e a identidade visual existentes, sem contas de leitores ou curadoria manual.

Esta spec é a fonte vigente para composição visual da home e do artigo. A MD 0002 continua vigente para segurança, Markdown, SEO, visibilidade e estados que não sejam especializados aqui.

## Context

A home foi reorganizada na unificação Cambridge (spec 0013): matéria de capa, grade 2×2 de destaques secundários, seção de Últimas leituras e grade plana de recentes com até dezesseis artigos, além do cabeçalho com busca e faixa de letreiro. Esta Revisão 2 descreve essa composição, que foi verificada empiricamente em navegador real em 2026-10-16. O artigo usa o corpo Markdown e fontes citadas, com resumo e metadados já posicionados conforme a entrega original.

O projeto está em transição editorial com verificação pendente. O layout deve consumir a camada de serviços vigente, sem escolher outra fonte, mudar sua ativação ou manter duas fontes editoriais. A nova decisão complementa md-0002; publicação, preview, cache, URLs, segurança e SEO continuam regidos pelos contratos atuais.

O bloqueio editorial de 2026-10-09 (home sob falha da fonte exibindo interface de 404) foi resolvido pela Spec 0006: falha de infraestrutura agora exibe o bloco honesto de indisponibilidade (`EditorialIndisponivel`), e catálogo vazio continua sendo estado próprio. As duas situações permanecem distintas nos contratos desta spec.

## Requirements

- **layout-editorial/AC-01**: A home consulta getPublishedPosts uma única vez, com limite 60. A matéria de capa usa o índice 0, os destaques usam os índices 1 a 4 e Últimas leituras usa os índices 5 a 8, sem repetição entre esses três blocos. A grade de recentes recebe, em paralelo, os dezesseis artigos mais recentes por published_at em ordem não crescente. Um artigo aparece no máximo uma vez dentro de cada seção, mas pode aparecer uma vez no topo e outra na grade de recentes.
- **layout-editorial/AC-02**: Com conteúdo suficiente, desktop amplo mostra a matéria de capa ao lado de até quatro destaques em duas colunas de dois cards (grade 2×2, coluna única quando houver até dois destaques), a seção Últimas leituras com até quatro artigos em grade horizontal (editoria, título, resumo e autoria) e a grade de recentes com até dezesseis cards em quatro colunas, com links reais para /artigos/{slug}. Não há conteúdo fixo de demonstração.
- **layout-editorial/AC-03**: Com zero, um, dois, três, quatro ou cinco artigos, a home mantém o h1 institucional, mostra somente artigos existentes e omite blocos vazios: zero usa o estado vazio existente; um mostra só a matéria de capa em largura útil cheia; dois ou três usam coluna única de destaques; quatro ou cinco dispensam Últimas leituras quando ela não tiver artigos. Não duplica artigos para preencher espaços.
- **layout-editorial/AC-04**: Layout funciona em larguras de 320, 375, 768, 1024 e 1440 px sem rolagem horizontal da página. Em mobile a ordem é capa, destaques, últimas leituras e recentes; a grade de recentes usa uma coluna no celular e até quatro no desktop. A âncora /#recentes rola até a grade.
- **layout-editorial/AC-05**: Artigo exibe navegação para Início, editoria como texto, título h1, resumo quando disponível, autor e data quando disponíveis, capa, Markdown e fontes citadas. Corpo tem largura máxima de 720 px, tamanho entre 17 e 19 px no desktop e entrelinha de 1,6 a 1,8. Links do corpo são sublinhados.
- **layout-editorial/AC-06**: Capas e miniaturas usam proporção reservada, recorte com raio de 0,9 rem, URLs aprovadas pelo resolvedor `approvedCoverImageUrl` e alt vazio por serem decorativas nesta etapa. Ausência, URL rejeitada ou falha de carregamento produz bloco neutro sem fotografia de demonstração. Texto do artigo e seu link continuam acessíveis. Imagens do corpo preservam o alt do Markdown e cabem na coluna.
- **layout-editorial/AC-07**: Navegação por teclado tem foco visível e um link principal por card, sem links aninhados. Hierarquia tem um h1 por página, landmarks e nomes das seções. Tema claro e escuro preservam contraste de texto e controles e o seletor de tema existente.
- **layout-editorial/AC-08**: Slugs, canonical, Open Graph, JSON-LD seguro, sitemap, regras de visibilidade pública e preview, Markdown e políticas de cache permanecem conformes aos contratos vigentes. Catálogo vazio e indisponibilidade da fonte permanecem estados distintos: falha de infraestrutura exibe o bloco honesto de indisponibilidade (Spec 0006), nunca lista vazia nem interface de 404.
- **layout-editorial/AC-09**: Cabeçalho mantém a marca oficial como link para a home, a navegação pública HOME, Artigos (/#artigos) e Recentes (/#recentes), a busca pública que aceita consultas sem acento (formulário no desktop e atalho no celular) e o seletor de tema. A faixa inferior exibe mensagem de boas-vindas e letreiro contínuo com os artigos publicados, com trilho duplicado oculto para leitores de tela e teclado; falha ao carregar os artigos não derruba o cabeçalho. Nenhuma entrada administrativa no menu público. Não altera guards, autenticação ou estrutura de /admin-dashboard e /api/admin.
- **layout-editorial/AC-10**: Entrega registra tipos, lint, formatação, testes pertinentes e prova visual e de navegação nos tamanhos do AC-04, incluindo artigo com título longo, corpo extenso, lista, tabela e imagem. Evidências identificam commit, árvore e hashes dos arquivos locais testados se houver alterações não commitadas; nenhum PASS atravessa mudança posterior da árvore.

## Options considered

### Opção 1: Ajustar a apresentação sobre os serviços atuais

Reusa as duas rotas e o modelo Post. Vantagem: mudança visual pequena e reversível. Limite: não oferece curadoria manual, pesquisa ou acervo por categoria. (basis: app/page.tsx, lib/services/posts.ts, decisões do proprietário)

### Opção 2: Novo portal com curadoria e navegação completas

Inclui campos de destaque, categorias e pesquisa. Vantagem: maior controle editorial e descoberta do acervo. Limite: requer contratos de dados e rotas adicionais e ultrapassa a primeira entrega escolhida. (basis: plano de layout recebido, escopo delimitado pelo proprietário)

## Decision

**Chosen option**: Opção 1, ajuste da apresentação sobre os serviços atuais. Esta spec substitui pontualmente as cláusulas visuais conflitantes da MD 0002, sem substituir seus contratos de segurança, dados, SEO e visibilidade. A composição Cambridge descrita aqui é a fonte vigente. Identidade definida por DESIGN.md, sem fontes externas ou paleta paralela. (basis: DESIGN.md, AGENTS.md, decisões do proprietário)

**Detalhes de implementação recomendados**: manter Server Components para leitura e composição; folhas interativas somente para controles existentes e fallback de imagem quando necessário. Reutilizar o componente de card onde couber e criar variantes editoriais, sem consultas por card. Alternativa considerada: componentes duplicados independentes, que multiplicariam regras de imagem e metadados. (basis: AGENTS.md, components/shared/post-card.tsx)

### Precedência pontual após aceite

| Contrato anterior | Disposição especializada pela 0010                                                                                                              | Contrato preservado                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| md-0002/AC-01     | A consulta lê até 60 artigos e a home pode renderizar até 25 instâncias de card, correspondentes a até 16 artigos distintos                     | Ordem por recência e exclusão de não públicos |
| md-0002/AC-02     | Campos por variante conforme tabela abaixo; recentes sem resumo                                                                                 | Dados reais, links e visibilidade             |
| md-0002/AC-04     | Consulta única de até 60 artigos: capa, até quatro destaques 2×2, Últimas leituras e grade de até dezesseis recentes; quatro colunas no desktop | Ordem por recência e estado vazio             |
| md-0002/AC-13     | Autor e data antes da capa; fontes após o corpo, sem repetir assinatura ao final                                                                | Fontes citadas e identidade editorial reais   |

`md-0002/AC-06` e `md-0002/AC-10` não são especializados por esta decisão. A proibição de `dangerouslySetInnerHTML` no caminho Markdown, a exceção exclusiva do JSON-LD seguro, o canonical e a igualdade entre `lastModified` e `published_at` permanecem integrais.

Demais disposições de md-0002 continuam vigentes. A transição editorial e o mecanismo vigente de preview são regidos por `2026-10-08-2228-0006-transicao-editorial-sanity.md` e seus contratos especializados; esta spec não reintroduz o mecanismo antigo de preview descrito em md-0002. Não promove fonte editorial, não altera segurança nem aprova os gates pendentes.

## Rationale

O objetivo atual é melhorar a apresentação do conteúdo existente. Uma consulta de até 60 artigos alimenta a composição Cambridge com uma única leitura e deixa a grade recente selecionar até dezesseis itens sem consulta adicional. Preservar as fontes e os tokens mantém coerência com o tema e evita dependências de carregamento adicionais. Uma reformulação de dados e navegação pode ser feita depois com contrato próprio.

## Feature design

### Dados e origem dos valores

Nenhuma tabela, campo, relação, persistência, API ou variável de ambiente nova. Modelo de leitura: Post existente, identificado por id, navegável pelo slug. A ordem é responsabilidade de getPublishedPosts; o layout não cria desempate ou curadoria novos. A consulta do artigo continua getPostBySlug com as regras vigentes de preview.

| Valor                          | Origem e tratamento                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| Ordem e seleção da home        | Lista de getPublishedPosts(cliente público, 60), fatias do AC-01           |
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

| Variante            | Campos quando disponíveis                                         |
| ------------------- | ----------------------------------------------------------------- |
| Capa                | Imagem 16:9 decorativa, editoria, título, lead e autoria com data |
| Destaque 2×2        | Imagem decorativa, editoria, título e autoria com data            |
| Última leitura      | Editoria, título, resumo e autoria com data                       |
| Card de recente     | Imagem decorativa, editoria, título e autoria com data            |
| Cabeçalho do artigo | Editoria, título, resumo, autor e data                            |

Autoria aparece nas variantes indicadas e no cabeçalho do artigo. Ausências seguem a tabela de origem, sem valores inventados e sem separadores órfãos.

Os campos são obrigatórios por variante, não uniformes em todos os cards. Resumo aparece na capa e em Últimas leituras. Destaques e recentes não recebem resumo. Capa aparece na matéria de capa, nos destaques e nos recentes. Últimas leituras é a variante textual sem capa.

### Composição e limites

Home conserva h1 institucional (visualmente oculto). A área de destaque (âncora #artigos) tem a matéria de capa com imagem 16:9, editoria, título, lead e autoria, ao lado da grade 2×2 de até quatro destaques com imagem, editoria, título e autoria; em telas grandes a segunda coluna do 2×2 é separada por borda vertical. A seção Últimas leituras (âncora #ultimas-leituras) tem cabeçalho próprio com contador e grade horizontal de até quatro artigos com editoria, título, resumo e autoria. A grade de recentes (âncora #recentes) lista até dezesseis cards com imagem, editoria, título e autoria. Textos ausentes não geram separadores órfãos. Títulos não são truncados de forma a ocultar o nome acessível do link.

O máximo visual é 25 instâncias de card: uma matéria de capa, quatro destaques, quatro últimas leituras e dezesseis recentes. Como a grade recente é uma visão paralela, a home representa no máximo dezesseis artigos distintos. A repetição entre o topo e a grade recente é intencional. Repetição dentro da mesma seção continua proibida.

No artigo, a ordem vigente é cabeçalho com editoria, título, resumo, autor e data, depois capa, corpo Markdown e fontes. Não existe uma segunda assinatura depois das fontes.

Composição responsiva: uma coluna de destaques em telas estreitas e duas colunas (capa maior + 2×2) em telas largas, com Últimas leituras abaixo; a grade de recentes vai de uma coluna no celular a quatro no desktop. Artigo mantém capa 16:9 e corpo central de até 720 px.

Não ampliar globalmente o container do layout raiz de modo que mude a área administrativa. A largura pública deve ser aplicada somente ao escopo das rotas desta spec; a solução usa um marcador de escopo exclusivo na raiz das páginas públicas desta spec e uma regra CSS específica sobre o main ancestral que contém esse marcador. O padrão max-w-5xl permanece nas demais rotas, incluindo admin; não criar grupos de rotas ou detectar pathname no layout raiz. Cabeçalho e rodapé permanecem na largura atual. A verificação compara login e painel antes e depois para provar ausência de alteração administrativa.

### Resolução de imagens

Validação de URL separada do fallback visual: `approvedCoverImageUrl` retorna a URL aprovada ou null, mantendo as regras de origem e protocolo existentes, e o wrapper `coverImageUrl` conserva a capa padrão para Open Graph e JSON-LD. A apresentação usa o resultado nullable para mostrar bloco neutro local; falha de carregamento remove a imagem e mantém esse bloco e a proporção. A allowlist cobre capas locais, a origem do site, o bucket público do Supabase e o CDN do Sanity quando o dataset estiver configurado; fora dela, sem imagem visual.

### Interface, segurança e falhas

| Rota            | Método | Entrada             | Saída                      | Autorização e erros                                                       |
| --------------- | ------ | ------------------- | -------------------------- | ------------------------------------------------------------------------- |
| /               | GET    | Nenhuma nova        | Home com lista publicada   | Contrato público atual; vazio não equivale a falha da fonte               |
| /busca          | GET    | q (texto, máx. 120) | Resultados ou estado vazio | Público; consulta sem acentos; sem expor conteúdo não publicado           |
| /artigos/[slug] | GET    | slug existente      | Artigo e metadata          | Regras públicas e preview atuais; 404 e falha de infraestrutura distintos |

Sem novos endpoints além da busca pública já existente. Sem chamada editorial pelo navegador. Nenhuma mudança de cache, RLS, sanitização Markdown, sessão, MFA ou Access. Sem logs novos de conteúdo ou credenciais.

Carregamento usa a fronteira existente com dimensões coerentes. Lista vazia não mostra skeleton permanente. Falha de imagem mantém o espaço neutro e o texto. Falha editorial é propagada para o tratamento contratado, sem converter erro em lista vazia ou notFound. Sem retry automático introduzido nesta apresentação.

## Build plan

Abordagem Tracer Bullet, com conteúdo real pela camada de serviços, sem dados fictícios na aplicação:

1. Entregue em 2026-10-09/11: artigo com capa, largura de leitura e metadados, preservando contratos. Atende AC-05, AC-07, AC-08 e AC-10.
2. Entregue na unificação Cambridge (0013, 2026-10-11/14): capa, grade 2×2 de destaques, Últimas leituras, grade de recentes e resolução de imagens. Atende AC-01 a AC-04 e AC-06.
3. Entregue e verificada em 2026-10-16 (10/10 PASS): cabeçalho com marca, busca sem acentos, âncoras e faixa de letreiro, com prova visual e de navegação. Atende AC-04, AC-07 e AC-09.
4. Pendente, pertence ao ciclo /check: verificação formal do contrato desta Revisão 2 com o gate `scripts/check-decision.mjs --spec docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md` e evidência por AC na árvore avaliada. Confirma AC-01 a AC-10.
5. Corrigir as provas da baseline MD 0002 para respeitar esta precedência: preservar AC-06 e AC-10, validar campos por variante e remover as expectativas antigas de dez itens totais e autoria depois das fontes. Satisfaz **layout-editorial/AC-01**, **layout-editorial/AC-02**, **layout-editorial/AC-05** e **layout-editorial/AC-10**.

Arquivos de partida: app/page.tsx, app/artigos/[slug]/page.tsx, app/busca/page.tsx, components/home/*, components/layout/site-header.tsx, lib/editorial-images.ts. Ler o layout raiz e os helpers de imagem e data para compatibilidade; não alterar a ativação das fontes editoriais.

## Critical test scenarios

- AC-01 a AC-03: listas com 0, 1, 2, 3, 4, 5, 6, 10, 16 e 60 artigos; conferir fatias disjuntas no topo, repetição intencional entre topo e recentes, ordem por data, destinos e ausência de repetição dentro de cada seção.
- AC-04, AC-05 e AC-07: provas visuais em cinco larguras, dois temas, teclado, âncoras /#artigos e /#recentes e Markdown com tabela larga.
- AC-06: capa vazia, URL rejeitada e resposta de imagem 404; espaço neutro, raio e link permanecem utilizáveis.
- AC-08 e AC-09: comparação visual do login/painel antes e depois, artigo público, rascunho sem e com preview, slug inexistente, falha da fonte com bloco honesto, busca com e sem resultado e faixa de letreiro com links; preservar status e cache contratados.
- AC-10: vincular evidências à árvore efetivamente testada e registrar bloqueios sem declará-los PASS, como no relatório `docs/reviews/2026-10-16-2001-home-pendentes-verify.md`.

## Consequences

A home ganha hierarquia editorial, mas não oferece listagem completa nem paginação: a grade de recentes cobre até dezesseis artigos e a seleção muda com novas publicações, sem fixar capa. Capas decorativas não transmitem informação exclusiva; informação essencial precisa estar no texto. Categorias, curadoria manual, descrição alternativa editorial e separação estrutural do layout administrativo continuam fora desta entrega.

A largura pública é aplicada pelo escopo da própria home, sem tocar o container do layout administrativo. A publicação continua condicionada aos gates e às autorizações próprias; o aceite desta spec concede apenas o contrato de implementação local.

## Follow-up

- Verificação formal desta Revisão 2 com o gate contratual (pendência F-01 do relatório de verificação da home de 2026-10-16), pertence ao ciclo /check.
- Categorias, curadoria manual, paginação e descrição de capa exigem contratos posteriores, se priorizados pelo proprietário.

## References

Fontes do projeto: plano de layout enviado nesta conversa; DESIGN.md; AGENTS.md; docs/specs/2026-10-07-1350-md-0002-casca-editorial-home.md; docs/specs/2026-10-11-1552-0013-unificacao-home-cambridge.md (incorporada); docs/reviews/2026-10-16-2001-home-pendentes-verify.md; app/page.tsx; app/busca/page.tsx; components/home/*; components/layout/site-header.tsx; lib/editorial-images.ts; lib/services/posts.ts. Sem pesquisa externa ou ferramenta nova.
