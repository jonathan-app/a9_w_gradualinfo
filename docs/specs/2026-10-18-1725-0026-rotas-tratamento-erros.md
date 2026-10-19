# 0026. Uniformizacao de rotas e tratamento de erros (Lote L3)

**Date**: 2026-10-18  
**Status**: Accepted  
**Decision source**: Aprovado pelo proprietario no chat em 2026-10-18

## Summary

Esta decisao estabelece o padrao unificado de tratamento de erros, protecao contra estouro de memoria em streaming e sanitizacao de mensagens do banco de dados nas rotas de API do GradualInfo. Requisições em streaming passam a ser limitadas progressivamente antes de qualquer alocacao de texto, erros de RPC do PostgreSQL sao sanitizados para nunca expor nomes de tabelas ou restricoes internas e as rotas sob admin unificam suas checagens de sessao administrativa atraves do helper centralizado.

## Context

Durante a auditoria de qualidade e inventario do backend realizada no Lote L0 e refinada no Lote L2, identificamos padroes concorrentes e potenciais riscos na camada de transporte HTTP em app/api:

1. Na rota de ingestao de ofertas (`app/api/ingest/ofertas/route.ts`), a leitura do corpo ocorria via `await request.text()` antes da verificacao de tamanho em bytes. Em requisicoes com Transfer Encoding chunked sem cabecalho Content Length, o Worker aloca o payload inteiro em memoria antes de avaliar o limite, criando risco de estouro de memoria sob corpos gigantescos.
2. Nas rotas de ingestao e de avaliacao de selo (`app/api/admin/ofertas/[id]/avaliar-selo/route.ts`), falhas na transacao RPC do PostgreSQL retornavam diretamente os campos `rpcError.message` e `rpcError.code` no corpo JSON 422. Isso vaza detalhes internos de esquema, nomes de restricoes e estrutura do banco para o chamador.
3. As rotas da API possuem formatos heterogeneos de envelope de erro (`{ error, message }`, `{ message }`, `{ error, details }`), dificultando o tratamento previsivel por clientes e coletores.
4. Determinadas rotas administrativas repetem validacao de cookie e sessao manualmente em vez de reutilizar a barreira declarativa `requireAdminSession()` de `lib/admin/auth.ts`.

A ausencia de padronizacao aumenta a divida tecnica, facilita vazamentos de informacao e enfraquece o perimetro defensivo do backend.

## Requirements

**User stories**:

- Como engenheiro de seguranca, quero que qualquer erro de banco de dados seja sanitizado antes de retornar ao cliente, para que nenhum invasor descubra nomes de restricoes ou colunas internas.
- Como operador de coletores, quero respostas de erro previsiveis e estruturadas em JSON, para que as integracoes identifiquem falhas sem depender de textos ad hoc.
- Como mantenedor do Worker, quero que payloads com Transfer Encoding em stream sejam abortados logo no primeiro pedaco que exceder a cota, para proteger a memoria do processo de execucao.

**Acceptance criteria**:

- **route-clean/AC-01**: Leitura de corpo de requisicoes em streaming consome o `ReadableStream<Uint8Array>` acumulando contagem progressiva de bytes e aborta imediatamente com HTTP 413 (`payload_too_large`) quando ultrapassar o limite maximo sem carregar o corpo inteiro em memoria.
- **route-clean/AC-02**: Sanitizacao completa de erros de RPC do PostgreSQL em rotas de ingestao (`/api/ingest/ofertas`) e avaliacao de selo (`/api/admin/ofertas/[id]/avaliar-selo`), retornando codigo generico e amigavel (`evaluation_failed` ou `conflict`) com HTTP 422/409, silenciando mensagens e codigos internos do PostgreSQL para o cliente e registrando detalhes reais nos logs do servidor.
- **route-clean/AC-03**: Padronizacao do envelope JSON de erro nas rotas de API publicas e administrativas atraves de helper tipado `apiErrorResponse(status, error, message)`, garantindo coerencia de formato.
- **route-clean/AC-04**: Reutilizacao centralizada de `requireAdminSession()` de `lib/admin/auth.ts` nos endpoints de `app/api/admin/` que realizam checagem manual de autenticacao e MFA AAL2, eliminando duplicacoes de logica de sessao e garantindo resposta 401/403 uniforme.
- **route-clean/AC-05**: Preservacao total de compatibilidade de contratos existentes, sem quebra nos testes de ingestao HMAC, auditoria WORM probatoria, dashboard operacional e rotas publicas de busca e artigos, com aprovacao integral em `pnpm check:all`.

## Options considered

### Option 1: Helpers utilitarios focados e sanitizacao cirurgica (Recomendada)

Criar helper `readLimitedTextBody` em `lib/utils/http-stream.ts` para consumo de streams com aborto rapido, helper `apiErrorResponse` em `lib/utils/api-response.ts` para respostas HTTP consistentes, sanitizar os retornos de `rpcError` nos endpoints de ofertas e reutilizar `requireAdminSession()` nos endpoints admin.

**Pros**:

- Segue a filosofia Ponytail com a menor quantidade de codigo novo estritamente necessaria.
- Nao adiciona bibliotecas externas nem wrappers complexos.
- Corrige diretamente a vulnerabilidade de memoria e o vazamento de esquema.
- Preserva integralmente os contratos e testes ja existentes.

**Cons**:

- Exige adocao manual do helper nas rotas sem middleware global magico.

### Option 2: Framework de middleware interceptor global ou RFC 7807 completa

Adotar biblioteca de Problem Details (RFC 7807) e reescrever as rotas de `app/api` em formato de interceptor em cadeia com wrappers de alta ordem.

**Pros**:

- Padronizacao estrita conforme especificacao IETF RFC 7807.
- Forca todas as rotas a passarem pela mesma esteira.

**Cons**:

- Quebra contratos com clientes e testes existentes que esperam o formato `{ error, message }`.
- Adiciona complexidade, boilerplate e indirecao desnecessarias.
- Viola o principio de mudanca minima completa do projeto.

## Decision

**Chosen option**: Option 1: Helpers utilitarios focados e sanitizacao cirurgica.

Implementar a leitura controlada de streams em `lib/utils/http-stream.ts`, a padronizacao de respostas de erro em `lib/utils/api-response.ts`, a higienizacao de mensagens PostgreSQL nas rotas de ofertas e o reuso de `requireAdminSession()` nas rotas de administracao.

## Rationale

A Opcao 1 resolve integralmente as fraquezas de seguranca e estabilidade apontadas pela auditoria sem introduzir dependencias externas ou camadas abstratas que dificultam a depuracao no runtime de Workers da Cloudflare. O consumo progressivo do ReadableStream protege a cota de 128 MB de memoria do Worker, enquanto a sanitizacao de erros do banco impede reconhecimento malicioso de esquema. A unificacao com `requireAdminSession()` elimina duplicacao de codigo de sessao mantendo o fail closed.

## Standard definition

**Canonical pattern**:

```typescript
// 1. Leitura segura de stream com limite maximo de bytes
const bodyResult = await readLimitedTextBody(request, MAX_PAYLOAD_BYTES);
if (!bodyResult.ok) {
  return apiErrorResponse(
    413,
    'payload_too_large',
    'O corpo excede o limite permitido.',
  );
}
const rawBodyText = bodyResult.text;

// 2. Sanitizacao de erro de RPC do banco
if (rpcError) {
  logger.error('Falha na transacao RPC de avaliacao', { error: rpcError });
  return apiErrorResponse(
    422,
    'evaluation_failed',
    'Nao foi possivel concluir a avaliacao da oferta.',
  );
}

// 3. Verificacao de sessao administrativa uniforme
const sessionResult = await requireAdminSession();
if (!sessionResult.ok) {
  return sessionResult.response;
}
```

**Replaces**:

- `await request.text()` sem limite progressivo de bytes em streaming.
- `NextResponse.json({ error: 'failed', message: rpcError.message, code: rpcError.code }, { status: 422 })` que expoe detalhes internos do banco de dados.
- Duplicacao ad hoc de leitura de cookie e checagem de AAL2 em rotas administrativas.

**Enforcement**:

- Testes unitarios automatizados em Vitest cobrindo leitura com limite excedido e sanitizacao de mensagens.
- Regras de analise estatica Semgrep e verificacao no portao `pnpm check:all`.

**Rollout**:

- Aplicacao imediata nas rotas do Lote L3 em um unico lote coordenado de faxina.

**Exceptions**:

- Rotas que recebem JSON pequeno de administradores autenticados e que ja possuem Content Length validado pelo proxy Cloudflare podem utilizar leitura direta quando nao houver Transfer Encoding chunked.

## Build plan

1. Criar `lib/utils/http-stream.ts` com a funcao `readLimitedTextBody(request, maxBytes)` e testes unitarios em `__tests__/unit/lib/utils/http-stream.test.ts`, satisfaz **route-clean/AC-01**.
2. Atualizar `app/api/ingest/ofertas/route.ts` para ler o corpo via `readLimitedTextBody` e higienizar erros de RPC eliminando vazamento de `rpcError.message` e `rpcError.code`, satisfaz **route-clean/AC-01**, **route-clean/AC-02**.
3. Atualizar `app/api/admin/ofertas/[id]/avaliar-selo/route.ts` para sanitizar retornos de RPC mantendo mensagens de banco restritas ao log interno, satisfaz **route-clean/AC-02**.
4. Criar helper `apiErrorResponse` em `lib/utils/api-response.ts` e aplicar nas respostas de erro de `app/api/ingest/ofertas` e rotas administrativas, satisfaz **route-clean/AC-03**.
5. Revisar e unificar a autenticacao de rotas sob `app/api/admin/` reutilizando `requireAdminSession()`, satisfaz **route-clean/AC-04**.
6. Executar suíte completa `pnpm check:all` e validar integridade funcional de todas as 18 rotas da API, satisfaz **route-clean/AC-05**.

## Consequences

**Positive**:

- O Worker fica imune a ataques de esgotamento de memoria por envio de dados infinitos em chunked stream.
- Nenhum detalhe interno de banco de dados ou nome de chave estrangeria e exposto em respostas de erro.
- Respostas de erro HTTP ficam consistentes e faceis de interpretar.
- Menos linhas de boilerplate de autenticacao espalhadas nos endpoints de admin.

**Negative / tradeoffs**:

- Requisicoes legitimate que excederem o limite de bytes sao rejeitadas imediatamente no meio do stream.

**Neutral**:

- Desenvolvedores precisam utilizar `readLimitedTextBody` em novos endpoints que aceitem corpos variaveis.

## Follow-up

- [ ] Avaliar no Lote L4 a eliminacao de scripts de teste de deploy obsoletos mapeados no Lote L0.
