# Verificação /check da spec 0023: SEO aprofundado e auditoria

- Data: 2026-10-17 (run `2026-10-17-1218-0023-seo-aprofundado`)
- Contrato: `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md`
  (`Status: Accepted`), sha256
  `e6a657fb4ae93e31e4cc4af2d811a82e202a3801bbe7e71ca1dd348ee0f302e2`
- Revisão avaliada: árvore de trabalho ancorada no commit efêmero
  `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore
  `7ccb67531a1bdc448791b74cf401d08367f42c60`, pai
  `b14dd5191590f0df3b9bd3835ca13f646d09d14f`), com `HEAD` em `b14dd51`
- Artefato da decisão: `check/0023-seo-aprofundado/2026-10-17-1134/results.json`
- Evidências: `docs/reviews/evidence/2026-10-17-1218-0023-seo-aprofundado/`
  (9 arquivos `ac-*.md` com SHA-256 no `results.json`)

## Veredito

**APROVADO** pelo contrato (`scripts/check-decision.mjs` sobre o
`results.json`, exit 0): 9/9 ACs `PASS`, 0 `FAIL`, 0 `UNVERIFIABLE`,
0 evidência ausente, 0 `BLOCKER`, 3 `WARNING` (registrados abaixo).

## Método

Ambiente: Supabase local com as fixtures do CI (`scripts/ci-fixtures.mjs`,
18 posts: 15 publicados, rascunho, agendado com data futura e arquivado),
build de produção (`pnpm build:next` com `NEXT_PUBLIC_SITE_URL` e Sanity
desligado por env vazia), servidor `next start --port 3000`, Chrome do
sistema. Comandos: `pnpm check:all` (exit 0, 819 testes em 80 arquivos), 7
testes de `__tests__/unit/seo-metadata.test.ts` e 21 de
`sitemap.test.ts`/`structured-data.test.tsx` em modo verbose, 8 testes
Playwright (`e2e/seo-audit.spec.ts` e `e2e/verify-md0002-tarefa5.spec.ts`,
exit 0 em 3,1 s), `@lhci/cli@0.15.1 autorun` (9 runs, medianas extraídas),
captura por `curl` de home, artigo, 404s, `/busca`, `/robots.txt` e sitemap,
e um segundo servidor na porta 3101 com Sanity configurado e indisponível
(projeto dummy) para o cenário de degradação.

## Resultado por AC

| AC        | Status | Prova principal                                                                                                                                                                                                           |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| seo/AC-01 | PASS   | Medianas de 3 runs por URL: home 0,99/2108 ms/0/54 ms; artigo 0,99/2110 ms/0/56 ms; `/busca` 0,99/1958 ms/0/55 ms (perf/LCP/CLS/TBT); a11y e best-practices 1 nas três; "All results processed!", sem falha de assertion. |
| seo/AC-02 | PASS   | Home com WebSite (url, name, inLanguage pt-BR, publisher, SearchAction `/busca?q={search_term_string}`) e Organization (name, url, logo absoluto, description), grafia "Gradualinfo".                                     |
| seo/AC-03 | PASS   | Artigo com Article completo (headline, description, url canônico, datas, author, image 1200x630, publisher, mainEntityOfPage) e BreadcrumbList de dois itens; não públicos com 404 e zero blocos.                         |
| seo/AC-04 | PASS   | Índice com `geral.xml` mais um filho por editoria publicada; 15 URLs exatas (sem duplicata, sem não público); `lastmod` igual ao `published_at`; regras negativas e escaping em unidade.                                  |
| seo/AC-05 | PASS   | Sanity configurado e indisponível: `/sitemap.xml` 200 só com `geral.xml`, `geral.xml` 200 com a home, filho de editoria 503 com `retry-after: 3600`, `/busca?q=teclado` 200 com o aviso existente.                        |
| seo/AC-06 | PASS   | `pnpm check:all` exit 0 (819/80) com os 7 casos de `seo-metadata.test.ts`; runtime: canonical só nas indexáveis, 404 noindex sem canonical, `/busca` noindex follow sem canonical, robots.txt e `X-Robots-Tag` do painel. |
| seo/AC-07 | PASS   | Relatório datado `docs/reviews/2026-10-17-1134-0023-seo-aprofundado-auditoria.md` (sha256 `0a81c8b4...`) com as três URLs do Lighthouse, os dados estruturados e a lista do que não foi observado.                        |
| seo/AC-08 | PASS   | Títulos sem sufixo duplicado na home, no artigo, no 404 e em `/busca` ("Pesquisa de artigos \| Gradualinfo"); painel e preview em unidade, com a limitação de Access registrada.                                          |
| seo/AC-09 | PASS   | Rascunho, agendado e arquivado existem no banco e não aparecem em home, sitemap ou JSON-LD (404 noindex); URLs absolutas sempre do `SITE_ORIGIN`; nenhuma variável ou dependência nova da feature.                        |

## Achados

WARNING:

1. O piso `categories:seo` do Lighthouse ficou escopado às URLs indexáveis via
   `assertMatrix` (`lighthouserc.cjs`): `/busca` é noindex por seo/AC-06 e o
   Lighthouse reprova `is-crawlable` dela (seo 0,66). A leitura literal das duas
   regras é incompatível para a rota; a implementação adotou a leitura
   consistente com o AC-06. Emenda do texto do AC-01, se desejada, passa pelo
   `/architect`.
2. O título autenticado do painel não é observável no ambiente local:
   `/admin-dashboard/login` responde 503 sem a configuração do Cloudflare
   Access (limitação documentada em `AGENTS.md`). A cobertura é a de unidade
   mais o template compartilhado, provado em runtime nas demais rotas.
3. A revisão avaliada é a árvore de trabalho com mudanças não commitadas de
   sessões concorrentes (`package.json`, `.env.example` e `pnpm-lock.yaml`
   alheios à feature). O commit `e4b8631a` é efêmero, criado só para ancorar o
   hash da árvore; o `check-gate` da CI exige árvore limpa e commit real antes
   do merge.

INFO: regras negativas do AC-04 provadas em unidade (não há editoria sem
publicado no banco local); AGENTS.md desatualizado em contagem de testes
(795/78 contra 819/80, tarefa de `/sync`); INP fora do laboratório com TBT
declarado como proxy.

## O que não foi observado

- O painel autenticado em runtime (Cloudflare Access ausente no ambiente
  local) e o preview via Durable Object.
- A CI real (runner, TLS do caminho worker em `https://localhost:3100`,
  variância de máquina): o run local usa o mesmo build e o mesmo
  `lighthouserc.cjs`.
- INP de campo e dados de CrUX.

## Reprodução

```bash
pnpm check:all
NEXT_PUBLIC_SITE_URL=http://localhost:3000 SANITY_PROJECT_ID= SANITY_DATASET= \
  NEXT_PUBLIC_SANITY_PROJECT_ID= NEXT_PUBLIC_SANITY_DATASET= pnpm build:next
SANITY_PROJECT_ID= SANITY_DATASET= NEXT_PUBLIC_SANITY_PROJECT_ID= \
  NEXT_PUBLIC_SANITY_DATASET= NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  pnpm next start --port 3000
E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test \
  e2e/seo-audit.spec.ts e2e/verify-md0002-tarefa5.spec.ts
pnpm dlx @lhci/cli@0.15.1 autorun --config=lighthouserc.cjs
node scripts/check-decision.mjs \
  check/0023-seo-aprofundado/2026-10-17-1134/results.json \
  --spec docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md
```

O cenário do seo/AC-05 usa um segundo `next start --port 3101` com
`SANITY_PROJECT_ID=check-verify-invalid-0023 SANITY_DATASET=production`.
