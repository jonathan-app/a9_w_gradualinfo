# md-0002. Home de leitura, página de artigo e SEO básico

**Date**: 2026-10-05
**Status**: Accepted
**Decision source**: aceito pelo dono em 2026-10-05 (painel de decisão da
sessão, `/architect`), sem alteração em relação ao texto revisado. A decisão
sobre `editoria` ficar como texto livre até a fatia 9 foi explicitamente
confirmada e fica registrada como premissa reversível.

## Summary

O portal precisa de duas páginas: uma lista inicial que mostra os artigos já
publicados, e a página onde o artigo é lido. As duas tiram o texto de um banco
de dados (Supabase), e o texto é escrito em Markdown. Isto decide também a
parte básica de busca para buscadores: endereço canônico, dados estruturados e
entrada no mapa do site.

Para quem está construindo: a home e a página de artigo são Server Components
que leem do banco no servidor, e a RLS do banco é a única coisa que decide o
que é público. Nenhum filtro de publicação é duplicado no código. O que este
documento NÃO faz é entregar a functionality: ele descreve o contrato, e a
validação desse contrato vem depois, com `/check verify`, sobre o código
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
segurança, e duplicar a regra "só publicado é público" dentro de uma query
cria dois lugares onde a mesma política mora. Divergem, e quem divergir não tem
alarme.

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
- **md-0002/AC-06**: o corpo do artigo **não** usa `dangerouslySetInnerHTML`
  em nenhum caminho; verificável por busca no bundle servido.
- **md-0002/AC-07**: `slug` inexistente devolve **404** com a página de erro do
  app; artigo com `published_at` no futuro também devolve **404** em produção.
- **md-0002/AC-08**: em ambiente `local`, artigo não publicado é acessível para
  preview, e essa diferença mora em um único ponto testável, não espalhada em
  três arquivos.
- **md-0002/AC-09**: o HTML servido contém
  `<script type="application/ld+json">` com `@type: Article`, título,
  `datePublished`, autor e imagem, e o JSON faz parse.
- **md-0002/AC-10**: cada artigo tem canonical absoluto derivado de
  `SITE_ORIGIN`, e o mapa do site (`/sitemap.xml`) contém a URL de cada
  artigo publicado com `lastModified` igual a `published_at`.
- **md-0002/AC-11**: `pnpm supabase:test` prova que o papel `anon` não lê
  rascunho, e nenhuma rota de API pública contorna a RLS.
- **md-0002/AC-12**: a home e o artigo passam no `@axe-core/playwright` já
  configurado em `e2e/accessibility.spec.ts`, e a navegação por teclado
  funciona com foco visível.

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

- A diferença entre produção e preview precisa de um ramo condicional no
  servidor, e ramo condicional em query é onde costuma nascer brecha.
- Mudança de conteúdo exige revalidação explícita (`revalidatePath` ou
  `revalidateTag`) para aparecer.

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

Sobre o preview (AC-08): ele é tentador de resolver com uma query que aceita
slug de rascunho em qualquer ambiente. Isso seria uma brecha em produção.
A condição de ambiente é checada **antes** da query, em um ponto só, e o teste
correspondente cobre os dois lados — porque um ramo de preview sem teste é uma
porta destrancada esperando o ambiente errado.

## Feature design

**Data model sketch**: esta spec **não cria tabela nova** e **não altera** o
schema definido no `md-0001`. Ela consome a tabela `posts` na forma completa
que o scope, revisão 3, atribui à fatia 1:

| Coluna            | Tipo          | Nulo | Nota                                          |
| ----------------- | ------------- | ---- | --------------------------------------------- |
| `id`              | `uuid`        | não  | PK                                            |
| `slug`            | `text`        | não  | unique, indexado                              |
| `title`           | `text`        | não  | fonte do `<h1>` e do JSON-LD                  |
| `content`         | `text`        | não  | corpo Markdown                                |
| `excerpt`         | `text`        | não  | `description` e resumo do card                |
| `cover_image_url` | `text`        | não  | URL absoluta; capa do card e `og:image`       |
| `editoria`        | `text`        | não  | rótulo do card; texto livre no MVP (ver nota) |
| `author_name`     | `text`        | não  | autor do JSON-LD                              |
| `status`          | `text`        | não  | `rascunho` \| `publicado`                     |
| `published_at`    | `timestamptz` | sim  | ordena, filtra e é o `lastModified`           |
| `updated_at`      | `timestamptz` | não  |                                               |

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

- RLS é a única fronteira de leitura. Nenhuma query duplica
  `status = 'publicado'`.
- Uma página tem exatamente um `<h1>`.
- O corpo do artigo nunca passa por `dangerouslySetInnerHTML`.
- Toda URL absoluta vem de `SITE_ORIGIN`.
- Todo dado sensível do ambiente entra por `lib/env.ts`.

**Security model**:

| Papel          | Lê                                                             | Escreve                   |
| -------------- | -------------------------------------------------------------- | ------------------------- |
| `anon`         | só linhas com `status = 'publicado'` e `published_at <= now()` | não                       |
| `service_role` | tudo, por migration de seed                                    | sim, só em pipeline local |

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
- SEO: o HTML servido traz JSON-LD `Article` parseável, canonical absoluto e o
  `sitemap.xml` traz a URL com `lastModified` igual a `published_at`.
  Verifica **md-0002/AC-09**, **md-0002/AC-10**.
- Autorização: `anon` não lê rascunho, provado por pgTAP. Verifica
  **md-0002/AC-11**.
- Acessibilidade: axe sem violações nas duas páginas. Verifica **md-0002/AC-12**.

## Build plan

1. Ampliar `formatDate` com `timeZone` opcional em `lib/utils/format.ts`,
   default `undefined`, com teste unitário do novo parâmetro.
   Satisfaz **md-0002/AC-02**.
2. Confirmar que a migration de `posts` do `md-0001` tem as dez colunas da
   tabela acima, com RLS e índice de listagem; corrigir a spec do `md-0001` se
   não tiver (ver `## Follow-up`). Satisfaz **md-0002/AC-01**, **md-0002/AC-11**.
3. Criar a camada de leitura: função única que recebe o cliente do servidor e
   devolve artigos publicados já ordenados e limitados, e outra que busca por
   `slug`, com a condição de preview da AC-08 em um único ponto.
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

## Consequences

**Positive**:

- O conteúdo existente no banco vira algo que o leitor e o buscador alcançam.
- Um preview que não é brecha: a diferença entre local e produção tem um teste
  que cobre os dois lados.
- O SEO básico sai junto, então não há URL pública sem canonical depois.
- Nenhuma rota de API nova para auditar.

**Negative / tradeoffs**:

- Publicar passa a exigir `revalidatePath` ou `revalidateTag` para a mudança
  aparecer, e esquecer isso produz conteúdo velho sem erro visível.
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

- [ ] **O `md-0001` está subespecificado em relação ao scope.** O AC-01 do
      `md-0001` declara cinco colunas (`slug`, `title`, `content`,
      `published_at`, `author_id`), mas o scope, revisão 3, atribui à fatia 1
      também autor, editoria, fontes citadas, estado de publicação, data de
      atualização e imagem de capa. Esta spec consome o schema completo do
      scope. Alinhar `md-0001` é decisão do dono: emendar o AC-01 com a
      decisão registrada, ou superseder. Não foi feito aqui porque `md-0001`
      está `Accepted` e mexer no conteúdo de uma spec aceita é ato do
      `/architect` com o dono, não efeito colateral de outra spec.
- [ ] **`fontes citadas`** aparece no escopo da fatia 1 e não é requisito desta
      spec nem tem coluna na tabela acima. Decidir onde a fonte citada é
      renderizada (nota de rodapé, seção final, ou marcação no corpo) é
      trabalho da spec que tratar fontes.
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
- RLS como fronteira única, sem filtro duplicado na aplicação.
- Canonical e JSON-LD no mesmo PR da página, para não publicar URL sem
  endereço definitivo.
