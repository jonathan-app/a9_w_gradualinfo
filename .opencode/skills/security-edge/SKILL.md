---
name: security-edge
description: Fecha SEC-01 a SEC-05 do GradualInfo — limite de stream na ingestão, sanitização de erros RPC, ciclo de vida de nonces, anti-replay compartilhado e timestamp estrito.
license: MIT
compatibility: opencode
metadata:
  project: gradualinfo
  phase: agency-10
  audit: 2026-10-18-1255-security-audit-codebase
---

## Quando usar

Implementar, revisar ou verificar o hardening de borda das rotas de ofertas e ingestão (SEC-01 a SEC-05). Não usar para auth admin/MFA genérico.

## Fonte de verdade

1. `docs/audits/2026-10-18-1255-security-audit-codebase.md`
2. Spec/escopo Fase 5 backend (defesa de borda e nonces)
3. Código: `lib/offers/ingest-auth.ts`, `lib/offers/webhook-auth.ts`, rotas `app/api/ingest/**`, `app/api/admin/ofertas/**/avaliar-selo/**`
4. Testes: `__tests__/unit/lib/offers/**`

## Achados obrigatórios

| ID | Ação |
|----|------|
| SEC-01 | Limite de tamanho de body/stream na ingestão (ex. 512 KB); rejeitar acima com 413/400 sem processar |
| SEC-02 | Sanitizar erros de RPC/DB na resposta HTTP — sem stack, SQL ou detalhe interno |
| SEC-03 | Ciclo de vida de nonces: validação + rotina de expurgo de `consumed_at` antigo |
| SEC-04 | Unificar anti-replay: banir cache só em memória em multi-edge; usar tabela compartilhada (como `offers_ingest_nonces`) em todas as rotas receptoras |
| SEC-05 | Timestamp de assinatura: só aceitar `/^\d{10,13}$/` antes de parseInt |

## Passos

1. Ler o relatório de auditoria e localizar cada SEC no código atual.
2. Planejar diffs mínimos — não alterar contratos públicos de sucesso sem necessidade.
3. Implementar SEC-01…05 com testes unitários que falhariam antes do patch.
4. Rodar `pnpm typecheck` e testes de `lib/offers` (ou `pnpm test:run` se o escopo for seguro).
5. Registrar evidência em `docs/reviews/` (o que mudou, comandos, resultado).
6. Não commitar segredos; não enfraquecer RLS nem service role.

## Restrições

- Não usar `MemoryNonceCache` como única defesa em produção/multi-edge.
- Não logar assinaturas, nonces crus ou service role.
- Comentários e JSDoc novos em pt-BR, só se o arquivo já seguir o padrão do repo.
- Não editar `AGENTS.md` salvo instrução explícita do usuário.

## Critério de pronto

- Os cinco SEC tratados no código ou justificativa documentada de N/A.
- Testes novos/atualizados passando.
- Sem regressão em `pnpm typecheck`.
- Nota de evidência escrita para review.