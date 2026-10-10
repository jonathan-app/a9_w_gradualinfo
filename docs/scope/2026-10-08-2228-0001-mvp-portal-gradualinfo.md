# Scope: Portal de leitura do GradualInfo

> Documento dono do `/scope`: responde **o que construir e em que ordem**.
> Não decide COMO — isso é spec (`/architect`), uma spec por fatia.
>
> **Revisão 3 — 2026-10-04.** Reconciliada com o estado real da árvore depois de
> edição concorrente comprovada: a spec de supersessão **já existia** e o
> `/check` **já não está bloqueado**. Três ajustes de escopo: SEO básico passou
> a acompanhar home e artigo (a fatia posterior aprofunda, não habilita);
> comentários e conta saíram das nove fatias de lançamento; e o Markdown puro foi
> reexplicado — ele não impede calculadoras nem selos na página, só remove
> execução de componente _dentro_ do corpo.
>
> **Revisão 2 — 2026-10-04, por decisão do dono.** A revisão 1 (mesmo dia, mais
> cedo) partiu de duas premissas erradas, corrigidas aqui: o artigo **não** vive
> em MDX/Velite, e sim no Supabase com corpo Markdown; e o público não é "leitor
> de tecnologia em geral", e sim **estudantes de programação**. As specs `0001` e
> `0002` da branch `feat/identidade-portal-gradualinfo` partem da premissa do
> MDX e precisam ser substituídas — ver "Specs a substituir".

## Premissas

**Decisões do dono (2026-10-04). Estas não se redecidem aqui.**

1. **Artigo vive no Supabase, com o corpo em Markdown.** Não em MDX, não em
   Velite, não em CMS externo. O corpo é texto Markdown armazenado no banco e
   renderizado no servidor.
2. **`referencias/template-editorial/` é referência visual, não base de conteúdo.**
   Tipografia, cards, listagens, header/footer e a página de artigo são portados
   para TypeScript e Tailwind. A camada Velite/MDX do template é **descartada**.
3. **Público inicial: estudantes de programação.** O recorte é estreito de
   propósito: é o que permite ser útil em vez de apenas correto.
4. **Primeira jornada:** o guia "manter, melhorar ou comprar um notebook para
   estudar programação" — uma decisão prática, com critério explícito, que leva o
   leitor a um próximo passo fundamentado.
5. **Painel administrativo adaptado do TailAdmin sob `/admin-dashboard` (spec 0007).**
   Adotado exclusivamente para o administrador único (`a3qua96@gmail.com`), sem cadastro
   público de leitores, para navegação operacional, atalhos do Sanity Studio e disparo de
   preview seguro. A edição de artigos permanece no Sanity Studio (spec 0006), sem criar
   segundo editor na aplicação.
6. **Fora deste scope, por decisão explícita:** histórico de preços, Selo
   "Oferta Verificada", segundo editor de conteúdo, RAG/busca semântica e comunidade.
   Cada um em spec própria, não em fatia.

## Evolução arquitetural

O MVP permanece baseado em posts no Supabase com corpo em Markdown.

A arquitetura futura aprovada prevê a adoção do Sanity como fonte editorial
única para artigos, autores, editorias, fontes e mídia.

Essa evolução não faz parte da implementação corrente do MVP e somente será
iniciada mediante uma spec de migração aprovada, contemplando leitura,
publicação, Markdown, preview, imagens, cache, transferência de conteúdo,
preservação de slugs/SEO, validação e rollback.

**O que já existe e é reaproveitado.**

- Boilerplate Next.js 16 / React 19 / Supabase verificado, com `pnpm check:all`
  passando e `pnpm build` gerando o worker.
- `react-markdown` ^10 e `remark-gfm` ^4 instalados — é o que torna a decisão 1
  executável sem dependência nova.
- Tabela `posts` (`status`, `published_at`, `slug`, `excerpt`, `content`) com
  RLS ligado, policy por operação e índice `(status, created_at desc)` para
  listagem paginada. Ela é o exemplo didático do boilerplate e **vira o schema
  real do artigo**, por migração nova — não por gambiarra na tabela de exemplo.
- `profiles` 1:1 com `auth.users`, com trigger de criação e RLS por dono.
- `app/robots.ts`, `app/sitemap.ts`, `lib/site-config.ts`.
- Storybook, Vitest, Playwright, Lighthouse, Sentry e Semgrep.

**Base de conteúdo em Markdown, e o que isso permite e o que não.**

`react-markdown` renderiza no servidor e o HTML vem do React: não há
`dangerouslySetInnerHTML` nem superfície de XSS.

O que a decisão **remove** é estreito: a execução direta de componente React
_dentro_ do corpo do artigo, que é o que o MDX fazia. O que ela **não** remove
nada do que o briefing pede para a página:

- **Calculadoras e selos continuam possíveis** como componente separado ao redor
  ou entre blocos do artigo, renderizado pela rota, não pelo interpretador de
  Markdown.
- **Blocos estruturados continuam possíveis** como sintaxe convencionada no
  Markdown
  (por exemplo um bloco `:::calculadora` com parâmetros) tratada por um
  `rehype`/`remark` plugin próprio, que é a extensão legítima do Markdown e não
  MDX disguise.
- Ou por tabela separada, se o bloco precisar de consulta.

Ou seja: a fatia do Selo e a das calculadoras não foram adiadas por limitação
técnica da base de conteúdo. Foram adiadas por decisão de escopo, e a restrição
real é apenas que o corpo não executa componente — o que é uma boa propriedade.

**Riscos que definem a ordem.**

- _Zero de conteúdo é o pior estado possível_: um site de conteúdo com cinco
  editorias vazias parece quebrado e não ranqueia. Por isso a primeira fatia já
  entrega artigo real, não esquema pronto.
- _Esquema antes de estilo_: modelar dados errado custa migração; estilo errado
  custa CSS. O preço de errar é assimétrico.
- _Atrito de publicação é o gargalo real_: sem painel, se publicar um artigo
  exigir abrir terminal, a reda para. A fatia 4 resolve isso com migration
  versionada e é o que mantém o ritmo editorial sem custo de aplicação.

## Épicos / fatias (ordenados por valor)

| #   | Fatia                                | Entrega (observável)                                                                                                                                                                                                                                                                                                                                                                                                     | Depende de | Risco |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----- |
| 1   | Schema do artigo                     | Migration que transforma `posts` no schema editorial real: autor, editoria, corpo Markdown, fontes citadas, estado de publicação, data de publicação e atualização, e imagem de capa. RLS por operação e índice de listagem.                                                                                                                                                                                             | —          | baixo |
| 2   | Home de leitura                      | Home lista os artigos publicados com capa, editoria, título, resumo e data, vinda do Supabase real. Esboço do post no topo. Estado vazio e estado de erro visíveis.                                                                                                                                                                                                                                                      | 1          | baixo |
| 3   | Página de artigo                     | Artigo abre em `/artigos/[slug]`, corpo Markdown renderizado no servidor, com `<h1>` único e fontes citadas visíveis. Rascunho e não publicado respondem 404 para o público.                                                                                                                                                                                                                                             | 1          | baixo |
| 4   | **SEO básico (acompanha 2 e 3)**     | Metadata por rota, canonical, Open Graph, `Article` JSON-LD, entrada no `sitemap.xml` e `robots` correto. Sem isto a página existe mas não é rastreável — e o produto é aquisição orgânica.                                                                                                                                                                                                                              | 2, 3       | baixo |
| 5   | Publicação sem painel                | Um artigo entra no site por migration versionada: escrever a migration, rodar `supabase db reset`, o artigo publicado. A spec define **identificação do artigo** (slug como chave, sem duplicar linha), **atualização** (nova migration ou `upsert` idempotente) e **comportamento ao reaplicar** (`supabase db reset` recria tudo; reexecutar a mesma migration não pode duplicar). Checklist de publicação em `docs/`. | 1, 3       | baixo |
| 6   | Referência visual do template        | Tipografia, cards, listagens, header/footer e página de artigo portadas de `referencias/template-editorial` para TypeScript/Tailwind, **sem** vestígio de Velite ou MDX. Identidade GradualInfo no lugar da marca do template.                                                                                                                                                                                           | 2, 3       | médio |
| 7   | Primeira jornada: o guia do notebook | Um artigo completo e real sobre manter, melhorar ou comprar um notebook para estudar programação: critério explícito, fontes citadas, e um próximo passo que o leitor consegue executar.                                                                                                                                                                                                                                 | 3, 5       | médio |
| 8   | SEO aprofundado e auditoria          | Core Web Vitals dentro do orçamento do Lighthouse, dados estruturados validados, `sitemap` por editoria e auditoria de indexação. Auditável, não adivinhável.                                                                                                                                                                                                                                                            | 4, 7       | médio |
| 9   | Busca e recorte                      | Busca textual no título, resumo e corpo, tolerante a erro de digitação, com recorte por editoria.                                                                                                                                                                                                                                                                                                                        | 2, 3       | médio |

**Comentários e conta do leitor saíram das nove fatias de lançamento.** A
fatia 9 do recorte anterior era "conta do leitor e comentários", o que brigava com
"comunidade fora do MVP" decidido pelo dono. Não era só contradição de texto:
comentário sem moderação contínua é passivo de risco, e moderação é operação, não
entrega de código. Comentários viram **pós-MVP**, juntos com comunidade, e a
especificação é a mesma que já existe para painel editorial e RAG.

### Por que esta ordem

- **1 antes de tudo**: sem schema, não há página. E errar schema é o único erro
  desta lista que exige migração com dado escrito.
- **2, 3 e 4 saem juntos**: página, listagem e o mínimo que as torna
  rastreáveis. SEO básico não é fase própria porque uma página sem canonical e
  sem JSON-LD não entra em produção — adiá-lo só adia o retrabalho. A fatia 8
  é o que **aprofunda e audita**, não o que torna rastreável.
- **5 antes de 7**: sem caminho de publicação, o artigo da jornada 7 vira um
  `INSERT` manual irreproduzível.
- **6 depois de 2 e 3**: o site precisa _funcionar_ antes de _parecer_ finished.
  A referência visual entra quando já existe algo para estilizar — e assim a
  incorporação do template não esconde bug de dado.
- **7 é a prova**: um artigo real é o único jeito de provar que schema, rota,
  render, fontes e SEO funcionam juntos. Nenhum AC das fatias 1 a 6 sobrevive a
  um conteúdo que não existe.
- **8 e 9 depois**: as duas melhoram um portal que já publica. Nenhuma é
  pré-requisito de demonstrar utilidade ao leitor.
- **Sem `verify-citations` na lista**: seria a skill mais alinhada ao
  diferencial do produto, mas não está no catálogo instalado. A verificação de
  fonte fica como campo obrigatório de `posts` desde a fatia 1 e como AC da
  spec de supersessão, sem depender da skill.

## Fora do escopo (explícito)

| Não entra agora                                    | Por quê                                                                                                                                                             | Onde entra                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Histórico de preços e **Selo "Oferta Verificada"** | Decisão do dono: spec própria. Além disso é a parte de maior risco — exige fonte de terceiro e janela de 30 dias, e **a fonte ainda não está definida**.            | spec própria, depois da leitura |
| Painel editorial (`/redacao`)                      | Decisão do dono. Migration versionada cobre o MVP; painel é custo alto sem efeito de indexação.                                                                     | spec própria                    |
| RAG e busca semântica                              | Não faz sentido com menos de ~50 artigos.                                                                                                                           | spec própria                    |
| Comunidade, comentários e fóruns                   | Decisão do dono: fora do MVP. Comentário exige moderação contínua, que é operação, não entrega de código.                                                           | pós-MVP, spec própria           |
| Blocos estruturados no corpo (calculadora, selo)   | Não é limitação do Markdown: o corpo não executa componente, mas plugin de bloco, componente separado ou tabela resolvem. **Decidido junto com o Selo, não antes.** | spec do Selo                    |
| Vídeo, shorts, podcast                             | Exige pipeline de mídia que não existe na stack.                                                                                                                    | fora                            |
| Monetização, anúncios e afiliados                  | Antes de existir tráfego, qualquer modelo é chute.                                                                                                                  | fora                            |
| Multi-idioma, PWA, app nativo                      | Não resolvem o gargalo do MVP.                                                                                                                                      | fora                            |

## Specs: as que existem e as que precisam de identificador livre

**A spec de supersessão já foi escrita** (2026-10-04, 20:34) e está **Accepted**:

| Branch | Artefato                                   | Status   | Premissa               |
| ------ | ------------------------------------------ | -------- | ---------------------- |
| `main` | `md-0001-arquitetura-markdown-supabase.md` | Accepted | Supabase + Markdown ✅ |
| `main` | `md-0002-casca-editorial-home.md`          | Proposed | Supabase + Markdown ✅ |

O `0001` de `main` revoga explicitamente as decisões de Velite, MDX e fluxo
editorial por PR, e fixa `/artigos/[slug]`. Ele está coerente com a revisão 2
deste scope — **não se escreve outra spec de supersessão**.

**Mas há colisão de identificador, e ela precisa ser resolvida antes da fatia 1:**

| Branch                               | `0001`                          | `0002`                   |
| ------------------------------------ | ------------------------------- | ------------------------ |
| `main`                               | `arquitetura-markdown-supabase` | `casca-editorial-home`   |
| `feat/identidade-portal-gradualinfo` | `blog-template-aqua`            | `mvp-portal-gradualinfo` |

Dois documentos diferentes com o mesmo ID, dependendo da branch. Quem abrir a
branch e procurar `0002` encontra a spec do MVP; quem estiver em `main` encontra a
casca editorial. Isso não é cosmético: a spec de supersessão precisa **citar
as specs que substitui por caminho completo e revisão**, não por ID, porque o ID
não é único.

Duas saídas, e a escolha é do `/architect`:

1. **Renomear as specs da branch** para um prefixo distinto (por exemplo
   `mdx-0001-…`, `mdx-0002-…`) e registrar no corpo da supersessão o novo caminho.
   Preserva o histórico sem apagar nada.
2. **Matar a branch** em vez de mesclar, já que a premissa MDX foi revogada, e
   manter no histórico do git o registro do que existiu.

A saída 2 é mais limpa se a branch não tiver nada além da premissa revogada —
mas é decisão de integração, e integração só acontece com ação humana no GitHub.

## Três conclusões da auditoria, reconciliadas com o estado atual

1. **Skills do ciclo instaladas; descoberta não verificada.** `.agents/skills/`
   tem 48 skills e `kilo.json` **existe**, mas com o campo `skills_dir`, que não
   é do esquema do Kilo — o esquema é `{ "skills": { "paths": [...] } }`.
   **Configuração presente; descoberta não verificada.** A formulação é essa
   de propósito: sem uma sessão reiniciada que conte o que carrega, "carrega" e
   "não carrega" são as duas afirmações sem lastro.
2. **`/check` não está mais bloqueado.** `scripts/check-decision.mjs` e
   `scripts/check-gate.mjs` **existem** e foram testados nos cinco casos de
   reprovação: lista de ACs vazia, `UNVERIFIABLE`, `PASS` sem evidência,
   `BLOCKER` — todos saem com código 1 e `approved: false`; o caso válido sai
   com 0 e `true`. A regra de "sem autoridade, então BLOQUEADO" foi a condição
   enquanto o script não existia; **a condição deixou de valer**.
   Pendência real: nenhum script do `package.json` chama `check-decision.mjs`,
   então `pnpm check:all` não executa o gate.
3. **`docs/audits/2026-10-07-1350-BRANCHES.md` é referência, não plano.** `main` tinha zero rotas de
   produto; as branches precisam ser comparadas com a base atual antes de
   integrar.

Detalhe completo em `docs/reviews/2026-10-04-2150-2026-10-04-auditoria-skills-estrutura.md`.

## Critérios de pronto (Definition of Ready para `/architect`)

- [x] Cada fatia tem entrega observável.
- [x] Ordem de dependências declarada e sem ciclo.
- [x] Riscos identificados por fatia.
- [x] Nenhuma fatia depende de decisão humana não tomada.
- [x] Spec de supersessão existe (`main:md-0001-arquitetura-markdown-supabase.md`,
      Accepted) e é coerente com esta revisão.
- [ ] Colisão de ID `0001`/`0002` entre `main` e a branch resolvida, ou
      documentada como isenta por caminho completo.

## Próxima etapa

`/architect` → primeiro reconciliar a **colisão de ID** e a **spec `0002`
existente** (`main:md-0002-casca-editorial-home.md`, Proposed), que cobre as fatias
2, 3 e 4 deste scope; corrigi-la em vez de criar uma spec concorrente. A fatia #1
(schema do artigo) é o `AC-01` do `main:0001` — se ainda não estiver detalhado
como AC, é aí que entra, não em um `0003` novo. Nada de código antes disso.
