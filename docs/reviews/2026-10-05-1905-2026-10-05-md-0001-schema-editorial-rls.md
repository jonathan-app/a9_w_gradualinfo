# md-0001, tarefas 1 a 5 — transformação do schema, RLS e acesso por papel

Data: 2026-10-05. Clone `a9_w_gradualinfo__iso`, branch
`chore/reconciliar-scope-spec-gates`. Estado anterior: tarefa 0 verificada,
identidade preparada, `PASS 15/15`. Estado final: **`PASS 63/63`**.

Duas migrations novas, uma suíte reescrita, o `seed` ajustado. Nada foi commitado.

## 1. O que foi escrito

| Arquivo                                                         | Papel                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `supabase/migrations/20261005000000_posts_schema_editorial.sql` | tarefa 1: transforma a tabela de exemplo no schema editorial                 |
| `supabase/migrations/20261005000001_posts_rls_preview.sql`      | tarefa 2: fecha escrita e abre a leitura de preview                          |
| `supabase/tests/rls_posts_test.sql`                             | tarefa 3: reescrita, 15 → **63 asserções**                                   |
| `supabase/seed.sql`                                             | tarefa 4: as mesmas quatro fixtures, agora preenchendo as colunas `not null` |

### A ordem dentro da transformation, e por que ela é essa

`alter table` em cinco tempos: coluna nulável → backfill → endurecer → CHECK →
`COMMENT`. A ordem não é estilo. Uma coluna nova declarada `not null` em tabela
que já tem linhas falha **no meio** da migration, e o banco fica num estado que
ninguém consegue descrever; a migration seguinte não roda, a pilha de migrations
para, e o erro aponta para a coluna errada. Coluna nulável primeiro e
endurecimento depois faz a migration ser executável nos dois casos: banco vazio
(reset) e banco com o estado de `main`.

**O backfill não inventa conteúdo editorial.** `excerpt` e `content` nulos viram
string vazia; título em branco vira "Sem título"; `author_name` vira "GradualInfo
Editorial"; `editoria` vira "sem-editoria", que declara o fato em vez de inventar
classificação; `cover_image_url` vira a raiz do domínio, que é uma URL absoluta
verdadeira. `slug` em maiúsculas é reescrito em minúsculas — se isso colidir com
um slug existente a migration **falha**, em vez de escolher um dos dois em
silêncio.

**`created_at` ficou.** Ela está no índice `(status, created_at desc)` e é o campo
mais útil para depurar uma linha; remover exigiria reescrever o índice. Decisão
registrada no `md-0001` como sendo do dono, e mantida aqui sem re-decidir.

**`CHECK` não aceita subconsulta.** A validação de `fontes_citadas` precisa
percorrer o array, então ela vive numa função `immutable` — `fontes_citadas_validas(jsonb)` —
chamada pelo `CHECK`. A função tem `set search_path = ''` e **não** é
`SECURITY DEFINER`: é validador de forma, não autorização.

**A dependência que ninguém previa:** as quatro policies `*_own` citam
`author_id`, e **qualquer** delas impede o `drop column`. A primeira execução da
migration falhou com

```
ERROR: cannot drop column author_id of table posts because other objects depend on it
  policy posts_insert_own on table posts depends on column author_id of table posts
```

As quatro saem na migration do schema, por dependência de catálogo, e não por
escolha. A RLS em si, a policy pública e os `grant` são trabalho da migration
seguinte.

### Grants: a segunda porta (apenas escrita)

O estado anterior era o pior dos dois: `anon` e `authenticated` tinham `INSERT`,
`UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` em `posts` por default
privilege do Supabase, e as policies `*_own` só seguravam o caminho da RLS. Bastava
um `alter table ... disable row level security` acidental — ou um `service_role`
usado por engano no lugar de `authenticated` — para a tabela ficar aberta.
**Importante:** o `revoke all` seguido de `grant select` **fecha a porta de escrita**
(INSERT, UPDATE, DELETE, TRUNCATE), mas **não protege leitura se a RLS for
desativada**: com `grant select` concedido e RLS desligada, `anon` e
`authenticated` leem a tabela inteira, incluindo rascunhos, arquivados e
agendados. A proteção de leitura **é a RLS**; o `grant` aqui serve para negar
escrita a papéis não privilegiados, que é o que o `md-0001` exige no AC-03.

| Papel           | Antes (7 privilégios)                                         | Depois (após revoke + grant select)             |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `anon`          | INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT | **SELECT**                                      |
| `authenticated` | INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT | **SELECT**                                      |
| `service_role`  | todos                                                         | todos — é o caminho de publicação por migration |

`public` (o pseudo-papel de todos) foi deixado intacto de propósito: no Supabase o
`service_role` pode herdar o que tem de `PUBLIC`, e revogar sem re-verificar
quebraria o caminho de publicação sem nenhuma policy envolvida. A asserção que
protege esse ponto é a que afirma que `service_role` mantém escrita.

**Correção registrada:** a afirmação anterior "RLS desligada por engano não expõe
rascunho se o grant também faltar" era incorreta neste schema, porque o
`grant select` está presente. A proteção de leitura é a RLS, e o `grant` protege
escrita. Se o risco de RLS desligada for cenário a mitigar, a estratégia seria
não conceder `select` a `anon`/`authenticated` e usar apenas policies — mas isso
exigiria `SECURITY DEFINER` functions para leitura pública, o que muda o modelo
de acesso e não foi aprovado.

## 2. O que as 63 asserções provam

| Bloco                                          | Quantidade | O que fixa                                                                                                                                              |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Fixtures e infraestrutura                   | 3          | o seed existe; RLS não passa por vacuidade                                                                                                              |
| B. Schema e preservação                        | 13         | 4 colunas novas, `author_id` fora, 6 `not null`, 7 preservadas, 3 índices antigos, trigger de `updated_at`, 9 `COMMENT`                                 |
| C. Constraints                                 | 9          | slug maiúsculo, título em branco, capa vazia e relativa, fonte relativa, fonte sem `titulo`, status inválido — e o caso válido aceito                   |
| D. Grants                                      | 6          | nenhum papel não privilegiado escreve; `service_role` escreve                                                                                           |
| E. Policies                                    | 4          | preview só para `authenticated`, cita `app_metadata` e **nunca** `user_metadata`, pública preservada, zero policy de escrita                            |
| F. `anon`                                      | 8          | vê 1, não vê rascunho/agendado/arquivado, três escritas bloqueadas **por privilégio**                                                                   |
| G. `authenticated` sem claim                   | 5          | vê exatamente o que o `anon` vê, três escritas bloqueadas                                                                                               |
| H. `authenticated` com `app_metadata.preview`  | 6          | lê 4, lê rascunho, lê agendado, lê arquivado — e não escreve                                                                                            |
| I. `authenticated` com `user_metadata.preview` | 2          | vê 1, **não** lê rascunho                                                                                                                               |
| J. `service_role`                              | 1          | lê 4                                                                                                                                                    |
| K. `is_post_public` e `search_path`            | 6          | predicado correto, `SECURITY DEFINER`, `search_path` vazio, sem `EXECUTE` ao `PUBLIC`, e nenhuma `SECURITY DEFINER` de `public` sem `search_path` vazio |

Duas mudanças de fundo na suíte, que valem mais que a contagem:

**Escrita passou a ser erro, não silêncio.** A versão anterior afirmava que o
`UPDATE` e o `DELETE` anônimos "não escreviam" contando linhas — mas RLS não
levanta erro em `UPDATE` nem `DELETE`: linhas que falham no `USING` são
silenciosamente ignoradas, e o teste passava com uma escrita que talvez tivesse
sido aceita. Com o `grant` removido, o mesmo comando dá `42501 permission denied
for table posts`, e é isso que a asserção passa a exigir. Os dois bloqueios
existem de propósito, e cada um tem asserção própria.

**A armadilha do `user_metadata` tem duas asserções, não uma.** Uma no catálogo
(a policy de preview não pode citar `user_metadata`) e uma de leitura efetiva (o
papel com claim em `user_metadata` vê 1 linha e não vê rascunho). A primeira pega
a policy escrita errado; a segunda pega o vazamento que sobrevive mesmo com a
policy certa.

## 3. Prova de que a suíte falha quando deveria

Duas sabotagens, feitas no banco e revertidas em seguida. Nenhum arquivo
versionado foi tocado.

| Sabotagem                                                      | Resultado      | Falhas                                                                                                                                                                 |
| -------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remover `posts_select_public`                                  | **FAIL 5/63**  | teste 33 (policy pública preservada), 35 (zero policy de escrita — o catálogo inteiro muda), 41 (anon vê 0 em vez de 1), 43 (anon não lê rascunho vira verdadeiro), 54 |
| Trocar `app_metadata` por `user_metadata` na policy de preview | **FAIL 7/63**  | teste 32 (citação de `app_metadata`), 48–51 (preview deixa de ler), 54–55 (**`user_metadata` passa a abrir rascunho**)                                                 |
| Estado restaurado                                              | **PASS 63/63** | —                                                                                                                                                                      |

A segunda é a que interessa: ela simula exatamente o erro que o `md-0001` diz que
a implementação erra primeiro, e a suíte o pega com nome e número.

## 4. AC-06 — mesmo schema nos dois caminhos

Comparação por `pg_dump --schema-only` (8992 linhas nos dois):

| Caminho | Como foi feito                                                                 | Linhas de schema |
| ------- | ------------------------------------------------------------------------------ | ---------------- |
| A       | quatro migrations em banco novo, pelo `supabase db reset`                      | 8992             |
| B       | só as migrations 1 e 2, com **linhas legadas**, e então as duas transformações | 8992             |

**Idênticos.** O caminho B tinha 3 linhas plantadas com `slug` em maiúsculas,
`excerpt` e `content` nulos, título em branco, uma publicada, uma arquivada e um
rascunho — que sobreviveram à transformação com o backfill aplicado:

```
backfill: slug=slug-legado | titulo=Artigo legado com slug em maiúsculas e campos nulos | autor=GradualInfo Editorial | editoria=sem-editoria | capa=https://gradualinfo.com.br/
backfill: slug=legado-arquivado | titulo=Artigo legado arquivado | ... | capa=https://gradualinfo.com.br/
backfill: slug=    | titulo=Sem título | autor=GradualInfo Editorial | editoria=sem-editoria | capa=https://gradualinfo.com.br/
excerpt/content nulos = 0
policies = posts_select_preview,posts_select_public
service_role com escrita = t
```

Uma correção de método no caminho: a primeira tentativa derrubou e recriou o
schema `public` para montar o estado de `main`, e a comparação divergiu — o
`create schema` muda o dono do schema, o `REVOKE USAGE` implícito e apaga as
permissões default que a CLI instala. Aquilo media o ambiente, não as migrations.
Os dois caminhos rodaram dentro do mesmo ambiente provisionado; para o caminho B as
duas migrations novas foram retiradas da pasta, o `reset` rodou só com 1 e 2, as
linhas legadas foram plantadas e as transformações aplicadas por `psql -f`.

## 5. As quatro fixtures continuam

Mesmos quatro estados, agora preenchendo as colunas novas, porque a transformação
endureceu `excerpt`, `content`, `author_name`, `editoria` e `cover_image_url`:

| Slug                | `status`  | `published_at` | `fontes_citadas` |
| ------------------- | --------- | -------------- | ---------------- |
| `fixture-publicado` | publicado | ontem          | 1 fonte real     |
| `fixture-rascunho`  | rascunho  | nulo           | `[]`             |
| `fixture-arquivado` | arquivado | ontem          | `[]`             |
| `fixture-agendado`  | publicado | 2126           | `[]`             |

O publicado é o único com fonte, de propósito: é a linha que a `md-0002` vai
renderizar, e o AC-07 não pode passar por vacuidade. A capa é
`https://gradualinfo.com.br/exemplo-capa.jpg`, que **não existe** — é um
placeholder que satisfaz o `CHECK` de URL absoluta, e a imagem real vem com a
fatia 6.

## 6. Pendências e limites

- **O `COMMENT` da tabela continua dizendo "Conteúdo de exemplo".** Ele foi
  preservado porque a instrução foi preservar comentários, mas ficou falso: a
  tabela deixou de ser exemplo. Reescrever exige a palavra do dono, porque é
  texto herdado que ninguém revisou nesta rodada.
- **`service_role` é o caminho de escrita, e isso ainda é verdade.** Publicar por
  migration passa por ele, e a spec proíbe `service_role` em caminho de leitura
  pública — proibição que a `md-0002` carrega como AC. Nada nesta entrega
  implementa leitura por `service_role`; o que existe é a asserção de que ele
  escreve, e a de que `anon` e `authenticated` não.
- **A CI no GitHub continua não executada.** O job `database` vai rodar esta
  suíte com 63 asserções em vez de 15, e o resultado em runner real continua
  esperado, não observado.
- **`md-0002` continua `Proposed`.** Entregar schema não autoriza interface, e o
  AC-07 (exibição das fontes) só fecha com página.
- **O `PREVIEW` precisa de um usuário de verdade.** A policy está pronta e
  testada, mas o caminho de entrada — token, cookie `HttpOnly`, `timingSafeEqual`,
  `SUPABASE_PREVIEW_TOKEN` — é da `md-0002`. Sem isso a policy não tem usuário e
  o preview não existe, que é o comportamento correto de falha fechada.
- **Nada foi commitado.** As duas migrations e a suíte estão no índice junto com a
  preparação de identidade, que é outra entrega e pode ser commitada sozinha.
