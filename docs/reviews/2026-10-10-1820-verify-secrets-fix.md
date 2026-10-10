# Verificação de Correção de Segredos no Bundle — 2026-10-10

**Data**: 2026-10-10 18:20
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md` (SHA-256: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`)
**Commit avaliado**: `4c2bc60e389e4a616448a6b157cdc3c3dd0c6390`
**Árvore avaliada**: `d054fea72ecea80fa45b364a2ec2b28a60ab0081`
**Snapshot**: `/tmp/gradualinfo-check-4c2bc60-clone` (clone limpo, diff vazio)
**Modo**: verify (prova empírica)

---

## Veredito

**REPROVADO** — `scripts/check-decision.mjs` exit 1

| Métrica          | Valor            |
| ---------------- | ---------------- |
| ACs PASS         | 1 (sanity/AC-03) |
| ACs FAIL         | 0                |
| ACs UNVERIFIABLE | 7                |
| BLOCKERs         | 0                |
| WARNINGs         | 0                |

---

## Critérios de Aceite (ACs)

| AC               | Status       | Evidência                              | Observação                                             |
| ---------------- | ------------ | -------------------------------------- | ------------------------------------------------------ |
| sanity/AC-01     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação de runtime com Sanity ativo           |
| sanity/AC-02     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer artigo publicado no dataset Sanity              |
| **sanity/AC-03** | **PASS**     | `next-env.mjs` (sha256: `416accf1...`) | **Bundle sem segredos reais — apenas objetos vazios**  |
| sanity/AC-04     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer teste de preview POST/origem/destino em runtime |
| sanity/AC-05     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer Durable Object publicado na Cloudflare          |
| sanity/AC-06     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer teste de cache headers e 503/404 em runtime     |
| sanity/AC-07     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação de canonical links em produção        |
| sanity/AC-08     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação 100% PASS do Sanity antes             |

---

## Conquistas desta Rodada

**AC-03 (sanity/AC-03) agora PASS**: O bundle `.open-next/cloudflare/next-env.mjs` contém **objetos vazios** (`{}`, `{}`) para `production`, `development` e `test`. Nenhum segredo real (`SANITY_API_READ_TOKEN`, `ADMIN_USER_ID`, `ADMIN_EMAIL`, `SANITY_PROJECT_ID`, `SANITY_ORGANIZATION_ID`, `PREVIEW_SECRET`, `PREVIEW_SIGNING_KEY`) está inlined no build.

Valores reais devem ser configurados como **Worker Secrets** na Cloudflare via `wrangler secret put` antes de qualquer deploy.

---

## ACs UNVERIFIABLE — Pré-condições Ambientais (não gaps de código)

| AC           | Pré-condição necessária                     |
| ------------ | ------------------------------------------- |
| sanity/AC-01 | Sanity ativo com conteúdo publicado         |
| sanity/AC-02 | Artigo publicado no dataset `production`    |
| sanity/AC-04 | Runtime com rota `/api/preview` exercitada  |
| sanity/AC-05 | `PreviewSessionDO` publicado na Cloudflare  |
| sanity/AC-06 | Runtime com headers de cache e falhas reais |
| sanity/AC-07 | Domínio `https://gradualinfo.com.br` ativo  |
| sanity/AC-08 | Gate 100% PASS (depende dos anteriores)     |

Estes ACs exigem infraestrutura de produção ou dados que não existem no ambiente local/isolado. Não são defeitos de implementação.

---

## Evidências Coletadas

| Artefato                                 | SHA-256                                                            | Localização                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| worker.js                                | `d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45` | `docs/reviews/evidence/2026-10-10-1820-verify-secrets-fix/worker.js`    |
| next-env.mjs                             | `416accf14b168ff3fa513587aba2bccc654257a8fc6e7c6aafa679c98a817046` | `docs/reviews/evidence/2026-10-10-1820-verify-secrets-fix/next-env.mjs` |
| Manifesto determinístico (1666 arquivos) | `90edbea9a5633e85322b423ba06c45d549e4b6e4c4f91ab5f6d77d94610669ca` | `.open-next/`                                                           |

---

## Comandos Executados no Snapshot Isolado

```bash
cd /tmp/gradualinfo-check-4c2bc60-clone
pnpm install --frozen-lockfile        # PASS
pnpm check:all                        # PASS (typecheck, lint, format, 510/510 testes)
pnpm build                            # PASS (Next.js 16.4 + OpenNext 1.20.9)
pnpm wrangler deploy --dry-run        # PASS (bindings corretos, dry-run exit 0)
```

---

## Próximos Passos

1. Configurar Worker Secrets na Cloudflare:

   ```bash
   wrangler secret put SANITY_API_READ_TOKEN
   wrangler secret put PREVIEW_SECRET
   wrangler secret put PREVIEW_SIGNING_KEY
   wrangler secret put ADMIN_USER_ID
   wrangler secret put ADMIN_EMAIL
   wrangler secret put SANITY_PROJECT_ID
   wrangler secret put SANITY_ORGANIZATION_ID
   ```

2. Provisionar conteúdo no Sanity (dataset `production`)

3. Publicar `PreviewSessionDO` na Cloudflare

4. Executar `/check verify` em ambiente com runtime exercitável para validar ACs restantes

---

## Decisão do Gate

O veredito é **REPROVADO** conforme `scripts/check-decision.mjs` pois 7 ACs são UNVERIFIABLE. No entanto:

- **AC-03 (o BLOCKER original) agora PASS** — segredos removidos do bundle
- 0 FAIL, 0 BLOCKER, 0 WARNING
- Os UNVERIFIABLE são pré-condições de ambiente, não defeitos de código

A correção do BLOCKER identificado na rodada anterior (`SANITY_API_READ_TOKEN` em texto plano no bundle) está **completa e verificada**.
