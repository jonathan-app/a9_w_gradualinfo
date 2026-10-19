# Evidência de verificação route-clean/AC-03

- Critério: Padronização do envelope JSON de erro nas rotas de API públicas e administrativas através de helper tipado apiErrorResponse(status, error, message), garantindo coerência de formato.
- Spec de referência: docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md
- Commit avaliado: bcdccfbb7914f6ced419397fdef216d580493f15
- Execução: 2026-10-18

## 1. Implementação do envelope padronizado

O helper apiErrorResponse em lib/utils/api-response.ts estabelece:
- Assinatura tipada: apiErrorResponse(status, error, message, details?)
- Envelope uniforme contendo os campos error e message, com details opcional.
- Inclusão mandatória do cabeçalho Cache-Control com valor private, no-store para mitigar armazenamento indevido em proxies intermediários.

## 2. Comprovação na suíte de testes unitários

Execução do comando:
pnpm vitest run __tests__/unit/lib/utils/api-response.test.ts

Resultados observados:
- Teste monta resposta com status, error e message esperados: PASS.
- Teste inclui details quando fornecido e omite chave quando ausente: PASS.
- Teste define cabeçalho Cache-Control private no-store: PASS.
- Total: 5 testes aprovados (100% PASS).

Veredito: PASS
