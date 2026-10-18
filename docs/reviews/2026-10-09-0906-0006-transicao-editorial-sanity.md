# /check verify — spec 0006 (transição editorial Sanity)

Alvo: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
sha256 da spec: `d931c37a6da4176829a6ed26c192fcb67dd62bd86d9b5a5852ac4ad4f4eb02e2`
Commit avaliado: `ed00c4b9fcc69c3570cfed106bb58cc6931633aa` (tree `9ef0f628b6eef85ca97ae9295b33e4f13343efee`)
Árvore de trabalho: suja (184 arquivos). Executado em 2026-10-09 09:06.

Veredito autoritativo: **REPROVADO** (exit 1) — saída literal de
`node scripts/check-decision.mjs … --spec docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`.
Todas as evidências desta rodada: `docs/reviews/evidence/2026-10-09-0906-0006/`
(`results.json`, `decisao.json`, `AC-01.md`…`AC-08.md`).

## Modo verify

| AC    | Prova (comando/saída)                                                                                                                                                    | Status          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| AC-01 | Dataset Sanity inexistente no build → home deixa de renderizar e o log registra `Falha na consulta ao Sanity (HTTP 404)` (14×); nenhum ramo Supabase serve a home.       | ✅ PASS         |
| AC-02 | Content Lake com `countPosts=0`: sem página real de artigo para medir slug/canonical/OG no fio; canonical não observado no HTML servido.                                 | ⚠️ UNVERIFIABLE |
| AC-03 | Chunks `/_next/static/**.js` varridos byte a byte pelo valor de `SANITY_API_READ_TOKEN`: `chunks com o token: 0`; `Bearer` no HTML: 0.                                   | ✅ PASS         |
| AC-04 | `GET /api/preview` → 405; `GET /api/preview/logout` → 405; `POST /api/preview` com `Origin: https://evil.example` → 403.                                                 | ✅ PASS         |
| AC-05 | Sem binding de Durable Object local (`getPreviewSessionStore()` cai no `InMemoryPreviewSessionStore`); consistência/revogação/503 não medíveis.                          | ⚠️ UNVERIFIABLE |
| AC-06 | Cache `no-store`/`private, no-store` OK; **mas** indisponibilidade de infraestrutura retorna HTTP 200 com UI de 404 (soft 200), não 503/500; `app/error.tsx` não aciona. | ❌ FAIL         |
| AC-07 | Sem resíduo `gradualinfo.pages.dev` no código; valor efetivo de `NEXT_PUBLIC_SITE_URL` local é `http://localhost` e o host de produção não é exercitável sem deploy.     | ⚠️ UNVERIFIABLE |
| AC-08 | Condicional a "100% PASS do Sanity", que não ocorreu; Supabase ainda presente em `lib/services/posts.ts` e `lib/supabase/server.ts`.                                     | ⚠️ UNVERIFIABLE |

Cobertura: 8 ACs — 3 PASS, 1 FAIL, 4 UNVERIFIABLE. `check:all` equivalente nesta
rodada: `pnpm typecheck` exit 0; `pnpm lint` 0 erros (2 warnings preexistentes em
`lib/audit.ts`); unit `sanity-client` 13/13 + `preview-failure-status` 6/6; E2E
`e2e/editorial-sanity.spec.ts` 4/4 PASS contra build de produção TLS.

## Modo review — achados

1. **BLOCKER — spec 0006 fora do contrato do gate.** `scripts/check-contract.mjs`
   exige status literal `**Status**: Accepted` e ACs em `## Requirements` no formato
   `- **id/AC-n**`. A spec 0006 usa `**Status**: Accepted (…)` e `## 7. Critérios de
Aceite (ACs)` com `- [ ] **sanity/AC-01 (...)**:`. O gate não extrai AC nenhum:
   reprova por formato, independentemente do resultado empírico.
2. **FAIL — soft 200 mascara falha de infraestrutura (AC-06).** `lib/preview/auth.ts:167`
   engole o erro e devolve `true`; indisponibilidade do Content Lake vira "não
   encontrado" com HTTP 200.
3. **WARNING — dual-source editorial remanescente.** `lib/services/posts.ts` mantém
   o ramo Supabase como fallback, contrariando o princípio 1 da spec ("não manter duas
   fontes editoriais ativas").
4. **WARNING — árvore suja (184 arquivos, sessões 0006/0007 misturadas).** O verify
   roda contra a árvore, não contra o HEAD limpo.

## Veredito (transcrição literal da autoridade)

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 3,
    "FAIL": 1,
    "UNVERIFIABLE": 4,
    "missingEvidence": 0,
    "BLOCKER": 1,
    "WARNING": 2
  },
  "reasons": [
    "Spec não está Accepted.",
    "Spec sem conjunto único de ACs.",
    "Conjunto de ACs incompleto, duplicado ou diferente da spec.",
    "AC sem PASS: sanity/AC-02",
    "AC sem PASS: sanity/AC-05",
    "AC sem PASS: sanity/AC-06",
    "AC sem PASS: sanity/AC-07",
    "AC sem PASS: sanity/AC-08",
    "BLOCKER: A spec 0006 não é parseável pelo contrato do gate (scripts/check-contract.mjs): o status é \"Accepted (documentação preparada...)\" em vez da linha literal `**Status**: Accepted`, e os ACs vivem em '## 7. Critérios de Aceite (ACs)' com '- [ ] **sanity/AC-01 (...)**:' em vez da seção '## Requirements' com itens `- **id/AC-n**`. Resultado: o gate não extrai AC algum e reprova por formato, independentemente da evidência empírica. Normalizar a spec (ou estender o contrato) antes que o gate consiga avaliar 0006."
  ]
}
```

## Correções acionáveis antes de novo /check

1. **P0 — /architect:** normalizar a spec 0006 ao contrato do gate (status literal
   `**Status**: Accepted` + ACs em `## Requirements` como `- **sanity/AC-NN**`) **ou**
   estender `check-contract.mjs` para aceitar o formato da spec; sem isso o `/check`
   não aprova a 0006 nem que todos os ACs passem.
2. **P0 — /develop:** falha de infraestrutura deve responder 503/500, não soft 200
   com UI de 404 (AC-06). Rever `lib/preview/auth.ts:167` e o caminho de erro do
   Content Lake.
3. **P1 — decisão do usuário:** AC-05 e AC-07 exigem Worker publicado (binding de
   Durable Object e host oficial); permanecem UNVERIFIABLE até autorização de deploy
   ou ambiente equivalente.
4. **P1 — /develop:** desonerar a camada editorial do Supabase (`lib/services/posts.ts`)
   quando o Sanity for 100% PASS (AC-08), sem deleção destrutiva.

## Hash binding

Este relatório vale apenas para `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`.
Não há aprovação a invalidar: o veredito é REPROVADO.
