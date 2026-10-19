# Evidência de verificação route-clean/AC-02

- Critério: Sanitização completa de erros de RPC do PostgreSQL em rotas de ingestão e avaliação de selo, retornando código genérico e amigável com HTTP 422/409, silenciando mensagens e códigos internos do PostgreSQL para o cliente e registrando detalhes reais nos logs do servidor.
- Spec de referência: docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md
- Commit avaliado: bcdccfbb7914f6ced419397fdef216d580493f15
- Execução: 2026-10-18

## 1. Implementação da sanitização

O módulo lib/utils/api-response.ts implementa a função sanitizeRpcErrorMessage:
- Inspeciona mensagens de erro brutas do PostgreSQL e Supabase.
- Identifica padrões de vazamento de esquema como relation, table, constraint, column, syntax error, violates, foreign key e unique constraint.
- Substitui termos técnicos por mensagem de contingência genérica e segura.
- Preserva mensagens de validação negocial puras que não contenham termos de banco.
- Detalhes reais como rpcError.message e rpcError.code são impressos exclusivamente via console.error no servidor para auditoria interna.

## 2. Comprovação na suíte de testes de rotas

Execução do comando:
pnpm vitest run __tests__/unit/lib/offers/route-ingest-ofertas.test.ts __tests__/unit/lib/offers/route-avaliar-selo.test.ts

Resultados observados:
- Teste handleIngestOfertas sanitiza vazamento de erro de banco de dados no retorno 422 da RPC: PASS.
- Teste handleAvaliarSelo mascara mensagem de erro de RPC que vaza detalhes internos de SQL: PASS.
- Testes confirmam que respostas para o cliente retornam evaluation_transaction_failed ou operation_key_payload_conflict sem nomes de tabelas como offers ou restrições como fk_offers_merchants.
- Total: 22 testes de rota aprovados (100% PASS).

Veredito: PASS
