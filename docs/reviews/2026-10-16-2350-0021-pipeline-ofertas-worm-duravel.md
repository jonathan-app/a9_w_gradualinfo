# /check verify & review: Pipeline de Ofertas com Permissão de Serviço e WORM Durável (Spec 0021)

**Data**: 2026-10-16 23:50 (America/Sao_Paulo)  
**Spec**: `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`  
**Veredito**: **APROVADO** (exit 0, autoridade `scripts/check-decision.mjs`)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 9     |
| PASS         | 9     |
| FAIL         | 0     |
| UNVERIFIABLE | 0     |
| BLOCKER      | 0     |
| WARNING      | 0     |

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
- **Hash SHA-256 da Spec**: `27ad38f3a1a1bae6fd4fcbc72a5c7ae943b578679ad881187c8ef369b68dedfd`
- **Ambiente de teste**: Instância local com Node 22, Vitest 5.0.4, banco local Supabase em `127.0.0.1:54321` com migração `20261016230000_modulo_ofertas_ingest_idempotencia.sql` e suíte automatizada cobrindo 121 testes de ofertas (14 arquivos) e 789 testes gerais da aplicação (77 arquivos).
- **Ressalva de produção**: Produção permanece estritamente isolada e intocada; nenhuma chave de produção, credencial ou bucket remoto foi manipulado.

## Manifesto SHA-256 dos Arquivos Finais Testados

| Arquivo                                                                     | Hash SHA-256                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `app/api/ingest/ofertas/route.ts`                                           | `bb9469b7e47c26bdc600bc3ec0d1658353bb168af9e1ee28ef1c933271ad888b` |
| `lib/offers/ingest-auth.ts`                                                 | `3fa0f23612b752356df1b3f6afc24e8d374831e29bb1bba38fe737e2f4ee36f7` |
| `supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql` | `0cebc67d15c49299562d170653a9a02172131f2b207b0acbb22929552f45fd86` |
| `lib/offers/storage/filesystem-adapter.ts`                                  | `46e91ef1fac22d760a7d3271b8dcb3551d857ba60f6dd9c1248d78566f78192b` |
| `lib/offers/storage/storage-factory.ts`                                     | `552955dc0ef3a33567f45cf38827a2af64d1db1199ac0323d63e0f71cf348b6f` |
| `lib/offers/service-client.ts`                                              | `370eca56cefafbac47a1459ae3310b9acb5a93952a8207310d9b420933c5b579` |
| `app/api/ofertas/route.ts`                                                  | `d23df8d0b01d1c8b3bcdf9edf5b0ae71f56459cf9de8815f5a6a3532c224b417` |
| `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`                          | `69fe79b1e7274c75fce044486100420147f945d3928e5d738b9eb040f4882950` |
| `__tests__/unit/lib/offers/route-ingest-ofertas.test.ts`                    | `630e5207fd8ec3778b50c22693ca7b0fc16199790a30ca1785717edc153c6794` |
| `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts`                 | `f06b0f8068ea2d61464452e842017f3caa412e16dec12f29ee5f0685cc54bcbd` |

## Critérios de Aceite

### ofertas-pipeline/AC-01: Invocação da RPC via service_role exclusivamente no servidor após autorização

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-01-invocacao-service-role-autorizada.md`  
**Hash SHA-256**: `26043cecadef8f2dbbcb6b7cf73ca704b4d07dec2e7d2f6690e79db5f4e8a86d`

**Nota**: Na rota administrativa `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`, a chamada à RPC `evaluate_and_set_verified_price` é realizada através do cliente privilegiado `getOffersServiceClient()`, operando no servidor após validação da sessão administrativa AAL2 do administrador único ou autenticação de webhook HMAC com nonce e timestamp anti-replay. Usuários sem autorização são rejeitados antes de qualquer inicialização de credenciais de serviço.

### ofertas-pipeline/AC-02: Armazenamento local com criação atômica linkSync e expurgo seguro

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-02-storage-filesystem-persistente.md`  
**Hash SHA-256**: `050d13e632e9f70f86f2f829f83c2c876f75ac83e6ebdb2369fadb96a958fc21`

**Nota**: O adaptador `FilesystemEvidenceStorageAdapter` grava arquivos JSON canônicos e metadados no caminho físico `supabase/.evidence-storage/evidences/sha256/` utilizando linkagem física atômica POSIX (`fs.linkSync`), impedindo substituição acidental de arquivos preexistentes. A concorrência entre processos independentes do sistema operacional sincronizados por barreira foi comprovada por teste automatizado (`spec-0021-worm-pipeline.test.ts`). A rotina de expurgo de temporários verifica a vivacidade do processo dono via `process.kill(pid, 0)`, preservando processos ativos e estados de permissão incertos (`EPERM`), expurgando exclusivamente processos comprovadamente mortos (`ESRCH`).

### ofertas-pipeline/AC-03: Falha fechada em produção sem fallback para memória

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-03-falha-fechada-producao-sem-memoria.md`  
**Hash SHA-256**: `06469212d1046758335f9140d2c4648740646d34714af2d5549ea653bee58d42`

**Nota**: A fábrica `lib/offers/storage/storage-factory.ts` verifica o ambiente de produção (`NODE_ENV === 'production'` ou variáveis Cloudflare) e exige credenciais válidas do Cloudflare R2 com Object Lock. Se as variáveis estiverem ausentes ou inacessíveis, a fábrica lança imediatamente `EvidenceStorageUnavailableError`, sendo terminantemente proibido qualquer fallback para memória volátil.

### ofertas-pipeline/AC-04: Idempotência transacional no PostgreSQL e bloqueio de colisão

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-04-bloqueio-sobrescrita-delecao-idempotencia.md`  
**Hash SHA-256**: `f4b4872702f423b386ff21163f7370e6081ace6e1dd887fcb10b2c7aaf30d9f1`

**Nota**: A idempotência transacional no banco é assegurada pela tabela `public.offer_operation_keys` e pelo parâmetro `p_operation_key` na RPC `evaluate_and_set_verified_price`. Reenvios legítimos com a mesma chave e payload idêntico recuperam o resultado gravado com `reused_existing = true` sem duplicar linhas em `price_audit_logs` nem estender vigência do selo. Reenvios com payload divergente disparam erro de conflito HTTP 409 (código `23505`). Reenvios concorrentes simultâneos produzem efeito único no banco.

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

### ofertas-pipeline/AC-08: Rota dedicada de ingestão de coletores com HMAC e anti-replay compartilhado

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-08-rota-ingestao-hmac-anti-replay.md`  
**Hash SHA-256**: `096a2820a1b03dcbce43b1ecef8f4fe22ab5a8103d0caed8a6757ec73e7cefde`

**Nota**: A admissão de coletores automatizados é atendida exclusivamente pela rota `app/api/ingest/ofertas/route.ts` via assinatura HMAC-SHA256 validada em tempo constante sobre string canônica. A validação de assinatura precede qualquer consumo de nonce, rejeitando assinaturas forjadas com HTTP 401 sem exaurir a tabela compartilhada de nonces. O consumo do nonce na tabela `public.offers_ingest_nonces` sob restrição primária impede replays e aceita chamadas concorrentes exatamente uma única vez (devolvendo HTTP 409 sob duplicidade). A identidade auditável do coletor é propagada para a RPC.

### ofertas-pipeline/AC-09: Política de retenção probatória em camadas e ciclo de vida

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-16-2140-0021-pipeline-ofertas/ac-09-politica-retencao-probatoria-camadas.md`  
**Hash SHA-256**: `2e09a2940ab769f475e4caa99a74f6be67d0388fae4b7478ee93c59bfce35e1e`

**Nota**: A retenção probatória define modelo em camadas com marco inicial na coleta (`created_at`): 730 dias na camada quente para acesso operacional, até cinco anos na camada fria/arquivamento e expurgo programado condicionado à ausência de legal hold. Fica desfeita qualquer equiparação automática desse prazo de governança à prescrição do art. 27 do CDC. A homologação do ciclo de vida em bucket Cloudflare R2 real permanece delimitada para validação dedicada em ambiente de nuvem.

## Achados de Revisão (Review Findings)

Nenhum achado impeditivo identificado (0 BLOCKER, 0 WARNING, 0 NIT).

## Veredito Final

O artefato de validação `check/0021-pipeline-ofertas/results.json` foi auditado e recalculado por `scripts/check-decision.mjs` contra a spec `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`.

- **Veredito**: **APROVADO** (exit 0)
- **Total de Critérios de Aceite**: 9 (9 PASS, 0 FAIL, 0 UNVERIFIABLE)
- **Razões de reprovação**: Nenhuma (`reasons: []`).
