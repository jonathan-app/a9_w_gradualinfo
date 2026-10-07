# md-0002. Home de leitura, página de artigo e SEO básico

**Date**: 2026-10-05
**Status**: Accepted
**Decision source**: 
- **Aceite da spec md-0002**: Aprovada pelo dono anteriormente na definição do contrato da casca editorial e política de cache (`no-store` por requisição).
- **Emenda do AC-06 (2026-10-07)**: O dono respondeu explicitamente `1` na sessão de 2026-10-07, aprovando pontualmente a exceção exclusiva para JSON-LD estruturado (`<script type="application/ld+json">`) com serialização segura e escape Unicode, mantendo proibido `dangerouslySetInnerHTML` no corpo Markdown do artigo.

**Preview**: especializado por `0003-preview-autorizacao.md`, Accepted por autorização de execução do plano em 2026-10-07.

## Summary

O portal precisa de duas páginas: uma lista inicial que mostra os artigos já
publicados, e a página onde o artigo é lido. As duas tiram o texto de um banco
de dados (Supabase), e o texto é escrito em Markdown. Isto decide também a
parte básica de busca para buscadores: endereço canônico, dados estruturados e
entrada no mapa do site.

Para quem está construindo: a home e a página de artigo são Server Components
que leem do banco no servidor, e a RLS do banco é a fronteira que decide o que
é público. As consultas também filtram rascunho, como segunda barreira. O que
este documento NÃO faz é entregar a funcionalidade: ele descreve o contrato, e
a validação desse contrato vem depois, com `/check verify`, sobre o código
escrito.

## Context

O produto é um portal em português do Brasil para estudantes de programação.
A primeira jornada é o guia "manter, melhorar ou comprar um notebook para
estudar programação", e a fatia anterior (`md-0001`) já deixou o/articles no
Supabase com corpo Markdown, em vez de arquivos MDX versionados no repositório.
Isso remove o gargalo de exigir git para publicar, mas deixa um problema
aberto: o banco tem conteúdo e não tem página.

Sem página, o conteúdo não existe para o leitor nem para o buscador. É
exatamente o estado atual de `main`: não há rota de produto nenhuma.

Três forças moldam a decisão. Primeira, o boilerplate já tem `SITE_ORIGIN` em
`lib/site-config.ts` e um `app/sitemap.ts` estático que lista só `/exemplo`;
qualquer URL absoluta nova precisa sair do primeiro, senão o default errado
fica copiado por arquivo. Segunda, `react-markdown` e `remark-gfm` já estão
instalados, então renderizar Markdown é trabalho de uso, não de escolha de
dependência. Terceira, e mais forte: a RLS do Supabase é a fronteira de
autorização, mas sozinha não basta, porque existe cliente privilegiado que a
burla por definição. Um caminho público que leia com `service_role` vaza
rascunho mesmo com a policy impecável. Por isso a spec exige as duas camadas:
a policy decide, e a consulta também filtra.

A consequência de não decidir: a home e o artigo saem primeiro em código e a
parte de indexação fica para depois, quando já há URLs públicas em produção
que precisam de canonical e de redirecionamento. Corrigir isso depois é mais
caro do que decidir agora.

## Requirements

**User stories**:

- Como estudante que procura orientação, quero ver na primeira página os artigos
  já publicados, com capa, editoria, título, resumo e data, para saber se
  aquilo existe sem precisar procurar.
- Como leitor de um artigo, quero que o texto apareça formatado e legível, com
  um único título principal, para ler sem ruído.
- Como quem chega de um buscador, quero que a página do artigo tenha endereço
  canônico e dados estruturados válidos, para o resultado não aparecer duplicado
  nem sem imagem.

**Acceptance criteria** (o contrato; `/develop` constrói para cá, `/check verify`
confere contra isto):

- **md-0002/AC-01**: a home lista no máximo 10 artigos publicados, do mais
  recente para o mais antigo, e **não lista rascunho nem artigo com data
  futura**, verificado com um banco semeado que contenha os dois casos.
- **md-0002/AC-02**: cada card da home exibe capa, editoria, título, resumo e
  data, e cada valor vem da coluna nomeada em `## Value sourcing`.
- **md-0002/AC-03**: com 0 artigos publicados a home mostra o estado vazio
  (mensagem explícita, não uma grade silenciosamente vazia); com falha de
  leitura do banco ela mostra a página de erro — **as duas mensagens são
  diferentes**, porque "não tem artigo" e "deu erro" são respostas diferentes
  para o leitor.
- **md-0002/AC-04**: a home tem um esboço do artigo mais recente no topo,
  acima da grade, e o limite de 10 vale para a grade.
- **md-0002/AC-05**: `/artigos/[slug]` renderiza o título em um único `<h1>` e
  o corpo Markdown convertido em HTML, sem nenhuma sintaxe Markdown crua
  aparecendo na página.
- **md-0002/AC-06**: o corpo Markdown do artigo **não** usa
  `dangerouslySetInnerHTML` em nenhum caminho. A única exceção permitida na
  página é o `<script type="application/ld+json">` do AC-09, alimentado por
  JSON serializado com escaping de `<`, `>` e `&`, neutralizando inclusive
  `</script>`. Nenhum HTML editorial é inserido por essa exceção. A
  verificação combina inspeção dos caminhos de renderização e teste com
  conteúdo malicioso no HTML servido em produção local: o JSON deve fazer
  parse e preservar os valores, sem criar elementos ou scripts adicionais
  nem executar o conteúdo injetado. Um helper isolado ou um teste apenas do
  serializador não prova o cumprimento deste AC.
- **md-0002/AC-07**: `slug` inexistente devolve **404** com a página de erro do
  app; artigo com `published_at` no futuro também devolve **404** em produção.
- **md-0002/AC-08**: o preview de artigo não publicado existe e é **autorizado
  explicitamente**, pelo mecanismo do `md-0001` (`app_metadata.preview` em sessão
  `authenticated`, obtida a partir de `SUPABASE_PREVIEW_TOKEN`): nunca por
  `NODE_ENV`, que é constante de build e não credencial. Com sessão de preview, o
  rascunho responde **200**; sem sessão, responde **404** — e **os dois lados têm
  teste**, porque um portão com teste só do lado que permite é meio portão.
- **md-0002/AC-09**: o HTML servido contém
  `<script type="application/ld+json">` com `@type: Article`, título,
  `datePublished`, autor e imagem, e o JSON faz parse.
- **md-0002/AC-10**: cada artigo tem canonical absoluto derivado de
  `SITE_ORIGIN`, e o mapa do site (`/sitemap.xml`) contém a URL de cada
  artigo publicado com `lastModified` igual a `published_at`.
- **md-0002/AC-11**: `pnpm supabase:test` prova, para `anon` e para cada papel
  público, que rascunho e artigo agendado não são legíveis; e o código de leitura
  pública **não** usa cliente `service_role`, com verificação automatizada de que
  nenhum caminho alcançável por `anon` chega até ele.
- **md-0002/AC-12**: a home e o artigo passam no `@axe-core/playwright` já
  configurado em `e2e/accessibility.spec.ts`, e a navegação por teclado
  funciona com foco visível.
- **md-0002/AC-13**: a página de artigo exibe as `fontes_citadas` do `md-0001`
  em uma **seção "Fontes" ao final do corpo**, depois do último parágrafo e
  **antes** dos metadados de autoria; cada fonte é um link com o texto de
  `titulo` e o `href` de `url`, em URL absoluta; artigo com lista vazia renderiza
  a página **sem** a seção e **sem** erro; e nenhuma fonte é inserida dentro do
  corpo Markdown como HTML arbitrário. Esta spec é a metade de exibição do
  contrato, e a metade de dados é o AC-07 do `md-0001`.

## Options considered

### Opção 1: Server Component lendo direto do Supabase (escolhida)

A página é um Server Component que cria o cliente de servidor, consulta
`posts` e renderiza. Sem rota de API, sem estado no cliente, sem cache
próprio. O corpo Markdown é convertido com `react-markdown` no servidor.

**Pros**:

- O HTML já chega pronto ao buscador e ao leitor sem JavaScript de dados.
- Não existe caminho de API que possa furar a RLS, porque não há API.
- Menos código e menos superfície de erro que um caminho cliente.

**Cons**:

- O preview precisa de uma credencial própria, e toda consulta fica com um
  caminho autenticado: dois caminhos de leitura para a mesma tabela é mais
  superfície, não menos.
- Cada requisição consulta o banco, aumentando o custo de leitura em troca
  de dispensar um processo de invalidação editorial no MVP.

### Opção 2: Route Handler de API consumida pelo cliente

`/api/artigos` e `/api/artigos/[slug]`, com React Query ou `use` no cliente.

**Pros**:

- Uma rota só para o dado, cacheável e testável isoladamente.
- O preview deixa de ser condicional: a rota pode receber um parâmetro.

**Cons**:

- Cria uma superfície pública nova que precisa da mesma RLS, e RLS em route
  handler exige cuidado com o service role, que a burla.
- A página só existe depois do JS: pior para SEO, que é metade do objetivo.
- Dá um jeito de o conteúdo aparecer desatualizado sem ninguém perceber.

### Opção 3: Arquivos Markdown versionados no repositório

O que a branch `feat/identidade-portal-gradualinfo` fazia com MDX e Velite.

**Pros**:

- Diff e revisão de conteúdo funcionam como as de código.
- Zero dependência de banco para publicar.

**Cons**:

- Publicar exige abrir PR e passar por revisão de código — o gargalo que o
  `md-0001` decidiu remover.
- Traz um framework de build (Velite) e uma herança de configuração que o
  `md-0001` revogou.

### Opção 4: CMS de terceiros (Sanity, Contentful, Payload)

**Pros**:

- Painel editorial pronto, com preview e agendamento.

**Cons**:

- Custo e mais um fornecedor com dado do produto.
- O produto já decidiu, por decisão do dono, que painel editorial é pós-MVP.

## Decision

**Chosen option**: Opção 1: Server Component lendo direto do Supabase.

Home e página de artigo são Server Components que leem `posts` no servidor, e
o SEO básico (canonical, JSON-LD, `sitemap.xml`, OpenGraph) entra **na mesma
fatia**, e não como fase separada — porque uma página publicada sem canonical
já gera o custo de correção depois.

**Implementation skills**: `nextjs-app-router-patterns`
(`JavaScript-Mastery-Pro/skills`, `.agents/skills/nextjs-app-router-patterns/`) ·
`nextjs-seo-indexing` (`JavaScript-Mastery-Pro/skills`,
`.agents/skills/nextjs-seo-indexing/`) · `frontend-design`
(`JavaScript-Mastery-Pro/skills`, `.agents/skills/frontend-design/`)

### Política de cache editorial

A home, a página de artigo e o sitemap consultam o conteúdo por requisição,
sem cache persistente dos dados editoriais ou das respostas que os contêm.
Publicações, correções e mudanças de status aparecem na próxima requisição
após a transação no banco, sem `revalidatePath` ou `revalidateTag`.
Nenhum cache compartilhado pode armazenar conteúdo autorizado por preview.
Respostas de preview usam `Cache-Control: private, no-store`.

A verificação deve alterar conteúdo e status no banco entre requisições e
confirmar a mudança na home, artigo e sitemap, incluindo artigo agendado que
se torna público após `published_at`. Deve conferir o header de preview e
que uma requisição anônima posterior não recebe a resposta protegida.
Estas provas complementam AC-01, AC-07, AC-08 e AC-10. Uma declaração de
renderização dinâmica isolada não prova os headers nem o comportamento
observado do cache.

## Rationale

A Opção 2 foi descartada por um motivo específico, não por preferência de
estilo: ela cria uma rota pública de leitura, e rota pública de leitura é
justamente onde a RLS costuma ser contornada por conveniência (um service role
" só para leitura " que na verdade escreve). O produto não tem login, então não
há ganho que compense uma superfície pública nova em troca de um risco que a
Opção 1 não tem.

A Opção 1 também resolve o SEO sem trabalho extra, e isso não é coincidência:
renderizar no servidor e indexar bem são a mesma decisão. A Opção 2 faz as
duas coisas separadamente, e paga duas vezes.

A Opção 3 está revogada por decisão de dono, registrada no `md-0001`. A Opção
4 adia um painel que o produto declarou pós-MVP; escrevê-la aqui seria
desenhar o que foi descartado.

Sobre o preview (AC-08): a resposta tentadora é checar `NODE_ENV` e, em
desenvolvimento, aceitar rascunho. Isso não é autorização, e é pior do que
não ter preview: `NODE_ENV` é uma constante de build, não um segredo, e a lógica
de "quem é esse leitor" precisa sobreviver a um build de produção configurado
errado. Por isso o
preview exige credencial: um segredo deliberadamente configurado, mais simples
de reverter do que um `NODE_ENV` que ninguém consegue auditar.

O preço é uma segunda policy de leitura, e por isso o `md-0001` acrescenta
`posts_select_preview`. Duas policies com nomes claros são mais fáceis de revisar
do que uma policy com `OR` dentro, que é onde esse tipo de acesso costuma dar
errado. O mecanismo completo — como a credencial vira sessão e por que a claim
fica em `app_metadata` e não em `user_metadata` — está em `md-0001`, e o teste
de acesso efetivo por papel também.

## Feature design

**Data model sketch**: esta spec **não cria nem altera tabela**. Consome a tabela
`posts` como o `md-0001` a deixar, e a forma abaixo é a **referência de leitura**
para quem constrói a página — não uma segunda declaração de schema. A tabela já
existe em `main` desde 2026-10-04 como exemplo; o `md-0001` a transforma no
schema editorial. A lista completa e a tensão das colunas está lá; aqui estão
só as que a página lê, com uma coluna a mais para o que a página precisa saber:

| Coluna            | Por que a página precisa                                       |
| ----------------- | -------------------------------------------------------------- |
| `slug`            | resolve a rota `/artigos/[slug]` e monta o canonical           |
| `title`           | `<h1>` e `headline` do JSON-LD                                 |
| `content`         | corpo Markdown do corpo do artigo                              |
| `excerpt`         | `description`, `og:description` e resumo do card               |
| `cover_image_url` | capa do card e `og:image`                                      |
| `editoria`        | rótulo do card                                                 |
| `author_name`     | `author` do JSON-LD                                            |
| `fontes_citadas`  | seção "Fontes" do AC-13                                        |
| `status`          | filtra rascunho e arquivado                                    |
| `published_at`    | ordenação, filtro de agendamento e `lastModified`              |
| `created_at`      | existe desde 2026-10-04 e é preservada; não é lida pela página |
| `updated_at`      | existe e é preservada; não é lida pela página                  |

**Nota sobre `editoria`**: no MVP é texto livre, sem lista fechada. A busca com
recorte por editoria é a fatia 9, e é lá que a taxonomia precisa virar
vocabulário controlado. Fixar cinco valores agora trava um texto sem alguém
ter pedido. A troca: nada impede que o conteúdo crie seis editorias diferentes
por erro de digitação até a fatia 9. Aceito, porque a fatia 9 é quem vai
precisar do recorte e é quem paga esse custo.

**Nota sobre `author_name`**: é texto duplicado, não uma referência a perfil.
O MVP não tem cadastro nem login, então uma tabela de perfis seria estrutura
para um dado que só o dono preenche. O custo aceito é o nome não acompanhar
uma renomeação futura — o que é impossível hoje, porque não existe tela para
renomear.

**API surface**: nenhuma. Não há rota de API neste contrato; as páginas leem
do Supabase no Server Component. A ausência é intencional e é o motivo de
AC-11 não existir como endpoint.

| Endpoint                         | Method | Key inputs | Key outputs | Auth | Key errors |
| -------------------------------- | ------ | ---------- | ----------- | ---- | ---------- |
| _(nenhuma rota de API é criada)_ | —      | —          | —           | —    | —          |

**Value sourcing** (todo valor que a página produz ou exibe diz de onde vem;
valor sem fonte é decisão que sobrou para o `/develop` inventar, e isso é o que
esta tabela existe para impedir):

| Valor exibido                    | Fonte                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Lista de articles da home        | `posts` com `status = 'publicado'` e `published_at <= now()`, via RLS                                       |
| Limite de 10 por página          | decidido nesta spec; a query usa `limit(10)`                                                                |
| Artigo do esboço do topo         | primeiro item da mesma ordenação, `status` e `published_at` já filtrados                                    |
| Capa do card                     | `posts.cover_image_url`                                                                                     |
| Rótulo de editoria               | `posts.editoria`                                                                                            |
| Título do card                   | `posts.title`                                                                                               |
| Resumo do card                   | `posts.excerpt`                                                                                             |
| Data exibida                     | `posts.published_at` formatada por `formatDate` (`lib/utils/format.ts`) com `timeZone: 'America/Sao_Paulo'` |
| `<h1>` do artigo                 | `posts.title`                                                                                               |
| Corpo HTML do artigo             | `posts.content` convertido por `react-markdown` + `remark-gfm`                                              |
| `description` e `og:description` | `posts.excerpt`                                                                                             |
| `og:image`                       | `posts.cover_image_url`                                                                                     |
| canonical do artigo              | `` `${SITE_ORIGIN}/artigos/${posts.slug}` `` (`lib/site-config.ts`)                                         |
| Autor no JSON-LD                 | `posts.author_name`                                                                                         |
| `datePublished` no JSON-LD       | `posts.published_at` em ISO 8601                                                                            |
| `lastModified` no sitemap        | `posts.published_at`                                                                                        |
| URL canônica do site             | `SITE_ORIGIN` (`lib/site-config.ts`) — a origem vem de `NEXT_PUBLIC_SITE_URL`                               |
| Mensagem do estado vazio         | literal em `app/artigos-vazios.tsx`                                                                         |
| Mensagem do estado de erro       | `app/error.tsx` já existente                                                                                |
| `404`                            | `notFound()` do Next, com `app/not-found.tsx` já existente                                                  |

**Lacuna de fonte resolvida aqui**: `formatDate` hoje formata no fuso do
servidor, e o servidor em produção roda em UTC. Uma `timestamptz` de um artigo
publicado às 23h do dia 4 aparece como dia 3 (ou dia 5) para o leitor no Brasil.
A correção é somar `timeZone` opcional a `FormatOptions` em
`lib/utils/format.ts`, com default `undefined` para não mudar quem já chama
(`app/exemplo/page.tsx`), e esta spec passa `'America/Sao_Paulo'`.

**Key invariants**:

- A RLS decide o que é público. As consultas também filtram rascunho, e as duas
  camadas têm teste. Filtro no código não substitui policy, e policy não
  substitui filtro.
- Nenhum caminho de leitura pública usa `service_role`. Ele burla a RLS por
  definição, então usá-lo em código público é vazar rascunho com a policy
  impecável.
- Uma página tem exatamente um `<h1>`.
- O corpo Markdown nunca passa por `dangerouslySetInnerHTML`. A exceção
  exclusiva para JSON-LD segue o escaping e a prova exigidos no AC-06.
- Toda URL absoluta vem de `SITE_ORIGIN`.
- Todo dado sensível do ambiente entra por `lib/env.ts`.

**Security model**:

| Papel          | Lê                                                             | Escreve              |
| -------------- | -------------------------------------------------------------- | -------------------- |
| `anon`         | só linhas com `status = 'publicado'` e `published_at <= now()` | não                  |
| `service_role` | tudo, por definição: burla a RLS                               | sim, só em migration |

A policy é `posts_select_public` do `md-0001`. Sem tabela nova, não há policy
nova para revisar. `author_name` é texto de autoria editorial e é servido
publicamente, como em qualquer blog.

**Configuration required**:

- `NEXT_PUBLIC_SITE_URL`: origem pública, já existente em `lib/site-config.ts`,
  usada por canonical e por `sitemap.xml`. Nenhuma variável nova.

## Critical test scenarios

- Happy path: home semeada com 3 publicados e 1 rascunho devolve só os 3
  publicados, ordenados do mais recente ao mais antigo, cada card com capa,
  editoria, título, resumo e data. Verifica **md-0002/AC-01**, **md-0002/AC-02**.
- Estado limite: banco com 11 publicados mostra 10 na grade; banco com 0
  publicados mostra a mensagem de estado vazio. Verifica **md-0002/AC-04**,
  **md-0002/AC-03**.
- Leitura: `/artigos/[slug]` mostra o título em `<h1>` e o corpo Markdown como
  HTML, sem sintaxe crua. Verifica **md-0002/AC-05**, **md-0002/AC-06**.
- Falha: `slug` inexistente devolve 404; artigo com data futura devolve 404 em
  produção. Verifica **md-0002/AC-07**.
- Ambiente: o mesmo rascunho responde 200 em `local` e 404 em build de
  produção. Verifica **md-0002/AC-08**.
- Segurança de renderização: conteúdo editorial com `<`, `>`, `&` e
  `</script><script>` mantém o JSON-LD parseável e os valores preservados no
  HTML servido, sem criar elementos ou executar scripts injetados. A
  inspeção confirma que a exceção não alcança o corpo Markdown. Verifica
  **md-0002/AC-06**, **md-0002/AC-09**.
- SEO: o HTML servido traz JSON-LD `Article` parseável, canonical absoluto e o
  `sitemap.xml` traz a URL com `lastModified` igual a `published_at`.
  Verifica **md-0002/AC-09**, **md-0002/AC-10**.
- Autorização: `anon` não lê rascunho, provado por pgTAP. Verifica
  **md-0002/AC-11**.
- Acessibilidade: axe sem violações nas duas páginas. Verifica **md-0002/AC-12**.
- Jornada: artigo com `fontes_citadas` preenchidas mostra cada fonte como link
  com `href` absoluto; artigo com `[]` mostra a página sem a seção e sem erro.
  Verifica **md-0002/AC-13**.

## Build plan

1. Ampliar `formatDate` com `timeZone` opcional em `lib/utils/format.ts`,
   default `undefined`, com teste unitário do novo parâmetro.
   Satisfaz **md-0002/AC-02**.
2. Confirmar que `posts`, depois da transformação do `md-0001`, tem as colunas
   que a página lê, com RLS e índice de listagem. **A tabela já existe** em `main`
   como exemplo, então isto é dependência, não construção: se o `md-0001` não
   entregou, esta tarefa não avança. Satisfaz **md-0002/AC-01**, **md-0002/AC-11**.
3. Criar a camada de leitura: função única que recebe o cliente do servidor e
   devolve artigos publicados já ordenados e limitados, e outra que busca por
   `slug`, com a checagem de credencial de preview da AC-08 em um único ponto,
   antes da query.
   Satisfaz **md-0002/AC-01**, **md-0002/AC-07**, **md-0002/AC-08**.
4. Construir o card e a home, com esboço no topo, grade limitada a 10, estado
   vazio e `loading.tsx`. Satisfaz **md-0002/AC-02**, **md-0002/AC-03**,
   **md-0002/AC-04**.
5. Construir `/artigos/[slug]` com `notFound()` para slug ausente ou não
   publicado e `react-markdown` no corpo. Satisfaz **md-0002/AC-05**,
   **md-0002/AC-06**, **md-0002/AC-07**.
6. Gerar `generateMetadata` (description, OpenGraph, canonical) e o JSON-LD
   `Article`. Satisfaz **md-0002/AC-09**, **md-0002/AC-10**.
7. Trocar `app/sitemap.ts` de estático para dinâmico, somando os artigos
   publicados ao que já lista. Satisfaz **md-0002/AC-10**.
8. Testes: pgTAP de RLS, E2E dos cenários acima e axe nas duas páginas.
   Satisfaz **md-0002/AC-11**, **md-0002/AC-12**.
9. Renderizar as fontes citadas na página de artigo, a partir de
   `fontes_citadas`, com o texto do link e o `href` da fonte, e sem erro quando
   a lista está vazia. Satisfaz **md-0002/AC-13**.

A tarefa 9 executa o formato aprovado: seção "Fontes" ao final do corpo, lista
de links, `titulo` como texto do link e `url` como `href`. Era a última decisão
que faltava para esta tarefa ter critério de aceitação próprio.

## Consequences

**Positive**:

- O conteúdo existente no banco vira algo que o leitor e o buscador alcançam.
- O preview exige credencial, não `NODE_ENV`: é auditable e reversível, ao
  contrário de um ramo que decide por variável de build.
- O SEO básico sai junto, então não há URL pública sem canonical depois.
- Nenhuma rota de API nova para auditar.

**Negative / tradeoffs**:

- A política sem cache persistente exige leitura do banco por requisição.
  O custo e a disponibilidade do Supabase afetam diretamente a leitura do
  portal. Uma política futura de cache requer decisão própria e contrato
  de invalidação.
- `author_name` é dado duplicado; quando existir cadastro, isso vira migração.
- `editoria` é texto livre até a fatia 9, então pode haver variante com
  digitação errada.
- A camada de leitura é Server Component, então testar a query exige subir o
  Supabase local, não basta mock.

**Neutral**:

- `react-markdown` e `remark-gfm` já estavam instalados; nenhuma dependência
  entra por esta spec.
- `app/error.tsx` e `app/not-found.tsx` já existem e são reutilizados.

## Follow-up

- [x] **Fontes citadas: formato decidido — seção final, lista de links**, pelo
      dono em 2026-10-05. A lacuna real era essa: coluna guarda o contrato de
      dados, não entrega transparência ao leitor, e guardar sem exibir é meio
      recurso. O AC-07 do `md-0001` exige o dado e o AC-13 desta spec exige a
      exibição, e os dois juntos destravam a fatia 7 (guia do notebook), que não
      podia ser validada enquanto a apresentação não existisse.
- [x] **`md-0001` foi emendado, não supersedido**, por decisão do dono em
      2026-10-05, e o **conteúdo** do schema foi aprovado explicitamente na
      mesma ocasião, coluna a coluna. A spec está `Accepted` e pode ir para
      `/develop`.
- [ ] **`md-0001` foi emendado, não supersedido**, por decisão do dono em
      2026-10-05. A direção foi autorizada; o **conteúdo** do schema emendado
      (colunas, policies, papel de preview, formato de `fontes_citadas`) segue
      `Proposed` e precisa de aceite explícito antes de `/develop`. Ver a seção
      `## Portão desta emenda` no `md-0001`.
- [ ] **O nome do arquivo não segue a convenção** `NNNN-kebab-case.md` do
      `/architect`: este é `md-0002-...`. O prefixo foi adotado para não
      colidir com as specs revogadas da branch
      `feat/identidade-portal-gradualinfo`, que ocupam `0001` e `0002`.
      Manter o prefixo ou migrar é decisão do dono; migrar exige renomear
      junto o `md-0001`.
- [ ] **`app/sitemap.ts` ainda lista `/exemplo`** e o `app/exemplo` é
      boilerplate. A tarefa 7 troca o sitemap por dinâmico; remover a rota de
      exemplo, e a entrada correspondente, fica para o mesmo passo.
- [ ] **Contrato do gate**: `scripts/check-gate.mjs` passou a ler JSON
      estruturado (a saída de `check-decision.mjs`) mais `--commit`, com o
      caminho `.md` antigo mantido como legado deprecado para não invalidar
      relatórios já emitidos. Nenhuma pendência aberta neste repositório.

## Portão, na ordem certa

Esta spec **não** é validada por verificação funcional: os ACs acima descrevem
código que ainda não existe, e nenhuma verificação de comportamento é possível
antes da implementação. A sequência é:

| Etapa           | O que confirma                                                           | O que NÃO confirma    |
| --------------- | ------------------------------------------------------------------------ | --------------------- |
| aceite (aqui)   | que escopo, contratos, dependências e ACs estão decididos e verificáveis | que o código funciona |
| `/develop`      | constrói contra os ACs                                                   |                       |
| `/check verify` | que cada AC se sustenta em evidência, sobre a entrega                    |                       |

Uma versão anterior desta spec escrevia "`/check verify` aprovado antes do
`/develop`" como portão, e isso era um deadlock: `check-decision.mjs` reprova
qualquer AC que não esteja em PASS com evidência, então o portão só abriria
depois da construção que ele ostensibly autorizava. O aceite do `/architect` é
sobre o **design**, e o `/check verify` é sobre a **implementação** — são
verificações diferentes, em momentos diferentes, e nenhuma substitui a outra.

## References

**Project sources**:

- `AGENTS.md` — convenções que a build tem de honrar: `cn()`, Server
  Component por padrão, env por `lib/env.ts`, RLS em toda tabela.
- `docs/scope/0001-mvp-portal-gradualinfo.md` revisão 3 — fatias 1 a 4, e a
  definição do schema da fatia 1.
- `docs/specs/md-0001-arquitetura-markdown-supabase.md` — a decisão
  fundacional (Supabase + Markdown, rota `/artigos/[slug]`, sem painel).
- `docs/specs/INDICE.md` — mapa de IDs e supersessão das specs.
- `lib/site-config.ts`, `lib/utils/format.ts`, `app/sitemap.ts`,
  `app/error.tsx`, `app/not-found.tsx` — o que já existe e é reutilizado.
- `.agents/skills/nextjs-seo-indexing/`, `.agents/skills/frontend-design/` —
  as práticas que informaram a parte de SEO e a de UI.

**Practices & standards**:

- Server Component por padrão, para HTML indexável sem JS de dados.
- Defesa em profundidade: RLS como fronteira de autorização, mais filtro
  editorial na consulta, porque cliente privilegiado burla a policy.
- Canonical e JSON-LD no mesmo PR da página, para não publicar URL sem
  endereço definitivo.
