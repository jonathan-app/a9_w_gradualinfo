# `/check review` — lacunas 2 e 3

**Data:** 2026-10-21 01:16 (America/Sao_Paulo)  
**Modo:** revisão independente do diff  
**Contrato principal da autoridade:** Spec 0021  
**Contratos conectados:** Specs 0017 e 0025  
**Veredito da autoridade:** **REPROVADO**

## Resumo

- 1 PASS
- 0 FAIL
- 8 UNVERIFIABLE
- 2 BLOCKERs
- 2 WARNINGs
- 0 evidências ausentes

O modelo independente confirmou que a assinatura precede o consumo do nonce nas duas rotas, que a chave primária `(collector_id, nonce)` fornece exclusão atômica no PostgreSQL e que não existe fallback em memória em produção. Também confirmou a correspondência dos vetores incorporados com a RFC 8785.

A consolidação do gate encontrou dois bloqueios objetivos que impedem merge.

## Achados

### BLOCKER 1 — ESLint reprovado no próprio diff

Arquivo: `app/api/admin/ofertas/[id]/avaliar-selo/route.ts:118`

O cast `serviceClient as any` viola `@typescript-eslint/no-explicit-any`. O ESLint focado terminou com código 1.

Correção: tornar `SupabaseLikeClient` estruturalmente compatível com `SupabaseClientForWebhookNonce`, ou declarar uma variável com a interface específica, sem `any`.

### BLOCKER 2 — array esparso gera JSON inválido

Arquivo: `lib/offers/evidence-canonicalizer.ts:142-144`

`Array.prototype.map` ignora índices ausentes. Um valor como `[, 1]` forma `[,1]`, que não é JSON válido e não pode ser representação canônica RFC 8785.

Correção: rejeitar arrays com índices ausentes usando `InvalidEvidenceFormatError` e acrescentar uma regressão focada. Converter lacunas para `null` só deve ocorrer se esse comportamento for deliberadamente incorporado ao contrato.

### WARNING 1 — concorrência real não executada

Os mocks cobrem sucesso, `23505` e falha de armazenamento. A PK fornece a garantia estrutural, mas esta revisão não abriu duas conexões Supabase simultâneas disputando o mesmo nonce. A homologação de produção permanece pendente.

### WARNING 2 — identidade do webhook legado

O webhook legado persiste nonces sob `collector_id = webhook_collector` e produz `actorId` a partir do prefixo do nonce, não de uma identidade autenticada do coletor. É comportamento anterior ao diff, mas impede declarar concluída a unificação do contrato da Spec 0021.

## Validações executadas

| Validação                                                    | Resultado                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Vitest focado em canonicalizer, webhook, rota admin e ingest | 70/70 PASS, exit 0                                        |
| TypeScript `tsc --noEmit`                                    | PASS, exit 0                                              |
| ESLint focado                                                | FAIL, exit 1, um `no-explicit-any`                        |
| Revisão independente por modelo diferente                    | Concluída; nenhum defeito adicional introduzido pelo diff |
| Supabase real e disputa concorrente                          | Não executados                                            |

## Critérios da Spec 0021

`ofertas-pipeline/AC-08` recebeu PASS por inspeção e testes focados. AC-01 a AC-07 e AC-09 não pertenciam ao recorte executado e ficaram UNVERIFIABLE; o gate não reutilizou provas antigas como se fossem desta árvore.

A conformidade RFC 8785 corresponde a `fatia4-arch/AC-01` da Spec 0017, mas essa spec histórica não possui o formato `## Requirements` aceito pela autoridade atual; o resultado foi registrado como achado conectado, sem forjar sua inclusão na matriz da Spec 0021.

## Decisão executável

Comando:

`node scripts/check-decision.mjs check/security-gaps-2-3/2026-10-21-0116-review/results.json --spec docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`

Código de saída: `1`.

Reasons transcritas integralmente:

1. `AC sem PASS: ofertas-pipeline/AC-01`
2. `AC sem PASS: ofertas-pipeline/AC-02`
3. `AC sem PASS: ofertas-pipeline/AC-03`
4. `AC sem PASS: ofertas-pipeline/AC-04`
5. `AC sem PASS: ofertas-pipeline/AC-05`
6. `AC sem PASS: ofertas-pipeline/AC-06`
7. `AC sem PASS: ofertas-pipeline/AC-07`
8. `AC sem PASS: ofertas-pipeline/AC-09`
9. `BLOCKER: app/api/admin/ofertas/[id]/avaliar-selo/route.ts:118 introduz \`serviceClient as any\`; o ESLint obrigatório reprova com @typescript-eslint/no-explicit-any. Remover o cast e alinhar estruturalmente as interfaces antes do merge.`
10. `BLOCKER: lib/offers/evidence-canonicalizer.ts:142-144 usa Array.map, que ignora lacunas; um array esparso pode gerar JSON canônico inválido como \`[,1]\`. Rejeitar índices ausentes com InvalidEvidenceFormatError e adicionar regressão.`

## Artefatos

- Resultado: `check/security-gaps-2-3/2026-10-21-0116-review/results.json`
- Evidência: `docs/reviews/evidence/2026-10-21-0116-review-lacunas-2-3/review-evidence.md`
- Relatório anterior da lacuna 3: `docs/reviews/2026-10-21-0111-rfc-8785-canonicalizer.md`

Nenhum código de aplicação ou teste foi corrigido por `/check`. Nenhum commit, push, merge ou deploy foi executado.
