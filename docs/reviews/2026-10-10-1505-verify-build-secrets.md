# Verificação de Build e Segurança do Bundle — 2026-10-10

**Data**: 2026-10-10 15:05
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md` (SHA-256: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`)
**Commit-base identificado**: `4c2bc60e389e4a616448a6b157cdc3c3dd0c6390`; build executado na árvore principal com alterações locais
**Árvore do snapshot preparado**: `d054fea72ecea80fa45b364a2ec2b28a60ab0081`; snapshot isolado não executado nesta rodada
**Modo**: verify (prova empírica)

---

## Veredito

**REPROVADO** — `scripts/check-decision.mjs` exit 1

| Métrica          | Valor            |
| ---------------- | ---------------- |
| ACs PASS         | 0                |
| ACs FAIL         | 1 (sanity/AC-03) |
| ACs UNVERIFIABLE | 7                |
| BLOCKERs         | 1                |
| WARNINGs         | 2                |

---

## Critérios de Aceite (ACs)

| AC               | Status       | Evidência                              | Observação                                                          |
| ---------------- | ------------ | -------------------------------------- | ------------------------------------------------------------------- |
| sanity/AC-01     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação de runtime com Sanity ativo                        |
| sanity/AC-02     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer comparação de slugs/metadados em produção                    |
| **sanity/AC-03** | **FAIL**     | `next-env.mjs` (sha256: `267a510c...`) | **Token `SANITY_API_READ_TOKEN` em texto plano no bundle servidor** |
| sanity/AC-04     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer teste de preview POST/origem/destino em runtime              |
| sanity/AC-05     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer DO publicado e teste de revogação                            |
| sanity/AC-06     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer teste de cache headers e 503/404 em runtime                  |
| sanity/AC-07     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação de canonical links em produção                     |
| sanity/AC-08     | UNVERIFIABLE | `worker.js` (sha256: `d05223bf...`)    | Requer validação 100% PASS do Sanity antes                          |

---

## Achados (Findings)

### BLOCKER

1. **SANITY_API_READ_TOKEN secret embedded in plain text in `.open-next/cloudflare/next-env.mjs` (server bundle).** Secrets must be provided via Cloudflare Worker secrets at runtime, not baked into the build output.

### WARNING

2. **ADMIN_USER_ID, ADMIN_EMAIL, SANITY_PROJECT_ID, SANITY_ORGANIZATION_ID also appear in next-env.mjs server bundle.** These should be runtime Worker secrets/vars, not build-time constants.

3. **Build variable scope not reviewed:** `.env.local` values are being inlined into `next-env.mjs` instead of being declared as Worker secrets. This violates the principle that secrets never enter build artifacts.

---

## Evidências Coletadas

| Artefato                                 | SHA-256                                                            | Localização                                         |
| ---------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| worker.js                                | `d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45` | cópia gerada removida de `docs/`; hash preservado   |
| next-env.mjs                             | `267a510ccb6aab4c6f51df54f085a53bb18f6226073310d701932540156c346c` | cópia sensível removida de `docs/`; hash preservado |
| Manifesto determinístico (1666 arquivos) | `e8a8683587e5335665cf2fbf94014b3c485bfddab9bd317f91d44b48e409fdda` | `.open-next/`                                       |

---

## Comandos Executados

```bash
pnpm check:all      # PASS (typecheck, lint, format, 510/510 testes)
pnpm build          # PASS (Next.js 16.4 + OpenNext 1.20.9)
pnpm wrangler deploy --dry-run  # PASS (bindings corretos, dry-run exit 0)
```

---

## Análise do BLOQUEIO (AC-03)

O arquivo `.open-next/cloudflare/next-env.mjs` contém o valor real do `SANITY_API_READ_TOKEN` (token `[REDACTED]`) em texto plano nas exportações `production` e `development`.

Este arquivo é importado pelo inicializador do adaptador OpenNext e fará parte do bundle enviado ao Cloudflare Workers. Segredos **nunca** devem estar em artefatos de build — devem ser configurados como **Worker Secrets** na Cloudflare e injetados em runtime via `wrangler secret put`.

### Correção Necessária (para /develop)

1. Remover `SANITY_API_READ_TOKEN` e outras variáveis sensíveis de `.env.local` e `.env.production.local` usadas no build
2. Declarar estas variáveis como Worker Secrets na Cloudflare:
   ```bash
   wrangler secret put SANITY_API_READ_TOKEN
   wrangler secret put PREVIEW_SECRET
   wrangler secret put PREVIEW_SIGNING_KEY
   wrangler secret put ADMIN_USER_ID
   # ... etc
   ```
3. Ajustar `lib/env.ts` e o adaptador para ler do `process.env` em runtime (já disponível via Worker secrets) em vez de inlined no build
4. Garantir que `next-env.mjs` contenha apenas referências a `process.env.VAR_NAME` ou placeholders, nunca valores reais

---

## Próximos Passos

1. **/develop**: Implementar a correção acima (mover segredos para Worker Secrets)
2. **/check verify**: Re-executar após a correção para validar AC-03 como PASS
3. **/test**: Adicionar teste de regressão que verifica ausência de segredos no bundle
4. Só então avançar para merge/deploy

---

## Decisão do Gate

O veredito é **REPROVADO** conforme `scripts/check-decision.mjs`. Não há aprovação para merge ou deploy até que:

- AC-03 seja PASS (segredo removido do bundle)
- Pelo menos 1 AC seja PASS com evidência empírica
- 0 FAIL, 0 UNVERIFIABLE, 0 BLOCKER
