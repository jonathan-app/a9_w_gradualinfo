# /check verify — spec 0011 (reverificação)

**Veredito:** REPROVADO. Os quatro resultados foram calculados por `scripts/check-decision.mjs` com o conjunto exato de ACs de cada spec. O checkout está modificado; commit base `b14dd5191590f0df3b9bd3835ca13f646d09d14f`, árvore base `ee6669d1fd859e281be1c6f09050d5295caa9e8a`.

| Contrato    | PASS | FAIL | UNVERIFIABLE | Resultado |
| ----------- | ---: | ---: | -----------: | --------- |
| Índice 0011 |    0 |    1 |            3 | REPROVADO |
| CI e /check |    0 |    0 |            5 | REPROVADO |
| Skills      |    0 |    2 |            2 | REPROVADO |
| MCP         |    0 |    0 |            3 | REPROVADO |

## Evidência observada

- `node scripts/check-targets.mjs`: exit 0, enumera nove specs. Não prova os casos negativos nem a agregação em CI.
- `node scripts/check-skills.mjs`: exit 1, divergência de conteúdo ou origem em `architect`. Isto reprova `skills/AC-01` e `governance/AC-02` no checkout atual.
- `node scripts/check-portability.mjs`: exit 1, 16 ocorrências em `architect/DELEGATION.md`. Isto reprova `skills/AC-03` no checkout atual.
- `node scripts/check-mcp-config.mjs`: exit 0. A validação estática não registra versão iniciada, descoberta e chamada MCP real.
- `git ls-remote --symref origin HEAD`: exit 128 por permissão da configuração SSH local; branch padrão remoto não confirmado nesta execução.
- CI remota não foi executada para esta árvore. Não há prova por spec com commit, árvore, hashes e resultado no checkout avaliado. O cliente MCP desta sessão não disponibiliza Playwright MCP, logo não houve chamada real à `/api/health`.

Os quatro resultados JSON, decisões e observações com hash estão em [evidências](evidence/2026-10-11-0401-0011/2026-10-11-0401-observacoes.md). As razões emitidas por `check-decision.mjs` são `AC sem PASS: <id>` para todos os 16 ACs; os IDs e estados exatos constam nos arquivos de decisão adjacentes. Nenhuma evidência tem hash ausente.

## Correções necessárias

1. Em `/develop`, reconciliar a instalação local de `architect` com o catálogo e remover o arquivo extra `architect/DELEGATION.md` do conjunto materializado, ou admitir seu conteúdo pelo processo definido na spec. Reexecutar as duas guardas até exit 0 e provar os casos extra, ausente e alterado.
2. Executar a matriz com resultado próprio de cada uma das nove specs, inclusive os três contratos filhos da 0011; provar os casos negativos e o vínculo ao checkout. Confirmar o branch padrão remoto e o disparo efetivo da CI.
3. No cliente que usará MCP, registrar ferramenta descoberta, versão efetivamente iniciada e chamada real de Playwright à URL local, com resposta e captura hashada; testar rejeição de host Supabase que não seja loopback.
4. Reexecutar `/check verify` após as correções. O relatório `2026-10-11-0254-0011-governanca-verify.md` declarou aprovação sem resultados para os três contratos filhos e sem provas rastreáveis para todos os ACs; não serve como aceite da spec completa.

Nenhum merge ou deploy foi executado nesta verificação.
