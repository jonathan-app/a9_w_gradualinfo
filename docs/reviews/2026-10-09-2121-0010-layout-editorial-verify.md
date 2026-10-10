# /check verify da spec 0010

**Veredito: REPROVADO**, autoridade scripts/check-decision.mjs, exit 1. Contagem: 0 PASS, 0 FAIL, 10 UNVERIFIABLE, 0 BLOCKER, 0 evidências ausentes. Nenhum defeito funcional novo foi demonstrado nesta rodada.

Contrato Accepted: `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`.

## Verificação executada

Tipos e ESLint global exit 0; Prettier da feature exit 0. Vitest: 308 PASS e 18 testes bloqueados em git init por spawnSync git EPERM, exit 1. Next dev porta 3012: listen EPERM, exit 1. Solicitação de servidor fora do sandbox pendente, sem aprovação/rejeição presumida. A solicitação anterior de gates ampliados também permanece pendente. MCP Playwright não disponível nesta rodada.

Sem servidor exercitável, não há screenshots, prova em cinco larguras, navegação por teclado, dois temas, falhas de imagem, comparação admin ou regressões reais de SEO/preview. Esses limites não autorizam bypass de segurança, alteração de aplicação nem aprovação por leitura do código.

## Critérios de aceite

| AC                     | Status       | Evidência                                                       |
| ---------------------- | ------------ | --------------------------------------------------------------- |
| layout-editorial/AC-01 | UNVERIFIABLE | [AC-01](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-01.md) |
| layout-editorial/AC-02 | UNVERIFIABLE | [AC-02](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-02.md) |
| layout-editorial/AC-03 | UNVERIFIABLE | [AC-03](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-03.md) |
| layout-editorial/AC-04 | UNVERIFIABLE | [AC-04](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-04.md) |
| layout-editorial/AC-05 | UNVERIFIABLE | [AC-05](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-05.md) |
| layout-editorial/AC-06 | UNVERIFIABLE | [AC-06](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-06.md) |
| layout-editorial/AC-07 | UNVERIFIABLE | [AC-07](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-07.md) |
| layout-editorial/AC-08 | UNVERIFIABLE | [AC-08](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-08.md) |
| layout-editorial/AC-09 | UNVERIFIABLE | [AC-09](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-09.md) |
| layout-editorial/AC-10 | UNVERIFIABLE | [AC-10](evidence/2026-10-09-2121-0010/2026-10-09-2121-ac-10.md) |

## Reasons da autoridade

- AC sem PASS: layout-editorial/AC-01
- AC sem PASS: layout-editorial/AC-02
- AC sem PASS: layout-editorial/AC-03
- AC sem PASS: layout-editorial/AC-04
- AC sem PASS: layout-editorial/AC-05
- AC sem PASS: layout-editorial/AC-06
- AC sem PASS: layout-editorial/AC-07
- AC sem PASS: layout-editorial/AC-08
- AC sem PASS: layout-editorial/AC-09
- AC sem PASS: layout-editorial/AC-10

## Rastreabilidade e próximo passo

Resultado completo, saída da autoridade, manifesto da implementação e logs resumidos em `docs/reviews/evidence/2026-10-09-2121-0010/`. evaluatedCommit/evaluatedTree identificam a base Git, não representam a árvore suja inteira; hashes do manifesto identificam os seis arquivos de implementação não commitada avaliados nesta rodada.

Retomar /check verify quando o servidor e navegador puderem executar, com conteúdo editorial controlado suficiente para os volumes 0/1/2/3/4/10 e artigo completo. Não promover testes unitários a prova empírica dos ACs. O bloqueio independente da home sob falha editorial continua na fila vigente. Sem merge/deploy, sem alteração da spec Accepted e sem alteração de código de aplicação.
