# Auditoria: estado de entrega contra o checklist de "padrão agência"

> Data: 2026-10-05. Base: `main` @ `bec25aa` + as 9 branches de trabalho.
> Executada no clone `a9_w_gradualinfo__iso`. Verificador: Kilo.
>
> **Escopo desta auditoria:** ela mede o repositório contra um denominador
> externo — o checklist de agência. O produto tem denominador próprio, definido
> pelo dono em `docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md` revisão 3. As duas
> métricas não concordam, e por isso a primeira seção é sobre a diferença.

## Veredito em uma linha

A avaliação apresentada está **tecnicamente correta na maior parte e
metodologicamente inadequada**: ela mede o certo contra o denominador errado, e a
média que ela declara não sai dos próprios números dela.

## 1. A média declarada não fecha

| Métrica                                     | Valor         |
| ------------------------------------------- | ------------- |
| Soma dos 17 percentuais da tabela           | 595           |
| Categorias não-zero                         | **10**        |
| Média aritmética (595 ÷ 17)                 | **35,0%**     |
| Média declarada no relatório                | ~55%          |
| **Divergência**                             | **20 pontos** |
| Média das 10 categorias não-zero (595 ÷ 10) | 59,5%         |

O "~55%" corresponde à família da média **excluindo os zeros**, que é um recorte
que a tabela não descreve. Num checklist cujo objetivo é mostrar lacuna, excluir
os itens que fecham em zero é exatamente o viés que a métrica deveria evitar: ela
transforma "faltam 7 categorias inteiras" em "estamos em 55%".

Isso não é preciosismo numérico. As duas médias induzem decisões opostas sobre a
primeira branch: por 55% a recomendação é polir o que existe; por 35% é que a
entrega não começou.

> **Contagem corrigida em 2026-10-05.** A primeira redação dizia "9 categorias
> não-zero". São **10** — `Auth` 10, `Templates` 10 e `Analytics` 10 estão todas
> acima de zero. O percentual 59,5% estava certo; o divisor declarado é que não
> estava. Dividir 595 por 9 dá 66,1%, que é aritmética correta sobre o
> denominador errado.

## 2. O denominador está errado para este produto

O checklist de agência pergunta "dá para entregar um site a um cliente". O
GradualInfo não é esse produto: é um **portal editorial de tecnologia para
estudantes de programação**, com primeira jornada definida — o guia
"manter, melhorar ou comprar um notebook para estudar programação".

Consequências práticas da troca de denominador:

| Categoria do checklist          | Peso para uma agência            | Peso para o GradualInfo                |
| ------------------------------- | -------------------------------- | -------------------------------------- |
| Formulário de contato / lead    | alto — é o objetivo comercial    | **zero** — não há produto a vender     |
| Páginas de preço / serviços     | alto — é a oferta                | **zero** — não há oferta               |
| Painel admin                    | alto — o cliente gerencia        | **decidido fora do MVP**               |
| Email transacional / Resend     | médio — recuperação de senha     | **zero** — sem conta de usuário no MVP |
| PWA / i18n                      | médio — escopo amplo             | **zero** — fora do escopo declarado    |
| Página de artigo + SEO + fontes | baixo — um template entre outros | **é o produto inteiro**                |

Oito das dezessete categorias têm peso quatro ou mais, ou não se aplicam. A
auditoria as conta como lacunas, e a soma depende disso.

## 3. O que a tabela erra sobre o repositório

Verificado no clone, contra `main` e contra as 9 branches.

### 3.1 SEO essencial está mais avançado do que a tabela diz

A tabela marca "🟡 parcial, 60%, **só nas branches**". Na verdade, em `main`:

- `app/robots.ts` ✅
- `app/sitemap.ts` ✅
- `lib/site-config.ts` ✅
- `app/layout.tsx` com metadata e Open Graph ✅

O que falta de SEO em `main` é canonical, JSON-LD `Article` e imagem OG — três
coisas pontuais, não "só nas branches". O achado correto é o inverso do
declarado: a fundação de SEO está **na base**, e o que falta é a camada de
conteúdo.

### 3.2 Autenticação está mais avançada do que "zero"

A tabela diz "🔴 zero, só clientes Supabase". Inventário real:

| Peça                                                   | Estado                                       |
| ------------------------------------------------------ | -------------------------------------------- |
| `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | ✅                                           |
| `hooks/use-supabase-user.ts`                           | ✅                                           |
| `proxy.ts` renovando sessão a cada requisição          | ✅                                           |
| `@supabase/auth-ui-react` ^0.4.7 instalado             | ✅                                           |
| Página de login / cadastro / recuperar                 | ❌ em `main` **e em nenhuma das 9 branches** |
| Guarda de rota protegida                               | ❌                                           |

O item mais difícil de auth — sessão SSR com cookie, renovação no proxy, hook de
usuário — está pronto e testado. Faltam três páginas e uma guarda. Isso é
"pouca entrega", não "zero": e **não está no escopo do MVP**, porque o MVP não
tem conta de usuário (comentários foram para pós-MVP).

### 3.3 O design system tem 5 primitivos, não "6 componentes", e o resto está num template órfão

`components/ui/` tem exatamente **5**: `badge`, `button`, `card`, `input`,
`skeleton`. Contando `header`, `footer`, `theme-toggle` e `theme-provider` chega
a 9 arquivos de interface — mas 4 deles não são componentes de UI.

O material de design mais rico do repositório são os **119 arquivos
rastreados de `template-aqua/`**, versionados por engano dentro do boilerplate.
Eles são simultaneamente a referência visual escolhida pelo dono e a origem das
55 falhas de `prettier`. Um item que é ao mesmo tempo ativo e bagunça não é
"30% do design system" — é uma decisão pendente.

### 3.4 Branch não é entrega

A tabela concede 95% a Qualidade, Segurança e Governança "**nas branches**". As
9 branches existem como refs no clone, mas `main` tem **zero rotas de produto**:
só `app/page.tsx` e `app/exemplo/page.tsx`.

| Branch                                 | Specs | Rotas de produto                                                              |
| -------------------------------------- | ----- | ----------------------------------------------------------------------------- |
| `fix/ci/bugs-criticos`                 | 0     | nenhuma                                                                       |
| `chore/ci/testes-completos`            | 0     | nenhuma                                                                       |
| `chore/eslint-jsdoc-react`             | 0     | nenhuma                                                                       |
| `chore/gitattributes-template-export`  | 0     | nenhuma                                                                       |
| `chore/governance/branch-protection-…` | 0     | nenhuma                                                                       |
| `feat/security/headers-csp-hsts`       | 0     | nenhuma                                                                       |
| `feat/blog/template-aqua-velite`       | 1     | `/blogs`, `/blogs/[slug]`                                                     |
| `feat/identidade-portal-gradualinfo`   | 2     | `/blogs`, `/blogs/[slug]`, `/editorias/[slug]`, `/radar-de-ofertas`, `/sobre` |

Só **duas** branches têm produto, e ambas partem da premissa MDX/Velite que a
spec de supersessão revogou. Ou seja: o produto na branch, o schema do produto
em `main`, e as duas em direções opostas.

### 3.5 O checklist não menciona o que trava o projeto

Nenhuma linha da tabela toca nos quatro problemas que efetivamente impedem a
entrega:

1. **Concorrência de escrita** — três sessões de agente escrevendo na mesma
   árvore, verificado por PIDs e por mtime de `.git`.
2. **`/check` e o gate** — `check-decision.mjs` existe e funciona, mas nenhum
   script do `package.json` o chama, então `pnpm check:all` **não executa o
   gate**.
3. **Colisão de ID de spec** — `0001` e `0002` nomeiam documentos diferentes em
   `main` e na branch.
4. **`template-aqua/`** — 119 arquivos de terceiro versionados no boilerplate,
   causa de 55 falhas de formatação e de o pre-commit reprovar sempre, inclusive
   no commit base.

## 4. As branches propostas vs as decisões do dono

Das 7 branches propostas, **nenhuma existe** — verificado por `show-ref`. E três
delas conflitam com decisões registradas:

| Branch proposta                                | Conflito                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `feat/admin/dashboard`                         | Owner decidiu **sem painel editorial** no MVP.                                                                     |
| `feat/cms/blog-conteudo` ("admin de conteúdo") | Idem — e a spec de supersessão já revoga o fluxo de publicação por PR/Velite em favor de publicação por migration. |
| `feat/auth/login-cadastro-recuperar`           | Não está no escopo: o MVP não tem conta de usuário, porque comentários foram para pós-MVP.                         |

Duas estão fora do escopo mas por motivo diferente, e uma é erro factual:

- `feat/marketing/paginas-template` — inclui **preço e serviços**. O GradualInfo
  não vende nada; não há oferta a precificar.
- `feat/analytics/ga4-plausible` e `feat/misc/i18n-pwa-email-storage` — fora do
  escopo declarado.
- `feat/lead/formulario-contato` — **é a que está errada na premissa**: não há
  lead. Um formulário de contato em portal editorial sem produto a vender é
  formulário órfão.

**A única da lista que eu defenderia, e ela não está na lista:** páginas legais.
Não por "padrão agência", e sim por **obrigação legal**. O produto publica para
leitor no Brasil e a fatia de newsletter futuramente coleta e-mail. Sem política
de privacidade e termos, publicar é exposição. Isso é piso de compliance, não
melhoria de produto.

## 5. Estado real sob o denominador do produto

Contra o scope revisão 3 (9 fatias):

| Fatia                                  | Estado                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| 1. Schema do artigo                    | foundation presente (`posts` com RLS e índice); spec de supersessão tem o AC-01 |
| 2. Home de leitura                     | ❌ não entregue                                                                 |
| 3. Página de artigo                    | ❌ não entregue                                                                 |
| 4. SEO básico                          | partial — robots/sitemap/metadata em `main`; falta canonical e JSON-LD          |
| 5. Publicação por migration            | ❌ não entregue                                                                 |
| 6. Referência visual do template       | ❌ não entregue                                                                 |
| 7. Primeira jornada (guia do notebook) | ❌ não entregue                                                                 |
| 8. SEO aprofundado                     | ❌ não entregue                                                                 |
| 9. Busca e recorte                     | ❌ não entregue                                                                 |

**0 de 9 fatias entregues.** A foundation cobre bem as fatias 1 e 4; as 7
restantes são trabalho novo. É a situação normal para o primeiro dia de produto
com base de engenharia pronta — e o oposto de "55% pronto".

## 6. O que a avaliação acerta

- **Autenticação e conteúdo como lacunas reais.** As páginas não existem.
- **Blog/CMS zero em `main`.** Correto.
- **Admin, contato, legal, analytics, i18n, PWA, email: zero.** Correto em todas
  as branches, verificado.
- **Fundação de engenharia sólida.** Correto e importante: é o que torna as
  fatias 1 a 4 barato em vez de caro.

## 7. Ordem recomendada, sob o denominador do produto

Não é a da tabela. A tabela põe admin e contato na frente, que são as duas
coisas que o dono decidiu não ter.

1. **Spec de supersessão e colisão de ID** — nada de código antes. É barato e
   remove a contradição que faz qualquer agente escolher por conta própria.
2. **Schema do artigo (fatia 1)** — a spec de supersessão já tem o AC-01.
3. **Home + artigo + SEO básico (fatias 2, 3 e 4)** — a primeira entrega
   verificável: página existe, é rastreável, tem estado vazio.
4. **Publicação por migration (fatia 5)** — destrava a primeira jornada.
5. **Páginas legais (LGPD)** — **piso de compliance, entra junto com a primeira
   entrega pública**. Não é bônus de produto.
6. **Primeira jornada (fatia 7)** — o guia do notebook.
7. Só depois: referência visual, SEO aprofundado, busca.

Contato, lead, analytics, i18n, PWA, email e admin saem do plano. Já estão no
"fora de escopo" do scope, e voltar por checklist de agência é o modo de
encher o roadmap de tudo que é fácil de planejar e caro de construir.
