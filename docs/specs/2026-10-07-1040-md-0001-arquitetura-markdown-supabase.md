# md-0001. Adotar Supabase e Markdown para o conteúdo editorial

**Date**: 2026-10-04 (decisão de fundação) · 2026-10-05 (emenda do schema)
**Status**: Accepted
**Decision source**:

- **Fundação** (Supabase + Markdown, rota `/artigos/[slug]`, sem painel
  editorial): aceita em 2026-10-04.
- **Conteúdo do schema emendado** (as doze colunas, a segunda policy de leitura,
  o formato de `fontes_citadas` e as sete ACs então existentes): aprovado
  **explicitamente** pelo dono em 2026-10-05, com a lista de colunas e de
  policies enunciada na pergunta de aprovação e o "aprove o conteúdo" dado como
  resposta. Não é aceite por consequência nem por silêncio: a aprovação cobriu o
  conteúdo, coluna a coluna.
- **Três ajustes posteriores a esse aceite, registrados porque mudam o que foi
  aprovado, e nenhum deles é descrito aqui:** (a) o "papel `preview`" da aprovação
  **não existe** no Supabase e foi substituído por `authenticated` com claim
  `app_metadata.preview` (ver `## Preview`); (b) o `CHECK` de `published_at` foi
  **retirado**, porque recusar linha é diferente de esconder linha, e o dono
  pediu que artigo agendado exista invisível; (c) as ACs passaram de sete para
  **oito**, com a AC-08 para o stack local, que não existia quando a aprovação
  foi dada. Os três mudam a execução, e nenhum reabre uma decisão editorial já
  fechada — mas são registrados porque aprovação sem registro do que mudou depois
  é aprovação que ninguém consegue auditar depois de seis meses.
- **Correção de base factual, 2026-10-05, sem novo aceite:** a aprovação acima
  foi dada sobre a premissa de que a tabela **não existia**. Ela existe desde
  2026-10-04 (`supabase/migrations/20261004000000_posts_exemplo.sql`), como
  tabela de exemplo, e a forma correta desta spec é **transformá-la**, não criá-la
  do zero. Isso muda o trabalho, não a decisão: as colunas e as policies
  aprovadas continuam válidas, mas seis delas precisam de `alter table` em vez de
  `create table`, e duas decisões da tabela existente estão em conflito com o
  aprovado (ver `## Conflitos com o que já existe`).
- **Exibição das fontes citadas**: seção final, lista de links, decideda pelo
  dono em 2026-10-05. A exibição é executada pelo `md-0002` (AC-13), porque
  apresentação é página, não schema.
- **Manter o valor `arquivado` em `status`**: decidido pelo dono em 2026-10-05,
  depois de saber que a tabela já tinha os três valores. Registrado porque muda a
  migration, e porque a aprovação original listava dois.

## Summary

O conteúdo editorial do portal não vai morar no repositório como arquivo
Markdown compilado. Ele vai morar em uma tabela do banco, com o texto escrito em
Markdown puro. Quem publica insere a linha direto no banco, por migration
versionada, e não abre pedido de-pull-request de código.

Isto também liquida uma herança: as branches antigas do projeto usavam um
framework de conteúdo compilado, com os artigos em arquivos e publicação por
código. Esse caminho foi revogado.

Para quem está construindo: esta spec **transforma** uma tabela de exemplo que já
existe em `main` no schema editorial real, fecha as regras de acesso e conserta
os testes de banco, que nunca chegaram a rodar. Ela **não** entrega página
nenhuma — a home e o artigo são `md-0002`.

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
- **md-0001/AC-04**: o acesso **efetivo** de cada papel da matriz de
  `## Security model` é provado por leitura real com `set local role`: `anon` e
  `authenticated`-sem-claim leem só publicados no passado; `authenticated` com
  `app_metadata.preview = 'true'` lê rascunho e agendado; e um claim em
  `user_metadata` **não** concede leitura de rascunho. Cada papel tem asserção
  própria, com contagem exata de linhas — existir a policy no catálogo não basta.
- **md-0001/AC-08**: `pnpm supabase:reset` conclui sem erro e
  `pnpm supabase:test` roda verde. Hoje os dois falham: a migration
  `00000000000000_init.sql` é pulada pela CLI por usar o nome reservado `init`,
  o seed quebra em `public.profiles`, e a suíte pgTAP **nunca executou**.
  Evidência em `docs/reviews/2026-10-05-0848-2026-10-05-bloqueio-stack-local.md`.
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

## Conflitos com o que já existe

A tabela `posts` de 2026-10-04 é rotulada como exemplo no próprio catálogo
(`comment on table` diz "Conteúdo de exemplo"). Seis itens do schema aprovado
coincidem com ela, e **seis estão em conflito**. A tabela itemiza o conflito
para que a decisão de cada linha seja rastreável, porque "alterar ou remover" é
escolha de dono e não detalhe de migration.

| #   | Existe em `main`                                                               | Schema aprovado                    | Resolução                             | Quem decide          |
| --- | ------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------- | -------------------- |
| 1   | `author_id uuid references auth.users`                                         | `author_name text`                 | remover a coluna e a FK               | aprovado             |
| 2   | `status` com `arquivado`                                                       | `rascunho`, `publicado`            | **manter os três valores** (decidido) | **dono, 2026-10-05** |
| 3   | `excerpt`, `content` nuláveis                                                  | `not null`                         | endurecer com `alter table`           | aprovado             |
| 4   | `created_at timestamptz`                                                       | não listado                        | **manter** (tem uso e índice)         | **dono**             |
| 5   | policies `*_own` para `authenticated`                                          | sem escrita fora de `service_role` | remover                               | aprovado             |
| 6   | `posts_select_own`, `posts_insert_own`, `posts_update_own`, `posts_delete_own` | mesmo de 5                         | remover as quatro                     | aprovado             |

Os dois itens marcados como **dono** existem porque a aprovação veio com base
falsa, e nenhum dos dois é óbvio:

- **`arquivado`: mantido, por decisão do dono em 2026-10-05.** A tabela existente
  tem o terceiro valor, tem `COMMENT` explicando, e tem asserção de que `anon` não
  lê. Removê-lo seria perder capacidade já testada, e artigo arquivado é o caso
  real de "publiquei e preciso tirar do ar sem apagar" — que é diferente de
  "nunca publiquei". A distinção importa editorialmente, e o custo de manter é
  zero. O schema aprovado tinha dois valores porque eu descrevi a tabela como não
  existindo, o que foi erro meu de premissa.
- **`created_at`: mantido, por default defensável.** Não estava na lista aprovada,
  mas já existe, está no índice `(status, created_at desc)` e é o campo mais útil
  para depurar uma linha. Adicionar coluna é barato; remover exige reescrever
  índice. **Se você quiser removê-la, é uma linha de migration e uma de índice** —
  mas a spec assume que fica.

### O que existe e é bom, e não deve ser refeito

- `posts_select_public` com
  `status = 'publicado' and published_at is not null and published_at <= now()`.
  Esta cláusula **já resolve agendamento** e deve ser preservada.
- `is_post_public` como predicado `SECURITY DEFINER` com `set search_path = ''`,
  `revoke all ... from public` e `grant execute` explícito.
- Trigger de `updated_at` em toda escrita.
- `COMMENT` em tabela, coluna e função: o catálogo é a documentação, e a regra de
  visibilidade já está escrita em português.

## Feature design

**Data model sketch**:

| Coluna            | Tipo          | Nulo | Restrição                                                           |
| ----------------- | ------------- | ---- | ------------------------------------------------------------------- |
| `id`              | `uuid`        | não  | PK, default `gen_random_uuid()`                                     |
| `slug`            | `text`        | não  | unique, índice, minúsculas                                          |
| `title`           | `text`        | não  | não vazio                                                           |
| `content`         | `text`        | não  | corpo Markdown                                                      |
| `excerpt`         | `text`        | não  | resumo; vira `description` e card da home                           |
| `cover_image_url` | `text`        | não  | URL absoluta                                                        |
| `editoria`        | `text`        | não  | texto livre no MVP (ver nota)                                       |
| `author_name`     | `text`        | não  | autor do JSON-LD                                                    |
| `fontes_citadas`  | `jsonb`       | não  | array de `{ titulo, url }`, default `[]`                            |
| `status`          | `text`        | não  | check em (`rascunho`, `publicado`, `arquivado`), default `rascunho` |
| `published_at`    | `timestamptz` | sim  | coerente com `status` (ver invariante)                              |
| `updated_at`      | `timestamptz` | não  | default `now()`                                                     |

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

### Preview: credencial não é papel, e esta é a parte que exige desenho

**Emenda autorizada em 2026-10-07**: entrada, identidade, prazo e logout
seguem `0003-preview-autorizacao.md`, Accepted pelo sinal verde do dono.
O segredo é trocado via POST e não fica em cookie; sessão Supabase e
autorização assinada ficam em cookies HttpOnly. O fluxo abaixo é histórico
e é especializado por esse contrato.

Uma versão anterior desta spec escrevia "papel `preview`" e tratava
`SUPABASE_PREVIEW_TOKEN` como se a variável criasse o papel. **Não cria.** No
Supabase os papéis do Postgres são `anon`, `authenticated`, `service_role` e os
`supabase_admin`; nenhum papel `preview` existe, e nenhuma variável de ambiente
registra papel. A spec precisa dizer como a credencial é validada e como a
consulta assume identidade autorizada, sem que o segredo apareça no cliente.

O desenho escolhido usa **`authenticated` com claim**, que é nativo do Supabase,
não exige papel novo nem cliente de banco novo, e — o ponto que decide — permite
**testar o acesso efetivo do papel** com o mesmo mecanismo que o repositório já
usa (`set local role` + `set local request.jwt.claims`).

**Fluxo, passo a passo:**

1. O leitor informa o token por um formulário no servidor. O token vai para um
   cookie **`HttpOnly`**, e **nunca** em query string: query string entra em log
   de acesso, em `Referer` e em histórico, o que transforma o segredo em
   vazamento diferido.
2. O servidor compara o valor com `SUPABASE_PREVIEW_TOKEN` em **tempo
   constante** (`timingSafeEqual`). Comparar com `===` vaza informação pelo
   tempo de resposta, e a diferença é medível.
3. Havendo igualdade, o servidor autentica o **usuário de preview** e a sessão
   passa a valer nos pedidos seguintes. O segredo não vira token: ele **troca**
   por uma sessão do Supabase, que é o que o RLS entende.
4. A policy `posts_select_preview` é `for select to authenticated`, com
   `using ((select auth.jwt() -> 'app_metadata' ->> 'preview') = 'true')`.
   `app_metadata`, e **nunca** `user_metadata`: `user_metadata` é gravável pelo
   próprio usuário, então usá-la daria a qualquer um o privilégio de ver
   rascunho editando o próprio perfil. `app_metadata` só o `service_role`
   escreve.
5. Sem `SUPABASE_PREVIEW_TOKEN` configurada, o preview **não existe**: o passo 2
   não tem contra o que comparar e a rota falha fechada. Não existe caminho
   "sem token = preview liberado".

**Por que esta opção e não as outras duas:**

| Opção                                              | Mecanismo                                  | Por que não                                                                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service_role` no caminho de preview               | Cliente privilegiado, token só como guarda | `service_role` **burla a RLS**, então o filtro passa a ser só o código — e não há papel para testar. Um bug nesse caminho vaza tudo, e o teste de acesso efetivo que a spec exige não tem onde rodar. |
| Papel Postgres `preview` com senha própria         | Conectar pelo pooler com `pg`              | RLS continua mandando, o que é bom, mas exige **dependência nova** (`pg` não está instalado) e **um segundo segredo de banco** para gerenciar. Custo alto para um preview.                            |
| **`authenticated` + claim `app_metadata.preview`** | Nativo, sem role nova                      | **Escolhida.** Sem dependência nova, sem segredo novo, RLS continua sendo a fronteira e o acesso efetivo do papel é testável com `set local role authenticated` + `request.jwt.claims`.               |

O custo aceito: o preview depende de existir um usuário de preview em
`auth.users`, com `app_metadata.preview = true`. Isso é configuração, não código,
e o seed local já cria usuários — então é setup, não obstáculo. E é por isso que a
policy é separada em vez de um `OR`: policy com `OR` dentro é mais difícil de
revisar, e aqui a diferença entre "vê rascunho" e "não vê" é a coisa mais
importante da tabela.

**RLS e papéis**:

| Papel                                                   | Lê                                               | Escreve |
| ------------------------------------------------------- | ------------------------------------------------ | ------- |
| `anon`                                                  | `status = 'publicado'` e `published_at <= now()` | não     |
| `authenticated` **sem** claim de preview                | o mesmo que `anon`                               | não     |
| `authenticated` **com** `app_metadata.preview = 'true'` | tudo, inclusive rascunho e agendado              | não     |
| `service_role`                                          | tudo, por definição: burla a RLS                 | sim     |

**Agendamento**: artigo com `published_at` no futuro **existe** e fica invisível
ao público, e essa semântica já está na policy existente e deve ser preservada.
Não há `CHECK` exigindo `published_at` quando `status = 'publicado'`: a
invisibilidade é dada pela policy, e o `CHECK` foi retirado desta spec porque
recusaria a linha em vez de escondê-la — e esconder é o que o dono pediu.

**Service role**: `service_role` burla a RLS por definição, então nenhum caminho
de leitura pública pode usá-lo — nem o caminho de preview, que é justamente onde
a tentação aparece, por ser o único caminho que precisa de mais do que a policy
dá. `md-0002` carrega essa proibição como AC, com verificação automatizada.

**Security model**:

- `posts` tem RLS ligada e policy **por operação**: `select` para `anon`, `select`
  para `authenticated` com claim de preview, e nenhuma de
  `insert`/`update`/`delete` para papéis não privilegiados.
- Nenhum papel não privilegiado tem `grant` de escrita. Ausência de policy **e**
  ausência de grant: os dois precisam faltar, porque policy sem grant não impede
  e grant sem policy permite quando a RLS está desligada por engano.
- `fontes_citadas.url` é validada como URL absoluta por `CHECK`, para o JSON-LD
  não injetar `javascript:` no `sameAs`.
- RLS desligada por engano não expõe rascunho **se** o `grant` também faltar: é
  por isso que os dois são testados.

### Policy separada não é isolamento, e a diferença é testada

Duas policies separadas descrevem **intenção**. Isolamento é **comportamento
observado**, e as duas coisas divergem com frequência: uma policy pode existir
com o predicado errado, o `grant` pode vir por tabela padrão, o `search_path`
pode resolver nome em outro schema, ou o papel pode ter `bypassrls`.

Por isso a exigência é outra: para **cada papel**, um teste que assume o papel
com `set local role` e **lê de verdade**, affirmando a contagem exata de linhas
visíveis. Não basta afirmar que a policy existe no catálogo, e não basta afirmar
que a policy não deixa passar — o teste tem que mostrar a **leitura efetiva**.

Os papéis que precisam de asserção própria, e não herdada:

| Papel                                        | Deve ler                                 | Deve **não** ler                             |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `anon`                                       | publicados com `published_at` no passado | rascunho, arquivado, agendado                |
| `authenticated` sem claim                    | o mesmo que `anon`                       | rascunho, arquivado, agendado                |
| `authenticated` **com** claim de preview     | inclusive rascunho e agendado            | —                                            |
| `authenticated` com claim em `user_metadata` | o mesmo que `anon`                       | rascunho (**a armadilha do `app_metadata`**) |
| `service_role`                               | tudo, por definição                      | —                                            |

A quarta linha é a que mais importa e a que a implementação erra primeiro: um
claim em `user_metadata` **passa** o teste de quem só escreve o policy e **falha**
este. Como `user_metadata` é gravável pelo próprio usuário, transformá-lo em
privilegio de leitura é uma escalada de privilégio que o usuário executa sozinho,
no próprio perfil, sem tocar em código.

`anon` e `authenticated`-sem-claim precisam da **mesma** asserção, e é
deliberado: é a prova de que existir uma policy de preview **não** alarga
`anon` por efeito colateral. Uma policy nova que não estreita nenhuma outra é o
comportamento correto, e a asserção cruzada é o que transforma isso em fato
verificado.

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
- Preview: `set local role authenticated` **sem** claim não lê rascunho; **com**
  `app_metadata.preview = 'true'` lê rascunho; e `anon` não lê rascunho mesmo com
  o usuário de preview existindo. Verifica **md-0001/AC-04**.
- Escalada: claim em `user_metadata` em vez de `app_metadata` **não** concede
  leitura de rascunho. Verifica **md-0001/AC-04**.
- Agendamento: artigo `publicado` com `published_at` no futuro **existe** na
  tabela e é lido por quem tem privilégio, mas **não** é lido por `anon`.
  Verifica **md-0001/AC-02**.
- Stack: `pnpm supabase:reset` conclui sem erro e `pnpm supabase:test` roda
  verde. Verifica **md-0001/AC-08**.
- Integridade: inserir `fontes_citadas` com `url` relativa é rejeitado, e
  `cover_image_url` vazio é rejeitado. Verifica **md-0001/AC-01**. (O `CHECK` de
  `published_at` não é testado aqui porque não existe mais: a invisibilidade do
  agendado é da policy, e é testada no cenário de agendamento.)
- Regressão de segurança: remover `posts_select_public` faz a suíte **falhar**.
  Verifica **md-0001/AC-05**.
- Reprodutibilidade: `pnpm supabase:reset` em banco vazio termina com o mesmo
  schema que aplicar a migration sobre o estado de `main`, verificado por
  comparação de `pg_dump --schema-only`. Verifica **md-0001/AC-06**.
- Jornada: artigo com `fontes_citadas` preenchidas mostra as fontes linkadas na
  página; artigo com `[]` mostra a página sem a seção, sem erro.
  Verifica **md-0001/AC-07**.

## Build plan

A tarefa 0 vem primeiro porque nenhuma das outras é verificável sem ela: o AC de
prova do schema é a suíte pgTAP verde, e a suíte hoje nem chega a rodar.

0. **Consertar o stack local.** Renomear `00000000000000_init.sql` para um
   timestamp real, para a CLI aplicar `profiles` e o trigger de signup; corrigir
   a asserção de contagem do teste ou semear os posts que ela espera; e registrar
   o resultado real de `pnpm supabase:test`, reprovação inclusive.
   Satisfaz **md-0001/AC-08**.
1. **Migration de transformação** de `posts` de exemplo no schema editorial:
   adicionar `cover_image_url`, `editoria` e `fontes_citadas`; endurecer
   `excerpt` e `content` para `not null`; remover `author_id` e a FK em
   `auth.users`; e adicionar `author_name`. Preservar `created_at`, os índices,
   o trigger de `updated_at` e todos os `COMMENT`.
   Satisfaz **md-0001/AC-01**, **md-0001/AC-06**.
2. **Policies**: remover as quatro `*_own` de escrita, manter
   `posts_select_public` como está, e adicionar `posts_select_preview` para
   `authenticated` com claim em `app_metadata`. Garantir ausência de `grant` de
   escrita fora de `service_role`.
   Satisfaz **md-0001/AC-02**, **md-0001/AC-03**, **md-0001/AC-04**.
3. **Testes pgTAP**: acesso efetivo por papel com `set local role`, incluindo a
   escalada por `user_metadata`; agendamento presente e invisível; escrita negada;
   e a asserção de que remover a policy de leitura **quebra** a suíte.
   Satisfaz **md-0001/AC-05**, **md-0001/AC-04**.
4. **Dados de validação em `supabase/seed.sql`, nunca em migration.** Um artigo
   publicado, um rascunho, um arquivado e um agendado para o futuro, para as specs
   seguintes terem dado real. Migration que insere conteúdo publica artigo
   fictício no deploy.
   Satisfaz **md-0001/AC-01**, **md-0001/AC-02**.
5. **Incluir `supabase:test` na CI** em job próprio, porque nem `check:all` nem os
   três jobs atuais tocam em banco, e um stack que não sobe não reprova nada.
   Satisfaz **md-0001/AC-08**.

A tarefa 6 é a exibição das fontes, e ela pertence a `md-0002` porque é
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

## Portão desta emenda — resolvido

Uma anotação anterior desta spec dizia que o conteúdo da emenda não tinha
aceite, e estava certo na época: o que fora autorizado era **emendar** o AC-01
em vez de superseder, que é decisão sobre _como_ registrar a mudança, não
aprovação do _quê_ mudou.

O conteúdo foi aprovado explicitamente pelo dono em 2026-10-05, coluna a coluna
e policy a policy, e a aprovação está no `Decision source` do cabeçalho.

Vale registrar o que quase aconteceu: uma resposta anterior, que falava sobre a
**ordem do fluxo** de trabalho, foi convertida em aceite de conteúdo. Ordem de
fluxo não é aprovação de spec. `md-0002` sofreu o mesmo deslize na mesma
ocasião e voltou para `Proposed`.

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
- `docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md` revisão 3 — a definição da fatia 1.
- `docs/specs/2026-10-07-1350-md-0002-casca-editorial-home.md` — consome este schema.
- `docs/specs/2026-10-08-2228-INDICE.md` — mapa de IDs e supersessão.
- `supabase/config.toml` — o stack local e o `pgTAP`.

**Practices & standards**:

- RLS ligada com policy por operação, e `grant` explícito: policy sem grant não
  impede, e grant sem policy permite se a RLS for desligada por engano.
- `service_role` nunca em caminho de leitura pública.
- Conteúdo como dado versionado por migration, não por git.

**Nesta spec, o que foi revogado**:

- `feat/identidade-portal-gradualinfo`:`0002-mvp-portal-gradualinfo.md` — a
  decisão de fluxo editorial por PR, MDX/Velite e `.velite/generated` está
  revogada. O template `/referencias/template-editorial` permanece como
  **referência visual**, nunca como base de conteúdo.
