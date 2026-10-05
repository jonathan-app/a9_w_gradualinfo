# Índice de specs — GradualInfo

> Mapa de identificadores e de supersessão. Existe porque o repositório teve
> **duas linhas de spec com os mesmos IDs**: a linha MDX/Velite, que nasceu na
> branch `feat/identidade-portal-gradualinfo`, e a linha Markdown/Supabase, que
> a substituiu. Sem este índice, `0002` significava dois documentos diferentes
> dependendo da branch em que você estava.

## Convenção

| Prefixo       | Linha                | Status       | Onde vive                                                     |
| ------------- | -------------------- | ------------ | ------------------------------------------------------------- |
| `md-`         | Markdown no Supabase | **vigente**  | `main`                                                        |
| (sem prefixo) | MDX/Velite           | **revogada** | branches `feat/blog/*` e `feat/identidade-portal-gradualinfo` |

Regra para escrever spec nova: prefixo `md-`, número sequencial dentro da linha
vigente, e nada de ID nu no `main`. O prefixo existe para que o número deixe de
ser ambíguo quando alguém comparar `main` com uma branch histórica.

## Specs vigentes

| ID        | Arquivo                                    | Status   | Revisão | Origem da fatia          |
| --------- | ------------------------------------------ | -------- | ------- | ------------------------ |
| `md-0001` | `md-0001-arquitetura-markdown-supabase.md` | Accepted | 2       | decisão de arquitetura   |
| `md-0002` | `md-0002-casca-editorial-home.md`          | Accepted | 2       | fatias 2, 3 e 4 do scope |

`md-0003` não existe, e não deve ser escrito. Uma versão anterior deste índice
reservava `md-0003` para a fatia 1 (schema do artigo), o que punha duas specs
concorrendo pela mesma fatia: `md-0001` já é `Accepted` desde 2026-10-04 e o
seu AC-01 carrega o schema. Em 2026-10-05 o dono optou por **emendar** o AC-01
do `md-0001` em vez de superseder, então a fatia 1 tem um dono de schema único.

O schema resultante está na tabela de data model de `md-0002`, e a emenda está
registrada no próprio `md-0001` com a fonte da decisão.

## Tabela de supersessão

| Documento superseded                                                  | Linha      | Substituído por              | Por quê                                                                                                     |
| --------------------------------------------------------------------- | ---------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `feat/identidade-portal-gradualinfo`:`0001-blog-template-aqua.md`     | MDX/Velite | `main`:`md-0001`             | Artigo em MDX compilado pelo Velite; a decisão do dono fixa Markdown no Supabase                            |
| `feat/identidade-portal-gradualinfo`:`0002-mvp-portal-gradualinfo.md` | MDX/Velite | `main`:`md-0001` e `md-0002` | Mesmo motivo, e inclui painel editorial, RAG e Selo no mesmo escopo — todos fora do MVP por decisão do dono |
| `feat/blog/template-aqua-velite`:`0001-blog-template-aqua.md`         | MDX/Velite | `main`:`md-0001`             | Cópia da spec da branch de identidade, na branch do blog                                                    |

As três specs revogadas **permanecem nas branches**. Não foram apagadas e as
branches não foram descartadas: elas são o registro do que foi decidido e
depois revogado, e é delas que vem o material de referência visual. Descartá-las
faria a fatia 6 (portar tipografia, cards, listagens e página de artigo de
`template-aqua`) perder a fonte.

## Citação por caminho, não por ID

Enquanto as duas linhas existirem lado a lado, **ninguém deve citar uma spec
pelo ID sozinho**. O formato é `branch:arquivo`, por exemplo:

- `main:md-0001-arquitetura-markdown-supabase.md`
- `feat/identidade-portal-gradualinfo:0002-mvp-portal-gradualinfo.md` (revogada)

Um "AC-01" sozinho é ambíguo: `md-0001` e a spec revogada do MVP têm ACs com o
mesmo prefixo, e são specs que discordam sobre onde o artigo vive.

## Divergência que a supersessão não resolveu

`md-0001` fixa `/artigos/[slug]` e Markdown no Supabase. A spec revogada
`0002-mvp-portal-gradualinfo.md` fixa `/blogs/[slug]` e MDX. Quem implementou a
branch de identidade construiu `/blogs` com 11 posts MDX e 5 tabelas com RLS.
A linha vigente **não reutiliza** esse material: o schema do artigo é
reescrito do zero e consolidado no AC-01 do `md-0001` (emenda de 2026-10-05),
a rota é `/artigos/[slug]`, e o que se aproveita da branch é a **referência
visual** (em `template-aqua/`), não a camada de conteúdo.

## Regra de status

`Proposed` → `Accepted` é decisão do **engenheiro**, não verificação técnica. O
`/architect` é explícito: `Accepted` significa que o dono confirmou o design
(escopo, contratos, dependências e ACs verificáveis), e proíbe o agente de
aceitar em nome dele.

Uma versão anterior desta regra dizia que o aceite exigia `/check verify` com o
gate em APROVADO. Isso era um deadlock: `check-decision.mjs` reprova qualquer AC
que não esteja em PASS com evidência, e os ACs de uma spec descrevem código que
ainda não existe. O portão só abriria depois da construção que ele autorizava.
A ordem correta é:

| Etapa           | Confirma                                              |
| --------------- | ----------------------------------------------------- |
| aceite          | que o design está decidido (dono)                     |
| `/develop`      | constrói contra os ACs                                |
| `/check verify` | que cada AC se sustenta em evidência, sobre a entrega |

`Accepted` é pré-requisito do `/develop`; `/check verify` comprova a entrega
depois. Nenhum dos dois substitui o outro.

## Desvio da convenção de nome, registrado

O `/architect` nomeia spec como `NNNN-kebab-case.md`. Aqui o número é
`md-NNNN`, com prefixo. O desvio é intencional e tem motivo: sem o prefixo,
`0001` e `0002` nomeiam documentos diferentes dependendo da branch, que é a
colisão que este índice existe para documentar. Migrar para `NNNN` puro exige
renomear `md-0001` e `md-0002` juntos, e só é seguro depois de as branches
revogadas saírem do caminho de merge.
