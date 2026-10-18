# /check verify & review: Pipeline de Ofertas com Permissão de Serviço e WORM Durável (Spec 0021)

**Data**: 2026-10-16 21:40 (America/Sao_Paulo)  
**Spec**: `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`  
**Veredito**: **APROVADO** (exit 0, autoridade `scripts/check-decision.mjs`)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 8     |
| PASS         | 8     |
| FAIL         | 0     |
| UNVERIFIABLE | 0     |
| BLOCKER      | 0     |
| WARNING      | 0     |

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
- **Hash SHA-256 da Spec**: `19082603cfaec1198697e3f386053e8eb271b5625799e7445d6a9a9ee1265924`
- **Ambiente de teste**: Instância local com Node 22, Vitest 5.0.4, banco local Supabase em `127.0.0.1:54321` e suíte automatizada cobrindo 107 testes de ofertas (13 arquivos) e 775 testes gerais (76 arquivos).
- **Ressalva de produção**: Produção permanece estritamente isolada e intocada; nenhuma chave de produção, credencial ou bucket remoto foi manipulado.

## Manifesto SHA-256 dos Arquivos Finais Testados

| Arquivo                                                     | Hash SHA-256                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `lib/offers/service-client.ts`                              | `370eca56cefafbac47a1459ae3310b9acb5a93952a8207310d9b420933c5b579` |
| `lib/offers/storage/filesystem-adapter.ts`                  | `a5f2a14cce3622dcc3481d399e721d3f73e7dfa37b37edd56bab8cc9c14bcc5a` |
| `lib/offers/storage/storage-factory.ts`                     | `fe3687723057c845cbb60cb7f7c66ef51e250dfdb1c32359e3fb0718733deafd` |
| `app/api/ofertas/route.ts`                                  | `d23df8d0b01d1c8b3bcdf9edf5b0ae71f56459cf9de8815f5a6a3532c224b417` |
| `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`          | `69fe79b1e7274c75fce044486100420147f945d3928e5d738b9eb040f4882950` |
| `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` | `70dca188ad10e80ec8a9302fa693a9d89a8f98d699da0272d91433b44e8971c1` |
| `__tests__/unit/lib/offers/route-ofertas.test.ts`           | `deb7cda97d29fa842489025a07d19c833ca3d81b297e33a87ee9fe74f2a89077` |

## Critérios de Aceite

### ofertas-pipeline/AC-01: Invocação da RPC via service_role exclusivamente no servidor após autorização

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-01-invocacao-service-role-autorizada.md`  
**Hash SHA-256**: `26043cecadef8f2dbbcb6b7cf73ca704b4d07dec2e7d2f6690e79db5f4e8a86d`

**Nota**: Na rota administrativa `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`, a chamada à RPC `evaluate_and_set_verified_price` é realizada através do cliente privilegiado `getOffersServiceClient()`, operando no servidor após validação da sessão administrativa AAL2 do administrador único ou autenticação de webhook HMAC com nonce e timestamp anti-replay. Usuários sem autorização são rejeitados antes de qualquer inicialização de credenciais de serviço.

### ofertas-pipeline/AC-02: Armazenamento local de evidências com FilesystemEvidenceStorageAdapter

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-02-storage-filesystem-persistente.md`  
**Hash SHA-256**: `1cd7e5b83b5115d70a9da7e1597aa493e0cf747cce0b8655811b9e3987efcbab`

**Nota**: O adaptador `FilesystemEvidenceStorageAdapter` grava arquivos JSON canônicos e metadados no caminho físico `supabase/.evidence-storage/evidences/sha256/`. Prova empírica em teste automatizado comprova que novas instâncias do adaptador criadas em processos subsequentes reconhecem arquivos persistidos anteriormente com hashes e tamanhos íntegros (`reused_existing: true`), sobrevivendo a reinícios do processo.

### ofertas-pipeline/AC-03: Falha fechada em produção sem fallback para memória

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-03-falha-fechada-producao-sem-memoria.md`  
**Hash SHA-256**: `06469212d1046758335f9140d2c4648740646d34714af2d5549ea653bee58d42`

**Nota**: A fábrica `lib/offers/storage/storage-factory.ts` verifica o ambiente de produção (`NODE_ENV === 'production'` ou variáveis Cloudflare) e exige credenciais válidas do Cloudflare R2 com Object Lock. Se as variáveis estiverem ausentes ou inacessíveis, a fábrica lança imediatamente `EvidenceStorageUnavailableError`, sendo terminantemente proibido qualquer fallback para memória volátil.

### ofertas-pipeline/AC-04: Bloqueio estrito de sobrescrita e deleção com recuperação idempotente

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-04-bloqueio-sobrescrita-delecao-idempotencia.md`  
**Hash SHA-256**: `45edefb5b32cba3cae7ea2406b062e784e649ad612b037dae3d06fe2f2526051`

**Nota**: Tentativas de sobrescrita com bytes divergentes para o mesmo SHA-256 são recusadas com `EvidenceCollisionConflictError`. Tentativas de exclusão disparam `WORMOperationForbiddenError`. Reenvios idênticos após falha transacional transitória reaproveitam a prova gravada sem conflito de arquivo físico.

### ofertas-pipeline/AC-05: Sanitização fail-closed de mensagens de erro na rota pública /api/ofertas

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-05-sanitizacao-rota-ofertas-503.md`  
**Hash SHA-256**: `4b9dbcd1749e79eb46da784816354f5c006763ce29d8a25d4923044ad64dbb2d`

**Nota**: Erros de consulta ao banco na rota `/api/ofertas` são capturados e registrados exclusivamente no log estruturado interno, retornando ao cliente externo um JSON opaco com HTTP 503 (`{ error: 'unavailable', message: 'Serviço de ofertas temporariamente indisponível.' }`), sem expor tabelas, colunas ou códigos do PostgreSQL.

### ofertas-pipeline/AC-06: Validação defensiva de parâmetros na rota pública /api/ofertas

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-06-validacao-defensiva-parametros-ofertas.md`  
**Hash SHA-256**: `e3ba4c164504b5ec16af86a182f398d1b89e4b7b4779e571d242638acd843a5c`

**Nota**: Parâmetros `product_id` e `merchant_id` são validados estritamente contra o formato UUIDv4. O parâmetro `limit` é validado para número inteiro entre 1 e 100. Formatos inválidos são rejeitados com HTTP 400 antes de qualquer consulta ao banco.

### ofertas-pipeline/AC-07: Isolamento server-only do cliente de serviço

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-07-isolamento-server-only-service-client.md`  
**Hash SHA-256**: `e01fb76b57e0430fcb05ced678bd403aa665e994c595f216f27819107be792e7`

**Nota**: O módulo `lib/offers/service-client.ts` declara `import 'server-only'`, impedindo qualquer importação por componentes de cliente. A inicialização do cliente Supabase desativa persistência de sessão, refresh de tokens e manipulação de cookies.

### ofertas-pipeline/AC-08: Suíte automatizada de testes locais do pipeline e persistência WORM

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-08-suite-testes-automatizados.md`  
**Hash SHA-256**: `bd7bb779b9eef489daf6eb99353e3c593e272d98c6b8e4df23955ba3e8459141`

**Nota**: Suíte automatizada cobrindo 107 testes unitários do módulo de ofertas em 13 arquivos Vitest (100% PASS), além da suíte completa da aplicação com 775 testes em 76 arquivos, validando o ciclo completo da Spec 0021 sem regressões.

## Achados de Revisão (Review Findings)

Nenhum achado impeditivo identificado (0 BLOCKER, 0 WARNING, 0 NIT).

## Veredito Final

O artefato de validação `check/0021-pipeline-ofertas/results.json` foi auditado e recalculado por `scripts/check-decision.mjs` contra a spec `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`.

- **Veredito**: **APROVADO** (exit 0)
- **Razões de reprovação**: Nenhuma (`reasons: []`).
