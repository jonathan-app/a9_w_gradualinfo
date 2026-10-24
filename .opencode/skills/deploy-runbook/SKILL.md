---
name: deploy-runbook
description: Runbook de staging, secrets do Worker, smoke pós-deploy e rollback do GradualInfo (OpenNext + Cloudflare + Supabase + Sanity).
license: MIT
compatibility: opencode
metadata:
  project: gradualinfo
  phase: agency-10
---

## Quando usar

Preparar, documentar ou executar promoção para ambiente não-local; validar vars do Worker; montar checklist de rollback. Não usar para feature de produto sem deploy.

## Fonte de verdade

1. `AGENTS.md`, `README.md`, `wrangler.jsonc`, `lib/env.ts`
2. `docs/operations/**` (ops já existentes)
3. Scripts: `pnpm build`, `pnpm deploy`, dry-run Wrangler
4. Aviso do wrangler: `NEXT_PUBLIC_*` no runtime do Worker vêm de bindings/secrets, não só de `.env` local

## Entregáveis

1. **Checklist pré-deploy** (secrets/vars obrigatórios, dataset Sanity, Supabase URL/anon).
2. **Smoke pós-deploy**: `GET /api/health` 200; home 200 com conteúdo ou banner honesto; um artigo publicado 200; admin não indexável.
3. **Rollback**: versão Worker anterior + o que não reverter (migrations).
4. Atualização ou novo doc em `docs/operations/` com data no nome, se o usuário pedir persistir.

## Passos

1. Listar vars em `.env.example` e cruzar com `wrangler.jsonc` `vars` + secrets esperados.
2. Confirmar que placeholders de `lib/env.ts` não vazam para produção (anon key real no Worker).
3. Preferir `pnpm exec wrangler deploy --dry-run` / `pnpm build` antes de deploy real.
4. Nunca imprimir valores de secrets nos arquivos ou na resposta.
5. Se não houver staging, propor Worker + dataset + projeto Supabase de homologação sem implementá-los sozinho sem aprovação.

## Restrições

- Não fazer `deploy` real sem pedido explícito do usuário.
- Não commitar `.env`, `.dev.vars` ou tokens.
- Não apagar `keep_vars` do wrangler sem motivo documentado.

## Critério de pronto

- Checklist copiável e ordenado.
- Smoke e rollback descritos em passos objetivos.
- Lacunas (ex. staging ausente) explícitas, não escondidas.