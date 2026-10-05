# Spec: md-0002 — Home, página de artigo e SEO básico

| Campo      | Valor                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| ID         | `md-0002`                                                                                                  |
| Status     | **Proposed** — reconciliada com o scope revisão 3 em 2026-10-05                                            |
| Revisão    | 2; data: 2026-10-05; responsável: `/architect`                                                             |
| Escopo     | `docs/scope/0001-mvp-portal-gradualinfo.md`, **fatias 2, 3 e 4**                                           |
| Depende de | `main:md-0001-arquitetura-markdown-supabase.md` — o AC-01 dela define o schema que esta spec consome       |
| Substitui  | `feat/identidade-portal-gradualinfo:0002-mvp-portal-gradualinfo.md` (revogada, ver `docs/specs/INDICE.md`) |

## Problema, público e limites

O portal precisa de uma página inicial que liste os guias e de uma página de
leitura para eles, sem depender de compilação de arquivos locais, e as duas
precisam ser **rastreáveis** desde o primeiro deploy.

Público: estudantes de programação. A home não é vitrine de produto: não há
preço, não há cadastro obrigatório, não há chamada de venda.

**Fora desta spec**, porque tem AC próprio ou decisão do dono: schema da tabela
(`md-0001`), publicação por migration (fatia 5), referência visual completa
(fatia 6), busca (fatia 9), comentários e conta (pós-MVP).

## Decisões técnicas

- **Dados:** `posts` com `id`, `slug`, `title`, `excerpt`, `content`,
  `status`, `published_at`, `author_id`, `cover_image_url`. O schema completo,
  incluindo fontes citadas e editoria, é decidido em `md-0001`; esta spec só
  consome.
- **Leitura:** Server Component. `createClient()` de `lib/supabase/server.ts`.
  A listagem e o artigo são lidos no servidor; nenhum dado editorial chega ao
  cliente por props de página.
- **Markdown:** `react-markdown` + `remark-gfm`, renderizados no servidor.
  **Proibido** `dangerouslySetInnerHTML` em qualquer caminho do corpo do artigo.
- **Autorização:** a RLS decide o que é público. A query **não** filtra por
  status como segunda barreira — ela confia na policy. Duplicar o filtro no
  código criaria dois lugares onde a regra mora, e a policy é a que a CI prova.
- **Erros:** artigo inexistente ou não publicado → `notFound()` do Next, que
  devolve 404 com a página de erro do próprio app. Falha de Supabase no server
  component → erro logged e página de erro; **não** vira lista vazia, porque
  "não achou" e "deu erro" são respostas diferentes para o leitor.
- **Migração e rollback:** N/A — esta spec não altera banco. A migration é de
  `md-0001` e é forward-only, conforme a convenção do repo.
- **Ambiente:** nenhuma variável nova. `NEXT_PUBLIC_SITE_URL` vem de
  `lib/site-config.ts`, que já centraliza a origem pública.

## Estados de UI

A home tem quatro estados e **os quatro são AC**, porque o mais esquecido é o
quarto:

| Estado       | Comportamento exigido                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Sucesso      | Grid de artigos com capa, editoria, título, resumo e data               |
| **Vazio**    | Mensagem de que ainda não há artigo publicado, com link para a editoria |
| Carregamento | `loading.tsx` com skeleton de card, sem shift de layout                 |
| **Erro**     | Mensagem distinta da de vazio; nunca "nenhum artigo encontrado"         |

A página de artigo tem: sucesso, 404 para slug ausente ou não publicado, e
`error.tsx` para falha de leitura.

## SEO básico (mesma fatia, não fase separada)

Uma página sem canonical e sem `Article` JSON-LD não entra em produção. Por isso
isto entra **junto** com home e artigo, e a fase seguinte (fatia 8) é o que
aprofunda e audita.

- `generateMetadata` por artigo: title, description = `excerpt`, OpenGraph com
  `cover_image_url`.
- **Canonical** absoluto por artigo, derivado de `lib/site-config.ts`.
- JSON-LD `Article` com título, data de publicação, autoria e imagem.
- Entrada no `app/sitemap.xml` com `lastModified` = `published_at`.
- `robots.ts` inalterado: o portal é público e deve ser indexado.
- **Um `<h1>` por página** — o título do artigo. A home tem o `<h1>` da marca.

## Critérios de Aceite

| AC    | Critério                                                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | A home lista até 10 artigos publicados, ordenados por `published_at` decrescente, e **não lista rascunho nem agendado**                  |
| AC-02 | Com exatamente 11 artigos publicados, a home mostra 10 e existe paginação ou link para a listagem completa; com 0, mostra o estado vazio |
| AC-03 | `/artigos/[slug]` renderiza o título em `<h1>` e o corpo Markdown como HTML, sem nenhuma tag Markdown crua                               |
| AC-04 | O corpo do artigo **não** contém `dangerouslySetInnerHTML` — verificável por busca no bundle servido                                     |
| AC-05 | Slug inexistente devolve 404 com a página de erro do app; artigo com `published_at` no futuro também devolve 404 em produção             |
| AC-06 | Em `local`, artigo não publicado é acessível para preview, e a diferença de comportamento está em um branch testável, não espalhada      |
| AC-07 | O HTML servido traz `<script type="application/ld+json">` com `@type: Article`, título, `datePublished`, autor e imagem                  |
| AC-08 | Cada artigo tem canonical absoluto, derivado de `NEXT_PUBLIC_SITE_URL`                                                                   |
| AC-09 | `app/sitemap.xml` contém a URL de cada artigo publicado com `lastModified` igual a `published_at`                                        |
| AC-10 | Falha de leitura no Supabase produz a página de erro, **não** o estado vazio                                                             |
| AC-11 | `pnpm dlx supabase test db` prova que `anon` não lê rascunho por RLS, e que nenhum caminho de API contorna a policy                      |
| AC-12 | A página funciona por teclado e a11y: um `<h1>`, hierarquia de headings sem salto, foco visível, links com nome acessível                |

## Plano de validação

| AC    | Como reproduzir                                                             | Evidência                             |
| ----- | --------------------------------------------------------------------------- | ------------------------------------- |
| AC-01 | `pnpm supabase:reset` com seed de 3 publicados e 1 rascunho; abrir `/`      | logs do teste + página renderizada    |
| AC-02 | seed com 0, 1, 10 e 11 publicados; `pnpm test:e2e`                          | teste E2E com as quatro contagens     |
| AC-03 | E2E em `/artigos/[slug-conhecido]`, asserting `h1` e texto formatado        | `e2e/critical-flows.spec.ts`          |
| AC-04 | `rg -n "dangerouslySetInnerHTML" .next/` → nenhum resultado                 | saída do comando no relatório         |
| AC-05 | E2E em `/artigos/inexistente` e em artigo agendado                          | E2E + status 404                      |
| AC-06 | `pnpm dev` e abrir rascunho; `pnpm build && pnpm preview` e repetir         | par de execuções com resultado oposto |
| AC-07 | E2E: `document.querySelector('script[type="application/ld+json"]')` e parse | E2E com JSON parseado                 |
| AC-08 | E2E em dois artigos, comparando as tags `<link rel="canonical">`            | E2E com as duas URLs                  |
| AC-09 | `pnpm build && pnpm start`, buscar `/sitemap.xml`                           | XML com N entradas                    |
| AC-10 | derrubar o Supabase local e abrir `/`                                       | página de erro, não estado vazio      |
| AC-11 | `pnpm supabase:test`                                                        | pgTAP verde                           |
| AC-12 | `@axe-core/playwright` já configurado em `e2e/accessibility.spec.ts`        | axe sem violações                     |

## Segurança e limites

- **RLS é a única fronteira.** `posts_select_public` já exige `status =
'publicado' and published_at <= now()`. Nenhum filtro duplicado em código.
- **Sem API route para conteúdo.** As páginas leem direto do Supabase no
  server component; não existe endpoint público que aceite `slug` do cliente.
- **Rate limit:** N/A — não há rota de escrita nesta spec.
- **Paginação:** limite de 10 por página, ordenação `published_at desc`, sem
  offset profundo (a listagem é por cursor ou por data).

## Fora desta spec

Publicação por migration (fatia 5), identidade visual completa (fatia 6),
primeira jornada do guia do notebook (fatia 7), Core Web Vitals (fatia 8) e
busca (fatia 9). Admin, comentários, contato e analytics estão fora do MVP por
decisão do dono.

## Portão antes do `/develop`

1. Reconciliação com o schema de `md-0001` conferida campo a campo.
2. `/check` verify **aprovado** pelos ACs acima, com `scripts/check-decision.mjs`
   em estado APROVADO e evidência anexada.
3. Status muda de `Proposed` para `Accepted` **e a decisão fica registrada em
   `workflow/STATE.md`**.
4. Só então `/develop`.

Enquanto o status for `Proposed`, o `/develop` deve parar e voltar ao
`/architect`. Uma spec não aceita é código sem contrato.

## Pendência conhecida que não é desta spec

`scripts/check-gate.mjs` exige a string `Veredito: APROVADO`, e
`docs/reviews/_TEMPLATE.md` escreve `- [ ] **Aprovado**`. Um relatório copiado do
template é reprovado por motivo de texto. As duas metades precisam casar, e a
correção é da spec do próprio gate, não desta.
