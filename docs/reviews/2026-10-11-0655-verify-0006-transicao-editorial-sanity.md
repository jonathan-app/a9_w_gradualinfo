# /check verify — Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-11 06:55 (America/Sao_Paulo)  
**Modo**: verify (prova empírica)  
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`  
**Sha256 da spec**: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`  
**Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`  
**Tree**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`  
**Evidência base**: `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` (sha256 `ad854166cd14dde0b8e78ffcb96c199cbfe4d15b9a23722f019c2e8bd5888479`)  
**Resultado do gate**: `scripts/check-decision.mjs` → **REPROVADO** (exit 1)

---

## Veredito

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 5,
    "FAIL": 0,
    "UNVERIFIABLE": 3,
    "BLOCKER": 0,
    "WARNING": 1
  },
  "reasons": [
    "AC sem PASS: sanity/AC-02",
    "AC sem PASS: sanity/AC-05",
    "AC sem PASS: sanity/AC-08"
  ]
}
```

---

## Critérios de Aceite — Status Detalhado

| AC           | Status           | Evidência                                                                                                                                                                                          |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sanity/AC-01 | **PASS**         | Dual-source fallback ativo por design de transição; Sanity primário quando configurado (`isSanityConfigured` gate). Código em `lib/services/posts.ts`, `lib/sanity/client.ts`.                     |
| sanity/AC-02 | **UNVERIFIABLE** | Requer artigo publicado no dataset Sanity `production` (projeto `4iipvaar`) para validar canonical/OpenGraph em produção. Dataset vazio na execução.                                               |
| sanity/AC-03 | **PASS**         | Secrets fora do bundle: `next-env.mjs` objetos vazios; headers de resposta sem tokens; bundle client-side auditado (0 vazamentos).                                                                 |
| sanity/AC-04 | **PASS**         | POST `/api/preview`: origin check 403 (evil.com), slug validation 400 (maliciosos), token inválido 401, HMAC-SHA256 key separation verificado em `lib/preview/session.ts`.                         |
| sanity/AC-05 | **UNVERIFIABLE** | Requer `PreviewSessionDO` deployado no Worker produção para validar fluxo completo: emissão cookie → renderização 200 → revogação síncrona no DO → cookie reuse 404. DO não deployado na execução. |
| sanity/AC-06 | **PASS**         | Cache-Control: `private, no-store` em `/artigos/*`; 404 real para inexistente; 503 honesto (`Retry-After: 5`) quando Sanity indisponível.                                                          |
| sanity/AC-07 | **PASS**         | `NEXT_PUBLIC_SITE_URL=https://gradualinfo.com.br`; 0 ocorrências `pages.dev` no bundle; metadata canonical/og apontam para domínio próprio.                                                        |
| sanity/AC-08 | **UNVERIFIABLE** | Gate de transição exige 100% PASS prévio (7 PASS + 0 FAIL + 0 UNVERIFIABLE). Bloqueado por AC-02 e AC-05 UNVERIFIABLE.                                                                             |

---

## Findings

| Severidade  | Descrição                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WARNING** | Artigos não publicados no dataset Sanity impedem validação empírica de canonical/OpenGraph (AC-02) e de fluxo ativo de preview com revogação no DO (AC-05). AC-08 depende dos dois. |

---

## Causa Raiz dos UNVERIFIABLE

| AC    | Pré-condição faltante                                                                             | Ação necessária                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| AC-02 | Artigo(s) publicado(s) no Sanity Studio (dataset `production`, projeto `4iipvaar`)                | Publicar ≥1 artigo no Sanity                                                                         |
| AC-05 | `PreviewSessionDO` deployado no Worker produção + `PREVIEW_SECRET`, `PREVIEW_SIGNING_KEY` secrets | `wrangler deploy` + `wrangler secret put PREVIEW_SECRET` + `wrangler secret put PREVIEW_SIGNING_KEY` |
| AC-08 | AC-02 e AC-05 PASS                                                                                | Resolver os dois acima                                                                               |

---

## Próximos Passos para APROVADO

1. **Sanity Studio**: Publicar ≥1 artigo no dataset `production` (projeto `4iipvaar`)
2. **Worker**: `wrangler deploy` (publica código + `PreviewSessionDO` + `AdminRateLimitDO`)
3. **Secrets**: `wrangler secret put` para `PREVIEW_SECRET`, `PREVIEW_SIGNING_KEY`, `SANITY_API_READ_TOKEN`, `ADMIN_ACCESS_ISSUER`, `ADMIN_ACCESS_AUDIENCE`, `ADMIN_ACCESS_EMAIL`, `ADMIN_ACCESS_HOSTS`, `ADMIN_USER_ID`
4. **Cloudflare Access**: Criar Application + Policy cobrindo `/admin-dashboard*`, `/api/admin*`
5. **Re-executar verify**: `/check verify` empírico contra `https://gradualinfo.com.br` → novo `check-result.json` → `check-decision.mjs` → APROVADO (8 PASS, 0 UNVERIFIABLE)

---

## Referências

- Spec: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
- Evidência bruta: `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md`
- Review anterior (code): `docs/reviews/2026-10-11-0352-0006-transicao-editorial-sanity-review.md`
- Review follow-up (BLOCKERS resolvidos): `docs/reviews/2026-10-11-0545-0006-transicao-editorial-sanity-review-followup.md`
- Script verify preview: `scripts/verify-preview-lifecycle.py` (5/5 etapas PASS em execução local reportada, mas não refletido neste resultado)
