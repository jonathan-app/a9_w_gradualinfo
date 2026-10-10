# /check verify — Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-09 16:30 (America/Sao_Paulo)
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
**Commit**: `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`
**Tree**: `9ef0f628b6eef85ca97ae9295b33e4f13343efee`
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

## Bloqueio de parsing

O gate `scripts/check-decision.mjs` não consegue extrair os ACs da spec 0006 porque o formato atual usa checkbox Markdown:

```
- [x] **sanity/AC-01**: A home e a rota `/artigos/[slug]`...
```

O regex em `scripts/check-contract.mjs:83` espera o formato sem checkbox:

```
- **sanity/AC-01**: A home e a rota `/artigos/[slug]`...
```

O regex `^- \*\*([^*]+\/AC-\d+)\*\*/gm` não captura `- [x] **sanity/AC-01**:` porque o `[x]` quebra o padrão.

## Resultado do script

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 8,
    "FAIL": 0,
    "UNVERIFIABLE": 0,
    "missingEvidence": 0,
    "BLOCKER": 0,
    "WARNING": 2
  },
  "reasons": [
    "Spec sem conjunto único de ACs.",
    "Conjunto de ACs incompleto, duplicado ou diferente da spec."
  ]
}
```

## ACs verificados manualmente

Embora o gate não parseie, verifiquei cada AC contra o código:

| AC           | Status | Resumo                                                               |
| ------------ | ------ | -------------------------------------------------------------------- |
| sanity/AC-01 | PASS   | Home e artigo vêm exclusivamente do Sanity quando configurado        |
| sanity/AC-02 | PASS   | Slugs preservados; canonical e OpenGraph usam SITE_ORIGIN            |
| sanity/AC-03 | PASS   | Token do Sanity só no servidor; não vaza no bundle cliente           |
| sanity/AC-04 | PASS   | POST exclusivo; segredo no corpo; origem e slug validados            |
| sanity/AC-05 | PASS   | Sessão persistida antes do cookie; TTL 1800s; falha fechada 404/503  |
| sanity/AC-06 | PASS   | Cache-Control no-store; 404 real; 503 para indisponibilidade         |
| sanity/AC-07 | PASS   | NEXT_PUBLIC_SITE_URL sem resíduos de gradualinfo.pages.dev no código |
| sanity/AC-08 | PASS   | Supabase desonerado do editorial; backup preservado                  |

## Correção necessária

Para o gate funcionar, a spec 0006 precisa ser normalizada para o formato esperado:

```diff
- - [x] **sanity/AC-01**: A home e a rota `/artigos/[slug]`...
+ - **sanity/AC-01**: A home e a rota `/artigos/[slug]`...
```

Ou o regex em `scripts/check-contract.mjs:83` precisa ser atualizado para aceitar checkbox.

## Evidências

Os arquivos de evidência estão em `check/editorial-sanity/2026-10-09-1630/evidence/`.

## Decisão

**REPROVADO** por bloqueio de parsing. A spec precisa ser normalizada antes de nova validação.

## Próxima etapa

`/architect` para normalizar o formato da spec 0006 (remover checkbox ou ajustar o regex do gate).
