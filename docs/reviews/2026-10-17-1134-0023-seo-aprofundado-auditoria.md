# Auditoria de SEO e dados estruturados (spec 0023)

Data: 2026-10-17 11:34 (América/São_Paulo). Contrato:
`docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md` (Accepted, seo/AC-01 a
seo/AC-09). Este relatório registra o que foi verificado no build local, com as
capturas do Lighthouse e dos dados estruturados, e lista explicitamente o que não
foi observado (seo/AC-07). Não é aceite de entrega.

## Método e ambiente

- Stack Supabase local com o seed vigente e as fixtures descartáveis do CI
  provisionadas por `scripts/ci-fixtures.mjs` (mesmo provisionamento do job de CI).
- Build de produção: `pnpm build:next` com `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
  e Sanity desligado por env (fonte Supabase, espelhando o job de e2e e o de
  Lighthouse da CI). Servidor: `pnpm next start --port 3000`.
- Playwright: `E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test
e2e/seo-audit.spec.ts e2e/verify-md0002-tarefa5.spec.ts` (8 testes, 8 verdes).
- Lighthouse: `pnpm dlx @lhci/cli@0.15.1 autorun --config=lighthouserc.cjs`
  (3 execuções por URL, mediana; exit 0 na execução final).

Uma primeira execução dos specs de página contra `pnpm dev` produziu 3 falhas
intermitentes de "execution context was destroyed" (recarga do HMR no meio da
consulta). Contra o build de produção, o mesmo conjunto passa de forma
determinística, que é o caminho que a CI usa.

## Capturas do Lighthouse (mediana de 3 execuções por URL)

| URL                          | performance | accessibility | best-practices | seo  | LCP    | CLS   | TBT  |
| ---------------------------- | ----------- | ------------- | -------------- | ---- | ------ | ----- | ---- |
| `/`                          | 0,99        | 1             | 1              | 1    | 2108ms | 0,000 | 56ms |
| `/artigos/fixture-publicado` | 0,99        | 1             | 1              | 1    | 2116ms | 0,000 | 56ms |
| `/busca`                     | 0,99        | 1             | 1              | 0,66 | 1958ms | 0,000 | 53ms |

Orçamento de seo/AC-01: performance ≥ 0,90, LCP ≤ 2,5s, CLS ≤ 0,1 e TBT ≤ 200ms em
todas as 3 URLs; observado dentro do limite em todas.

O INP não é medível em laboratório; o TBT acima fica como proxy declarado, como o
próprio spec prevê. As capturas são de laboratório móvel simulado, não de dados de
campo (CrUX).

### Achado de gate: o piso de SEO e o noindex de `/busca`

A primeira execução do gate falhou exatamente 1 asserção: `categories:seo` de
`/busca` em 0,66, por `is-crawlable = 0`. A causa é o contrato, não o defeito:
seo/AC-06 exige `/busca` com `noindex`, e o Lighthouse reprova justamente a
página bloqueada de indexação. Manter `categories:seo ≥ 0,90` global tornaria os
AC-01 e AC-06 insatisfazíveis ao mesmo tempo. O `lighthouserc.cjs` passou a usar
`assertMatrix`: o orçamento de CWV e os pilares de accessibility e
best-practices valem para as 3 URLs; o piso de `categories:seo` vale para as
páginas indexáveis (`/` e `/artigos/*`). O detalhe está comentado no config. Se
o `/check` julgar que isso diverge do texto do AC-01, a rota é o `/architect`
emendar o AC.

## Dados estruturados validados em browser real

- Home: WebSite com `url` igual ao `baseURL` mais barra, `inLanguage` pt-BR e
  SearchAction apontando `/busca?q={search_term_string}`; Organization com `name`
  "Gradualinfo", `logo` absoluto (`/icon.png`) e `description`. Ambos os blocos
  parseáveis e presentes mesmo sem conteúdo editorial.
- Artigo publicado: Article com `headline`, `url`, `mainEntityOfPage`,
  `publisher` e `image` com `width` 1200 e `height` 630; BreadcrumbList com
  posições 1 ("Início") e 2. Blocos separados, cada um com `@context` próprio.
- Título malicioso da fixture (`</script><script>...`) permanece dado: o JSON-LD
  é parseável e o script não executa (md-0002/AC-05, AC-06, AC-09 no spec de e2e).
- robots.txt aponta `${baseURL}/sitemap.xml` e mantém `/api/` e
  `/admin-dashboard/` fora.
- Sitemap: `/sitemap.xml` responde `<sitemapindex>` com filho `geral.xml` e um
  filho por editoria com publicado; todo filho responde `<urlset>`; a união cobre
  `/artigos/fixture-publicado` e não repete URL; `fixture-rascunho`,
  `fixture-agendado` e `fixture-arquivado` não aparecem.

## O que não foi observado

- Deploy, produção e CI: nenhum push ou disparo; os números acima são do build
  local espelhando o ambiente do job.
- O caminho de e2e da CI com TLS em `https://localhost:3100` (worker path): o run
  local usou o mesmo build de produção em `http://localhost:3000`. A paridade do
  transporte TLS não foi exercitada.
- seo/AC-05 em runtime: a indisponibilidade real do Sanity com a sonda do proxy
  não foi reproduzida hoje; no run local a fonte era o Supabase. A cobertura
  observada é a de unidade (degradação com `ContentUnavailableError`).
- Os fixtures `fixture-rascunho`, `fixture-agendado` e `fixture-arquivado` não
  foram lidos diretamente: o RLS os esconde do anônimo. O 404 deles foi
  observado no browser (e2e) e o filtro, em unidade.
- Variância de máquina e de rede do runner da CI; os valores locais são um
  ponto de medida, não a garantia do runner.
- INP de campo (só o proxy TBT em laboratório) e dados de CrUX.

## Arquivos do build auditado

`lib/seo/structured-data.ts`, `components/shared/json-ld.tsx`,
`lib/seo/sitemap.ts`, `app/sitemap.xml/route.ts`,
`app/sitemap/[editoria]/route.ts`, `lib/site-config.ts`, `app/layout.tsx`,
`app/page.tsx`, `app/artigos/[slug]/page.tsx`, `app/busca/page.tsx`,
`app/admin-dashboard/layout.tsx`, `next.config.ts`, `lighthouserc.cjs`,
`__tests__/unit/sitemap.test.ts`, `__tests__/unit/structured-data.test.tsx`,
`__tests__/unit/seo-metadata.test.ts`, `__tests__/unit/app-home.test.tsx`,
`e2e/seo-audit.spec.ts`, `e2e/verify-md0002-tarefa5.spec.ts`.
