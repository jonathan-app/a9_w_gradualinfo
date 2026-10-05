# md-0001. Adotar Supabase e Markdown para o conteúdo editorial

**Date**: 2026-10-04 (decisão de fundação) · 2026-10-05 (emenda do schema)
**Status**: Accepted (fundação) · schema emendado **Proposed**
**Decision source**: fundação aceita em 2026-10-04. A emenda do schema tem
**direção autorizada** pelo dono em 2026-10-05 (emendar o AC-01, escolhido entre
emendar e superseder), mas o **conteúdo do schema não tem aceite**: ver
`## Portão desta emenda`.

## Summary

O conteúdo editorial do portal não vai morar no repositório como arquivo
Markdown compilado. Ele vai morar em uma tabela do banco, com o texto escrito em
Markdown puro. Quem publica insere a linha direto no banco, por migration
versionada, e não abre pedido de-pull-request de código.

Isto também liquida uma herança: as branches antigas do projeto usavam um
framework de conteúdo compilado, com os artigos em arquivos e publicação por
código. Esse caminho foi revogado.

Para quem está construindo: esta spec entrega a tabela, as regras de acesso e
os testes de banco. Ela **não** entrega página nenhuma — a home e o artigo são
`md-0002`.

## Context

As especificações originais da branch `feat/identidade-portal-gradualinfo` atrelavam
o projeto ao framework Velite, com artigos em MDX versionados no repositório e
publicação por pull-request. Isso mistura conteúdo com código: para publicar
uma correção de texto, alguém com permissão de escrita no código precisa revisar,
e o custo por artigo é o de uma mudança de software.

O gargalo não é teórico. O produto é editorial, com ritmo de publicação
irregular, e o objetivo da primeira jornada é um guia de notebook. Quem escreve
o guia não é quem faz deploy. Um caminho que exige git para publicar não serve
aos dois.

A escolha de banco traz a consequência oposta, e ela precisa ser dita: o
conteúdo passa a viver fora do histórico do git. Versionado, ele é revertível e
comparável; no banco, é a migration que é versionada. Isso é aceitável porque
o conteúdo é gerado e revisado como dado, e o registro de quem mudou o quê passa
a ser a migration, que também tem revisão.

A escolha de Markdown puro, e não de um superconjunto como MDX, é deliberada:
Markdown não executa nada. MDX permite JavaScript dentro do artigo, o que
transforma conteúdo editorial em superfície de execução — um artigo malicioso
vira script rodando no servidor. Markdown puro elimina essa classe de problema
por construção, não por discipline de revisão.

## Requirements

**User stories**:

- Como redator sem permissão de escrita em código, quero publicar um artigo
  inserindo uma migration, para que a publicação não dependa de abrir PR de
  código.
- Como leitor, quero que um rascunho meu seja **invisível** na internet antes de
  eu publicá-lo, para poder trabalhar nele sem medo.
- Como leitor, quero ver as fontes de um artigo, para poder conferir a informação
  em vez de confiar na minha palavra.

**Acceptance criteria**:

- **md-0001/AC-01**: existe migration que cria `posts` com `slug` (único,
  indexado), `title`, `content`, `excerpt`, `cover_image_url`, `editoria`,
  `author_name`, `fontes_citadas`, `status` (`rascunho` | `publicado`),
  `published_at` (anulável) e `updated_at`; `slug` é normalizado para minúsculas;
  `status` e `published_at` têm restrição de coerência, e existe índice de
  listagem por `published_at` descendente com `status` como coluna de apoio.
- **md-0001/AC-02**: `anon` **não** lê linha com `status <> 'publicado'`; e
  **não** lê linha com `status = 'publicado'` e `published_at` nulo ou no futuro.
  Provado por pgTAP, com asserção negativa explícita, não por ausência de erro.
- **md-0001/AC-03**: nenhum papel além de `service_role` insere, altera ou apaga
  linha de `posts`. Provado por pgTAP, incluindo tentativa com `authenticated`.
- **md-0001/AC-04**: o papel de preview lê rascunho **apenas** com a credencial
  de preview, e o papel `anon` continua sem acesso a rascunho mesmo quando a
  credencial de preview está configurada no ambiente. Os dois lados têm asserção.
- **md-0001/AC-05**: `pnpm supabase:test` roda verde em banco limpo, e o
  teste falha se alguém remover uma policy. Existe asserção que prova que
  remover a policy de leitura **quebra** o teste, para que a ausência de policy
  não passe por ausência de conteúdo.
- **md-0001/AC-06**: a migration é forward-only e está em arquivo numerado, com
  reaplicar do zero em banco vazio Produz o mesmo schema que aplicar sobre o
  estado de `main`.
- **md-0001/AC-07**: `md-0002` renderiza as fontes citadas do artigo na página
  de leitura, a partir de `fontes_citadas`, e a ausência de fontes não quebra a
  página.

### Emenda do AC-01 — 2026-10-05

O AC-01 original declarava cinco colunas (`slug`, `title`, `content`,
`published_at`, `author_id`), mas o scope revisão 3 atribui à fatia 1 também
autor, editoria, fontes citadas, estado de publicação, data de atualização e
imagem de capa. A spec `md-0002` consome o schema do scope, então a fatia 2
não era construível com o AC-01 como estava.

**Fonte da emenda**: direção autorizada pelo dono em 2026-10-05 (painel de
decisão da sessão, `/architect`), escolhida entre emendar o AC-01 e superseder
esta spec com uma nova. O status `Accepted` e a data de aceitação original, 2026-10-04,
permanecem válidos para a decisão de fundação: o que mudou foi o alcance do
schema, não a decisão de onde o conteúdo mora.

O **conteúdo** do schema emendado não tem aceite. Ver `## Portão desta emenda`.

Duas mudanças dentro da emenda, ambas com consequência registrada:

- **`author_id` virou `author_name` (texto).** O MVP não tem cadastro nem
  login, então `author_id` não teria tabela de perfis para apontar e ficaria
  órfão. O custo é o nome não acompanhar uma renomeação futura, o que hoje é
  impossível porque não existe tela para renomear. Se o produto ganhar contas,
  isto vira migração para uma tabela de perfis.
- **`fontes_citadas` guarda o dado, e o AC-07 obriga a exibi-lo.** Uma versão
  anterior desta emenda registrava a coluna como "sem renderizador", e isso estava
  errado: coluna guarda o contrato de dados, não entrega transparência ao leitor.
  Guardar sem exibir é meio recurso. O AC-07 amarra as duas pontas, e é ele que
  bloqueia a validação da jornada completa até haver exibição.

## Options considered

### Opção 1: Tabela no Supabase, conteúdo em Markdown (escolhida)

### Opção 2: Arquivos Markdown no repositório, sem framework

### Opção 3: MDX com framework de conteúdo compilado (Velite)

### Opção 4: CMS de terceiros (Sanity, Contentful, Payload)

## Decision

**Chosen option**: Opção 1: Tabela no Supabase, conteúdo em Markdown puro.

**Implementation skills**: `nextjs-supabase-auth`
(`JavaScript-Mastery-Pro/skills`, `.agents/skills/nextjs-supabase-auth/`) ·
`api-security-best-practices` (`JavaScript-Mastery-Pro/skills`,
`.agents/skills/api-security-best-practices/`)

## Rationale

A Opção 3 foi revogada por decisão do dono e está registrada aqui para que
ninguém a reabra por memória vaga: ela mistura publicação editorial com
revisão de código, e o custo por artigo passa a ser o de uma mudança de
software.

A Opção 2 parece mais simples e é exatamente por isso que foi descartada: ela
mantém o gargalo que a decisão queria remover, sem nenhuma das vantagens do
framework. Se o problema é "publicar exige git", a resposta é tirar o conteúdo
do git, não trocar a ferramenta que o git já resolve.

A Opção 4 resolve um problema que o produto decidiu não ter. Painel editorial
custa manutenção contínua — e é operação, não entrega de código. O MVP publica
por migration, que é o custo mais baixo que ainda dá revisão e reversão.

Sobre Markdown e não MDX: a razão é de segurança, não de conveniência. MDX
executa JavaScript dentro do artigo, o que torna conteúdo editorial uma
superfície de execução no servidor. Markdown puro remove a classe inteira do
problema, e o custo — não poder embutir componente reativo dentro do texto — é
irrelevante para artigo de tecnologia, que é texto com imagem e bloco de
código.

## Feature design

**Data model sketch**:

| Coluna            | Tipo          | Nulo | Restrição                                              |
| ----------------- | ------------- | ---- | ------------------------------------------------------ |
| `id`              | `uuid`        | não  | PK, default `gen_random_uuid()`                        |
| `slug`            | `text`        | não  | unique, índice, minúsculas                             |
| `title`           | `text`        | não  | não vazio                                              |
| `content`         | `text`        | não  | corpo Markdown                                         |
| `excerpt`         | `text`        | não  | resumo; vira `description` e card da home              |
| `cover_image_url` | `text`        | não  | URL absoluta                                           |
| `editoria`        | `text`        | não  | texto livre no MVP (ver nota)                          |
| `author_name`     | `text`        | não  | autor do JSON-LD                                       |
| `fontes_citadas`  | `jsonb`       | não  | array de `{ titulo, url }`, default `[]`               |
| `status`          | `text`        | não  | check em (`rascunho`, `publicado`), default `rascunho` |
| `published_at`    | `timestamptz` | sim  | coerente com `status` (ver invariante)                 |
| `updated_at`      | `timestamptz` | não  | default `now()`                                        |

**Invariante de coerência**: `status = 'publicado'` exige `published_at` não
nulo. Um artigo publicado sem data não tem como ser ordenado nem tem
`lastModified`, e o pior efeito é silencioso: ele aparece na home com data de
`now()`. O check impede a linha, em vez de o app adivinhar.

**`fontes_citadas`**: array JSON de `{ titulo, url }`, com `CHECK` de que cada
elemento tem as duas chaves e que `url` é absoluta. Array e não texto livre
porque a fonte precisa ser linkada e conferida, e texto livre não garante
URL. Default `[]` e não nulo porque artigo sem fonte é caso normal e o AC-07
precisa distinguir "sem fontes" de "campo ausente".

**Nota sobre `editoria`**: texto livre no MVP, sem lista fechada. A busca com
recorte por editoria é a fatia 9, e é lá que a taxonomia precisa virar
vocabulário controlado. Fixar cinco valores agora trava um texto que ninguém
definiu. O preço é admitir variante com erro de digitação até a fatia 9.

**RLS e papéis**:

| Papel           | Lê                                                   | Escreve |
| --------------- | ---------------------------------------------------- | ------- |
| `anon`          | `status = 'publicado'` e `published_at <= now()`     | não     |
| `preview`       | o mesmo que `anon`, mais rascunho **com credencial** | não     |
| `authenticated` | igual a `anon` no MVP (sem área logada)              | não     |
| `service_role`  | tudo, por definição: burla a RLS                     | sim     |

**Query de leitura pública**: `posts_select_public`, com
`using (status = 'publicado' and published_at <= now())`. Para o preview,
`posts_select_preview`, que **não** é a mesma policy com um `OR`: é policy
separada, porque policy com `OR` dentro é onde esse tipo de acesso costuma dar
errado, e uma policy por papel é mais fácil de revisar e de revogar.

**Service role**: `service_role` burla a RLS por definição, então nenhum caminho
de leitura pública pode usá-lo. `md-0002` carrega essa proibição como AC, com
verificação automatizada.

**Security model**:

- `posts` tem RLS ligada e policy **por operação**: uma de `select` para `anon`,
  uma de `select` para `preview`, e nenhuma de `insert`/`update`/`delete` para
  papéis não privilegiados.
- `anon` não tem `grant` de escrita. Ausência de policy **e** ausência de grant:
  os dois precisam faltar, porque policy sem grant não impede e grant sem
  policy permite quando a RLS está desligada.
- `fontes_citadas.url` é validada como URL absoluta por `CHECK`, para o JSON-LD
  não injetar `javascript:` no `sameAs`.
- RLS desligada por engano não expõe rascunho **se** o `grant` também faltar: é
  por isso que os dois são testados.

**Configuration required**:

- `SUPABASE_PREVIEW_TOKEN`: segredo da credencial de preview, lido por
  `lib/env.ts`. Sem ela, o preview não existe — falha fechada.

## Critical test scenarios

- Happy path: `anon` lê artigo publicado com `published_at` no passado e recebe
  a linha. Verifica **md-0001/AC-02**.
- Falha: `anon` tenta ler rascunho e recebe zero linhas. Verifica
  **md-0001/AC-02**.
- Falha: `anon` tenta ler artigo `publicado` com `published_at` no futuro e
  recebe zero linhas. Verifica **md-0001/AC-02**.
- Escrita: `anon` e `authenticated` tentam `insert`, `update` e `delete` e
  recebem erro de permissão. Verifica **md-0001/AC-03**.
- Preview: papel `preview` com credencial lê rascunho; o mesmo papel sem
  credencial não lê; `anon` não lê mesmo com a credencial configurada.
  Verifica **md-0001/AC-04**.
- Regressão de segurança: remover a policy de leitura faz o teste **falhar**.
  Verifica **md-0001/AC-05**.
- Integridade: inserir `status = 'publicado'` com `published_at` nulo é
  rejeitado. Verifica **md-0001/AC-01**.
- Jornada: artigo com `fontes_citadas` preenchidas mostra as fontes linkadas na
  página; artigo com `[]` mostra a página sem a seção, sem erro.
  Verifica **md-0001/AC-07**.

## Build plan

1. Migration `posts` com as doze colunas, restrições de coerência, índice de
   listagem e `updated_at`. Satisfaz **md-0001/AC-01**, **md-0001/AC-06**.
2. RLS ligada, `posts_select_public` para `anon`, `posts_select_preview` para o
   papel de preview, e nenhum grant de escrita fora de `service_role`.
   Satisfaz **md-0001/AC-02**, **md-0001/AC-03**, **md-0001/AC-04**.
3. Testes pgTAP de leitura negativa e escrita negada, com asserção de que remover
   a policy quebra o teste. Satisfaz **md-0001/AC-05**.
4. Seed local com um artigo publicado e um rascunho, para as specs seguintes
   terem dado real. Satisfaz **md-0001/AC-01**.

A tarefa 5 é a exibição das fontes, e ela pertence a `md-0002` porque é
apresentação, não contrato de dados: satisfaz **md-0001/AC-07** na página de
leitura.

## Consequences

**Positive**:

- Publicar deixa de exigir pull-request de código.
- Conteúdo editorial não pode executar JavaScript, por construção.
- Rascunho é invisível por padrão, e isso é testado em vez de presumido.
- Fontes citadas viram dado versionado e verificável, não promessa.

**Negative / tradeoffs**:

- O conteúdo sai do histórico do git; o registro de mudança passa a ser a
  migration.
- `author_name` é dado duplicado, e vira migração se o produto ganhar contas.
- `editoria` é texto livre até a fatia 9, e pode ter variante com erro de
  digitação.
- Duas policies de leitura (`anon` e `preview`) são mais superfície que uma,
  e é o preço de um preview que não vaza.

**Neutral**:

- `react-markdown` e `remark-gfm` já estavam instalados.
- Nenhuma rota de API é criada por esta spec.

## Portão desta emenda

O **conteúdo** desta emenda (as doze colunas, as duas policies, o papel de
preview, o formato de `fontes_citadas`) **não tem aceite**. Foi autorizado
emendar o AC-01 em vez de superseder, o que é decisão sobre _como_ registrar a
mudança, não aprovação do * quê* mudou.

Antes do `/develop`:

1. o dono revisa e aprova explicitamente o conteúdo da emenda; e
2. a decisão é registrada no cabeçalho, com data e fonte.

Enquanto isso, o status desta parte é `Proposed`, e `/develop` deve voltar ao
`/architect`.

## Follow-up

- [ ] **Apresentação das fontes citadas é AC-07 e trava a jornada.** O formato
      de exibição (seção final, nota de rodapé, ou marcação no corpo) não está
      decidido, e o AC exige exibição. A fatia 7 (primeira jornada, guia do
      notebook) **não pode ser validada** antes de essa exibição existir, porque
      um guia que promete fontes e não as mostra é exatamente o que o AC-07
      existe para impedir.
- [ ] **`editoria` sem lista fechada** até a fatia 9, por decisão registrada em
      `md-0002` (`## Follow-up`).
- [ ] **A rota `/artigos/[slug]` é do `md-0002`**, não desta spec. O AC-02
      original desta spec (renderizar a rota) foi movido para lá em 2026-10-05,
      para que esta spec tenha um dono só: o schema.

## References

**Project sources**:

- `AGENTS.md` — RLS em toda tabela nova, com policy por operação.
- `docs/scope/0001-mvp-portal-gradualinfo.md` revisão 3 — a definição da fatia 1.
- `docs/specs/md-0002-casca-editorial-home.md` — consome este schema.
- `docs/specs/INDICE.md` — mapa de IDs e supersessão.
- `supabase/config.toml` — o stack local e o `pgTAP`.

**Practices & standards**:

- RLS ligada com policy por operação, e `grant` explícito: policy sem grant não
  impede, e grant sem policy permite se a RLS for desligada por engano.
- `service_role` nunca em caminho de leitura pública.
- Conteúdo como dado versionado por migration, não por git.

**Nesta spec, o que foi revogado**:

- `feat/identidade-portal-gradualinfo`:`0002-mvp-portal-gradualinfo.md` — a
  decisão de fluxo editorial por PR, MDX/Velite e `.velite/generated` está
  revogada. O template `/template-aqua` permanece como **referência visual**,
  nunca como base de conteúdo.
