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

| ID        | Arquivo                                    | Status   | Revisão | Origem da fatia            |
| --------- | ------------------------------------------ | -------- | ------- | -------------------------- |
| `md-0001` | `md-0001-arquitetura-markdown-supabase.md` | Accepted | 1       | decisão de arquitetura     |
| `md-0002` | `md-0002-casca-editorial-home.md`          | Proposed | 1       | fatias 2, 3 e 4 do scope   |
| `md-0003` | — a escrever pelo `/architect`             | —        | —       | fatia 1 (schema do artigo) |

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
A linha vigente **não reutiliza** esse material: o schema do artigo é reescrito
do zero em `md-0003`, a rota é `/artigos/[slug]`, e o que se aproveita da branch
é a **referência visual** (em `template-aqua/`), não a camada de conteúdo.

## Regra de status

`Proposed` → `Accepted` exige o `/check` verify com o gate de
`scripts/check-decision.mjs` em estado APROVADO. Registre a decisão **antes** do
`/develop`: spec não aceita é código sem contrato, e o `/develop` deve parar e
voltar ao `/architect`.
