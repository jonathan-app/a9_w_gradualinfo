# Rascunho de PR: 0026. Uniformização de rotas e tratamento de erros (Lote L3)

- Data: 2026-10-18 18:10, America/Sao_Paulo.
- Feature: Lote L3 da faxina de backend (docs/scope/2026-10-18-1400-faxina-backend.md), spec docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md (Accepted).
- Estado da árvore: trabalho local não commitado na branch main; abertura remota do PR depende de branch dedicada e autorização do proprietário.

## Título

feat: uniformizacao de rotas, protecao de streams e sanitizacao rpc

## Corpo

## What

Este PR implementa a proteção contra esgotamento de memória em streaming e a sanitização de erros de banco de dados nas rotas de API do GradualInfo. A leitura de corpos com Transfer Encoding chunked passa a ser consumida progressivamente através de Web Streams nativo com cancelamento precoce ao atingir 512 KB. As mensagens de erro de transações RPC do PostgreSQL são higienizadas para ocultar detalhes de tabelas e restrições internas do cliente externo. O envelope JSON de erro foi padronizado através do utilitário apiErrorResponse com cabeçalhos de controle de cache restritivos.

## Why

Durante a auditoria de qualidade do backend (Lote L0), identificamos que endpoints de ofertas consumiam requisições via await request.text() sem limite progressivo de bytes, criando risco de saturação de memória no runtime de Workers da Cloudflare sob payloads gigantescos em stream. Além disso, falhas em transações RPC do PostgreSQL retornavam rpcError.message diretamente na resposta JSON 422, expondo nomes de tabelas como offers e restrições como fk_offers_merchants. A Spec 0026 elimina essas vulnerabilidades de segurança e estabilidade com o menor diff possível, mantendo 100 por cento de compatibilidade com os contratos existentes.

## Changes

- Leitor progressivo de corpo com limite (lib/utils/http-stream.ts): implementa readLimitedTextBody utilizando Web Streams nativo; realiza fast fail imediato quando o cabeçalho Content-Length exceder a cota e consome pedaços Uint8Array acumulando contagem progressiva de bytes; ao ultrapassar 512 KB, cancela o stream imediatamente e retorna HTTP 413 payload_too_large sem alocar o payload completo em memória.
- Respostas padronizadas e sanitização RPC (lib/utils/api-response.ts): helper apiErrorResponse tipado produzindo envelopes uniformes { error, message, details? } com cabeçalho Cache-Control: private, no-store; função sanitizeRpcErrorMessage que detecta termos técnicos de SQL (relation, table, constraint, column, syntax error, foreign key) e os substitui por mensagens amigáveis seguras, mantendo o erro detalhado nos logs do servidor.
- Rota de ingestão de ofertas (app/api/ingest/ofertas/route.ts): substituição de await request.text() por readLimitedTextBody; mascaramento de mensagens de transação RPC para HTTP 422 e 409 com logs de erro preservados no servidor.
- Rota de avaliação de selo (app/api/admin/ofertas/[id]/avaliar-selo/route.ts): leitura protegida com readLimitedTextBody e higienização de erros de RPC do Supabase.
- Guarda administrativa (lib/admin/auth.ts): exportação formal de requireAdminSession como alias de assertAdminApiAuth, unificando a verificação de sessão administrativa com exigência cumulativa de AAL2 e controle de origem.
- Suíte de testes: 10 testes unitários novos em **tests**/unit/lib/utils/http-stream.test.ts (5 testes) e api-response.test.ts (5 testes); 22 testes de rotas atualizados em route-ingest-ofertas.test.ts e route-avaliar-selo.test.ts, totalizando 859 testes aprovados em 83 arquivos Vitest.

## How to test / verify

- Execute `pnpm check:all` e confirme a aprovação integral de typecheck, lint, formatação e testes unitários (859 testes PASS em 83 suítes, 0 segredos Gitleaks e 0 erros Semgrep).
- Execute `pnpm vitest run __tests__/unit/lib/utils/` para inspecionar os testes focados de stream e respostas de erro.
- Execute `node scripts/check-decision.mjs check/0026-rotas-tratamento-erros/results.json --spec docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md` e confirme o veredito APROVADO emitido pela autoridade executável do projeto.

## Risk & rollout

- Risco baixo: nenhuma migração em banco de dados, nenhuma variável de ambiente nova e zero novas dependências npm no package.json.
- Requisições legítimas que excederem 512 KB recebem HTTP 413 imediato sem onerar a memória do Worker.
- Relatório de verificação empírica e revisão imparcial aprovado sem nenhum achado BLOCKER ou WARNING (docs/reviews/2026-10-18-1745-0026-rotas-tratamento-erros.md).

## Notes for reviewers

- O consumo de streaming foi desenvolvido com ReadableStream nativo em TypeScript puro, dispensando bibliotecas externas pesadas e respeitando a filosofia Ponytail.
- Os 5 critérios de aceite da Spec 0026 foram comprovados com evidências de execução arquivadas em docs/reviews/evidence/2026-10-18-1745-0026-rotas-tratamento-erros/.
