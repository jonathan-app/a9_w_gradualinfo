# seo/AC-01: orçamento do Lighthouse nas três URLs

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Spec: `docs/specs/2026-10-17-1037-0023-seo-aprofundado-auditoria.md`, sha256 `e6a657fb4ae93e31e4cc4af2d811a82e202a3801bbe7e71ca1dd348ee0f302e2`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`, pai `b14dd5191590f0df3b9bd3835ca13f646d09d14f`)
- Ambiente: build de produção local (`pnpm build:next`), servidor `next start --port 3000` com `NEXT_PUBLIC_SITE_URL=http://localhost:3000` e `SANITY_*`/`NEXT_PUBLIC_SANITY_*` vazias (Sanity desligado, Supabase local como fonte). Chrome do sistema, igual ao job de CI.

## Como foi verificado

`pnpm dlx @lhci/cli@0.15.1 autorun --config=lighthouserc.cjs`, 3 execuções por URL (9 no total).

Config auditada (`lighthouserc.cjs`): três URLs, `numberOfRuns: 3`, piso 0,90 para performance, accessibility e best-practices em todas; orçamento por métrica em todas (LCP ≤ 2500 ms, CLS ≤ 0,1, TBT ≤ 200 ms); `categories:seo` ≥ 0,90 apenas para as URLs indexáveis (`^http://localhost:3000/($|artigos/)`).

## Mediana de 3 execuções por URL

| URL                        | perf | a11y | bp  | seo  | LCP     | CLS | TBT   |
| -------------------------- | ---- | ---- | --- | ---- | ------- | --- | ----- |
| `/`                        | 0,99 | 1    | 1   | 1    | 2108 ms | 0   | 54 ms |
| `/artigos/fixture-publicado` | 0,99 | 1    | 1   | 1    | 2110 ms | 0   | 56 ms |
| `/busca`                   | 0,99 | 1    | 1   | 0,66 | 1958 ms | 0   | 55 ms |

Log do run: `Checking assertions against 3 URL(s), 9 total run(s)` e `All results processed!`, sem nenhuma linha de falha de assertion.

## Notas

- `/busca` é noindex por contrato (seo/AC-06) e o item `is-crawlable` do Lighthouse derruba a categoria seo dela para 0,66. Exigir seo ≥ 0,90 na rota contradiria o AC-06, por isso o `assertMatrix` limita esse piso às URLs indexáveis; as três URLs seguem no orçamento de Core Web Vitals e nos demais pilares. O achado está registrado em `docs/reviews/2026-10-17-1134-0023-seo-aprofundado-auditoria.md`, seção "Achado de gate: o piso de SEO e o noindex de /busca", e reaparece como WARNING no `results.json` deste run.
- INP não é medível em laboratório; o TBT fica como proxy declarado, conforme a spec.
- Os números são um ponto de medida local; a CI roda o mesmo arquivo no runner do GitHub Actions.
