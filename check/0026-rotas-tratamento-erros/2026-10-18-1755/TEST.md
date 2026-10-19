# /test 0026. Uniformização de rotas e tratamento de erros (Lote L3)

**Date**: 2026-10-18 17:55, America/Sao_Paulo.
**Feature**: Lote L3 da faxina de backend (docs/scope/2026-10-18-1400-faxina-backend.md), spec docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md (Accepted).
**Skill**: /test (rodada de testes automatizados e cobertura dos critérios de aceite).

## Execução

| Campo                | Valor                                                                                                                                                                                                                                                               |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Comando              | pnpm test:run (vitest run)                                                                                                                                                                                                                                          |
| Exit code            | 0                                                                                                                                                                                                                                                                   |
| Resultado            | 83 arquivos, 859 testes, 859 PASS, 0 FAIL, 0 skip                                                                                                                                                                                                                   |
| Novos e estendidos   | **tests**/unit/lib/utils/http-stream.test.ts (5 testes novos), **tests**/unit/lib/utils/api-response.test.ts (5 testes novos), **tests**/unit/lib/offers/route-ingest-ofertas.test.ts (10 testes), **tests**/unit/lib/offers/route-avaliar-selo.test.ts (12 testes) |
| Identidade de versão | HEAD bcdccfb, package.json 2.0.0, Node 22                                                                                                                                                                                                                           |
| Segurança (Step 0)   | Portão satisfeito: pnpm security:secrets e pnpm security:sast exit 0 (0 findings)                                                                                                                                                                                   |

## Cobertura por critério de aceite

| AC                | Onde está a prova                                                                                                                                 | Estado  |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| route-clean/AC-01 | **tests**/unit/lib/utils/http-stream.test.ts (streaming chunked progressivo com cancelamento precoce ao exceder 512 KB e retorno 413)             | coberto |
| route-clean/AC-02 | **tests**/unit/lib/utils/api-response.test.ts (mascaramento de termos internos de SQL), route-ingest-ofertas.test.ts e route-avaliar-selo.test.ts | coberto |
| route-clean/AC-03 | **tests**/unit/lib/utils/api-response.test.ts (envelope padronizado com Cache-Control private, no-store)                                          | coberto |
| route-clean/AC-04 | **tests**/unit/admin-auth.test.ts e lib/admin/auth.ts (reuso de requireAdminSession em todas as rotas administrativas)                            | coberto |
| route-clean/AC-05 | Suíte completa Vitest com 859 testes aprovados sem nenhuma regressão nos contratos existentes                                                     | coberto |

## O que foi testado

### **tests**/unit/lib/utils/http-stream.test.ts (novo, 5 testes)

Valida o consumo de streams em pedaços acumulados de Uint8Array, fast fail quando o cabeçalho Content-Length for maior que o limite configurado, cancelamento imediato do leitor no exato chunk que excede a cota (abortando a leitura sem alocar o payload inteiro em memória), decodificação segura em UTF-8 e captura de falhas de transporte.

### **tests**/unit/lib/utils/api-response.test.ts (novo, 5 testes)

Valida a formatação de envelopes JSON de erro através do helper tipado apiErrorResponse, a presença mandatória do cabeçalho de controle de cache restritivo e a sanitização de erros de RPC do banco de dados, confirmando que nomes de tabelas, restrições e colunas são substituídos por mensagens amigáveis enquanto logs internos preservam os detalhes reais.

### **tests**/unit/lib/offers/route-ingest-ofertas.test.ts e route-avaliar-selo.test.ts (estendidos, 22 testes)

Validam a aplicação integrada do leitor com limite de stream e da sanitização de erros nas rotas de ofertas, confirmando o tratamento de 413 para payloads grandes e 422 ou 409 sem vazamento de detalhes de esquema.

## Estados falhos e não cobertos

- Falhos: nenhum (0 FAIL).
- Não cobertos: nenhum, todos os 5 critérios de aceite contam com cobertura automatizada executada.

## Notas

- A suíte completa Vitest executou 83 arquivos e aprovou 859 testes com tempo total de 16 segundos.
- Linha de base conferida com 0 segredos no Gitleaks e 0 erros no Semgrep.
