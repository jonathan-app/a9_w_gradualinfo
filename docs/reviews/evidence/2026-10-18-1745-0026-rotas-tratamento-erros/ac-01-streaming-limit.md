# Evidência de verificação route-clean/AC-01

- Critério: Leitura de corpo de requisições em streaming consome o ReadableStream acumulando contagem progressiva de bytes e aborta imediatamente com HTTP 413 (payload_too_large) quando ultrapassar o limite máximo sem carregar o corpo inteiro em memória.
- Spec de referência: docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md
- Commit avaliado: bcdccfbb7914f6ced419397fdef216d580493f15
- Execução: 2026-10-18

## 1. Implementação do leitor progressivo

O arquivo lib/utils/http-stream.ts implementa readLimitedTextBody:
- Fast fail no cabeçalho Content-Length quando presente e superior a maxBytes.
- Consumo progressivo de pedaços Uint8Array via getReader().
- Aborto e cancelamento imediato do stream na exata iteração em que o acumulador ultrapassar o teto.
- Retorno de status 413 com código payload_too_large.

## 2. Comprovação na suíte de testes unitários

Execução do comando:
pnpm vitest run __tests__/unit/lib/utils/http-stream.test.ts

Resultados observados:
- Teste de corpo vazio retorna texto vazio com sucesso.
- Teste de corpo sob o limite lê e decodifica texto integralmente.
- Teste de rejeição por Content-Length excede limite retorna 413 payload_too_large.
- Teste de streaming chunked sem Content-Length cancela o leitor assim que excede o limite e retorna 413 payload_too_large.
- Teste de erro de leitura retorna 400 read_error.
- Total: 5 testes aprovados (100% PASS).

## 3. Integração nas rotas de ofertas

As rotas app/api/ingest/ofertas/route.ts e app/api/admin/ofertas/[id]/avaliar-selo/route.ts utilizam readLimitedTextBody com teto de 524288 bytes (512 KB), protegendo o runtime do Worker contra estouro de memória em conexões contínuas.

Veredito: PASS
