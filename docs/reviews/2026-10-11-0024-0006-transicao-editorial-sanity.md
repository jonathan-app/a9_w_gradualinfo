# /check verify: Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-11 00:24 (America/Sao_Paulo)
**Modo**: verify (execução empírica contra ambiente real em produção `https://gradualinfo.com.br`)
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
**Sha256 da spec**: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`
**Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
**Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

Contagem do gate: **5 PASS, 0 FAIL, 3 UNVERIFIABLE, 0 evidências ausentes, 0 BLOCKER, 1 WARNING**.

Esta rodada de verificação empírica avaliou diretamente o ambiente implantado em produção na Cloudflare Workers (`https://gradualinfo.com.br`) em cumprimento estrito da spec 0006 e da governança estabelecida pela spec 0012 (`docs/specs/2026-10-10-2228-0012-gate-check-block-resolucao.md`).

## Status dos Critérios de Aceite (ACs)

| AC           | Status           | Evidência                                                | Resumo da Prova Empírica                                                                                                                                                                                                              |
| ------------ | ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sanity/AC-01 | **PASS**         | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | Comprovado que `/` e rotas editoriais não realizam fallback para Supabase. Sob ausência/indisponibilidade de conteúdo no Sanity dataset `production`, o sistema responde 503 com `Cache-Control: private, no-store` e página honesta. |
| sanity/AC-02 | **UNVERIFIABLE** | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | O dataset `production` no Sanity não possui artigos publicados; portanto, a renderização de `<link rel="canonical">` e OpenGraph em rotas `/artigos/[slug]` não pôde ser observada na rede.                                           |
| sanity/AC-03 | **PASS**         | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | Verificado no bundle cliente (`.next/static/` e build de produção) 0 ocorrências de vazamento de valores de token secreto de leitura ou escrita do Sanity.                                                                            |
| sanity/AC-04 | **PASS**         | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | `GET /api/preview` e `/api/preview/logout` retornam HTTP 405 com `Allow: POST`. POST com origem divergente retorna HTTP 403. Validação prévia de payload rejeita slugs maliciosos com HTTP 400 (`Entrada inválida.`).                 |
| sanity/AC-05 | **UNVERIFIABLE** | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | Sem um artigo rascunho no Sanity e credenciais de emissão de preview ativas em produção, o ciclo completo de persistência no `PreviewSessionDO` e rejeição de cópia de cookie pós-logout não pôde ser exercitado ponta a ponta.       |
| sanity/AC-06 | **PASS**         | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | Respostas públicas de preview e de indisponibilidade mantêm `Cache-Control: private, no-store`. Rota inexistente `/artigos/slug-que-nao-existe` e `/` retornam 503 honesto sem mascaramento.                                          |
| sanity/AC-07 | **PASS**         | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | `NEXT_PUBLIC_SITE_URL` configurado para `https://gradualinfo.com.br`. 0 ocorrências de `gradualinfo.pages.dev` em todo o código e bundles.                                                                                            |
| sanity/AC-08 | **UNVERIFIABLE** | `docs/reviews/evidence/2026-10-11-0024-0006/evidence.md` | O descarte/desoneração final do Supabase é expressamente condicionado pela spec à validação 100% PASS do Sanity, a qual ainda não ocorreu devido às pendências de dados e DO.                                                         |

## Findings

**WARNING, sanity/AC-02 & sanity/AC-05.** O dataset Sanity remoto não possui artigos publicados nem artigos de rascunho disponíveis para validar em runtime os metadados e o fluxo de ciclo de vida do cookie de preview no Durable Object.

## Saída da Autoridade de Decisão (`scripts/check-decision.mjs`)

```json
{
  "schemaVersion": 1,
  "evaluatedCommit": "b14dd5191590f0df3b9bd3835ca13f646d09d14f",
  "evaluatedTree": "ee6669d1fd859e281be1c6f09050d5295caa9e8a",
  "spec": {
    "path": "docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md",
    "sha256": "50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38"
  },
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 5,
    "FAIL": 0,
    "UNVERIFIABLE": 3,
    "missingEvidence": 0,
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

## Conclusão e Decisão

**REPROVADO.** O gate de qualidade cumpre a política anti-regressão e rigor empírico: 5 critérios foram comprovados empiricamente contra a produção, mas 3 permanecem estritamente `UNVERIFIABLE` devido à ausência de dados publicados no Sanity e configuração de rascunhos em produção. Nenhuma evidência foi forjada ou inferida.

## Próximo Passo

Publicar pelo menos 1 artigo no Sanity (dataset production) e configurar o fluxo de preview em produção para que `/check verify` possa obter 100% PASS em sanity/AC-02, sanity/AC-05 e sanity/AC-08.
