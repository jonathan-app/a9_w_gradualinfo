/** @fileoverview 2026-10-10-0515-build-completo-opennext-dry-run.md — registro da retomada do bastão de build: gate verde, build Next, build OpenNext e dry-run do Wrangler sobre a árvore atual, com verificação de alterações concorrentes contra o manifesto das 05:02.

- @module docs/operations
- @description Resultado empírico da rodada de validação de 2026-10-10 05:10 às 05:14: `pnpm check:all` completo, `build:next`, `opennextjs-cloudflare build` e `wrangler deploy --dry-run` sem publicação, mais hashes da saída e confronto com a auditoria comparativa dos ZIPs de 09/10.
- @dependencies scripts/check-decision.mjs, docs/reviews/evidence/2026-10-10-0502-opennext/2026-10-10-0502-source-manifest.json
  */

# Build completo, OpenNext e dry-run — retomada do bastão (2026-10-10 05:10)

**Escopo**: validar a árvore atual de ponta a ponta de build, conforme o bastão de `workflow/STATE.md`, e confrontar a auditoria comparativa dos ZIPs de 09/10 (08:26 × 16:10) com o estado real do repositório.

**Árvore avaliada**: commit `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, tree `9ef0f628b6eef85ca97ae9295b33e4f13343efee`, 273 caminhos sujos (sem commit, sem merge, sem deploy).

## 1. Resultados da rodada

| Verificação      | Comando                         | Resultado                                                                                                                      |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Typecheck        | `pnpm typecheck`                | PASS                                                                                                                           |
| ESLint           | `pnpm lint`                     | PASS                                                                                                                           |
| Prettier         | `pnpm format:check`             | PASS após `--write` em 7 artefatos (1 teste + 6 relatórios/JSON de evidência; só formatação, nenhuma linha de lógica alterada) |
| Testes           | `pnpm test:run`                 | PASS, 334/334 em 34 suítes                                                                                                     |
| Gate completo    | `pnpm check:all`                | **exit 0**                                                                                                                     |
| Build Next       | `pnpm build:next`               | PASS (rotas + Proxy/middleware gerados)                                                                                        |
| Build OpenNext   | `pnpm build`                    | PASS, `Worker saved in .open-next/worker.js`                                                                                   |
| Dry-run Wrangler | `npx wrangler deploy --dry-run` | **exit 0**, 16878.21 KiB / gzip 3817.50 KiB, sem upload                                                                        |

Bindings conferidos no dry-run: `env.PREVIEW_SESSION_DO`, `env.ADMIN_RATE_LIMIT_DO` (Durable Objects), `env.ASSETS`, e as variáveis públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL=https://gradualinfo.com.br`, `NEXT_PUBLIC_SANITY_DATASET=production`). `--dry-run: exiting now` — nenhuma publicação.

## 2. Alterações concorrentes desde 05:02

Manifesto de origem `docs/reviews/evidence/2026-10-10-0502-opennext/2026-10-10-0502-source-manifest.json` (81 entradas públicas: `app` 28, `components` 19, `lib` 24, `public` 1, raiz 9) comparado com a árvore ao vivo:

- Arquivos alterados desde 05:02: **0**
- Arquivos removidos: **0**
- Novos em `app/`, `components/`, `lib/`, `public/` fora do manifesto: **0**

O build desta rodada é, portanto, o primeiro sobre um estado de fonte idêntico ao manifesto, sem artefato antigo reutilizado.

## 3. Evidências geradas

- `docs/reviews/evidence/2026-10-10-0510-opennext/opennext-output.sha256` — 1692 entradas da saída `.open-next`; digest agregado dos hashes `a07e8978e5fd1442907276a72734deb85b75317a198b45366e46ba2c198f7e9d`; sha256 do próprio manifesto `3e9574ef205a08619efc8eae2cd9e4796656d34838a6401eb8e0a59473437e3c`.
- `docs/reviews/evidence/2026-10-10-0510-opennext/2026-10-10-0515-dry-run.log` — log integral do dry-run; sha256 `472e18d77dfe71490829caac30f7d0e28d6641784526ba238302fbb0bd3cdb71`.

O digest do manifesto de saída foi recalculado após o dry-run e permaneceu idêntico, ou seja, o dry-run não alterou o bundle.

### 3.1 Reconstrução às 05:38 após colisão paralela (mesma fonte)

O dono executou `pnpm build:next` e `pnpm build` em paralelo; o OpenNext chama `pnpm build:next` por dentro e o Next abortou com "Another next build process is already running". A primeira tentativa sequencial seguinte falhou com erro opaco (resíduo do `.next` abortado); o retry sequencial passou limpo:

- `pnpm build` (05:38): exit 0, `OpenNext build complete`, fonte inalterada (0 diffs contra o manifesto das 05:02).
- `npx wrangler deploy --dry-run` (05:39): exit 0; log em `2026-10-10-0539-dry-run.log`, sha256 `472e18d77dfe71490829caac30f7d0e28d6641784526ba238302fbb0bd3cdb71` (idêntico ao das 05:15: mesmos bindings, mesma saída empacotada do ponto de vista do Wrangler).
- Manifesto de saída regenerado: 1692 entradas, digest agregado `68805f2d94d5636b4f955ca796df6d82eb661f5c714d67681a682894dc657155`. O digest difere do `a07e8978…` das 05:10 porque o bundle foi reconstruído (timestamps internos variam entre execuções); a fonte é a mesma árvore `ed00c4b`/`9ef0f628`, sem alteração de código.

O `pnpm dev` do dono segue de pé em `localhost:3000` (confirmado: `/` 200, `/api/health` 200, `/admin-dashboard` 503 sem binding Cloudflare, comportamento esperado). Dev server e build Turbopack não são mutuamente exclusivos; a colisão foi só entre dois `next build`.

## 4. Confronto com a auditoria comparativa dos ZIPs

A auditoria externa (ZIP 08:26 × 16:10) foi tratada como insumo, não como autoridade. Confronto com o código e com as specs aceitas:

1. **P1 "quota global de login" — a prescrição conflita com decisão aceita pelo dono.** A recomendação de particionar por IP contradiz a spec `2026-10-09-1632-0009-admissao-admin-access.md` (Accepted), que manda "sem criar contadores por IP" e "Não zerar quotas nem criar namespace por IP", e aceita explicitamente o resíduo: "Um token roubado ou sessão comprometida continua capaz de esgotá-la". A ordem real da rota de login é `guardAdminAccess` → origem/CSRF → quota (`app/api/admin/auth/login/route.ts:32-45`); requisição sem asserção Access retorna antes de tocar o DO, o que é exatamente o cenário da AC-07 ("mesmo com requisições hostis repetidas sem admissão, o proprietário conserva suas cinco tentativas"). STATE.md linha 38 registra que não há decisão aprovada de mudar a chave do DO. Reabrir isso é decisão de `/architect` com aceite do dono, não correção silenciosa.
2. **P1 "testes e evidências inconsistentes" — confirmado e já tratado por vínculo de árvore.** As três fontes citadas (7/7 PASS da frente MFA, 0 PASS/7 UNVERIFIABLE das 15:36, build das 15:45) são níveis de evidência distintos. A rodada desta noite emite uma decisão nova vinculada a `ed00c4b`/`9ef0f628` com gate completo verde, substituindo o artefato de 15:45.
3. **P1 "build e regressão não concluídos" — resolvido nesta rodada** (seção 1): Prettier corrigido, 334/334 testes, build Next, build OpenNext e dry-run, todos sobre a mesma árvore.
4. **P0 "MFA concorrência" e ACs Access — permanecem UNVERIFIABLE**, como já registram STATE e os relatórios 15:36/04:57. Exigem ambiente Supabase descartável e configuração Access remota, sem bypass; nenhuma mudança desta rodada altera isso.
5. **P2 "segredos históricos" — pendência separada e preservada.** Não reavaliada aqui; envolve force-push e rotação, que são decisão do dono.

## 5. O que esta rodada NÃO autoriza

- Nenhum merge, nenhum deploy, nenhuma alteração remota (inclui Access, Supabase e Cloudflare).
- Nenhuma mudança na chave do Durable Object de quota.
- Não aprova as 13 ACs Access: continuam UNVERIFIABLE até haver ambiente autorizado com conta de teste.
- Dry-run é validação de empacotamento, não prova de comportamento em runtime.

## 6. Próximo passo

Rodada de verificação completa (`/check verify`) sobre esta árvore para as provas que dependem de runtime exercitável, seguida das provas Access/DO em ambiente isolado autorizado. A auditoria externa recomenda corrigir a quota antes de verificar; como a correção proposta contraria spec aceita, a via correta é `/architect` com pergunta ao dono antes de qualquer código.
