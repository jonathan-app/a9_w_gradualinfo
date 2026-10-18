# /check verify & review: Pipeline de Ofertas com Permissão de Serviço e WORM Durável (Spec 0021)

**Data**: 2026-10-17 13:30 (America/Sao_Paulo)  
**Spec**: `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`  
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 9     |
| PASS         | 7     |
| FAIL         | 0     |
| UNVERIFIABLE | 2     |
| BLOCKER      | 0     |
| WARNING      | 3     |

O veredito é **REPROVADO** porque há 2 ACs com status UNVERIFIABLE (ofertas-pipeline/AC-04 e ofertas-pipeline/AC-09). Conforme o contrato de `/check`, qualquer AC UNVERIFIABLE reprova o gate: um AC não testável não é aprovado por omissão, nem isenta.

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
- **Hash SHA-256 da Spec**: `27ad38f3a1a1bae6fd4fcbc72a5c7ae943b578679ad881187c8ef369b68dedfd`
- **Ambiente de teste**: Node 22, Vitest 5.0.4, banco local Supabase em `127.0.0.1:54321`
- **Evidências empíricas executadas nesta sessão**:
  - 121 testes Vitest do módulo de ofertas (14 arquivos): **todos aprovados**
  - 171 testes pgTAP do banco local (6 arquivos, incluindo `offers_ingest_idempotencia.test.sql`): **todos aprovados**
  - `pnpm typecheck`: aprovado
- **Ressalva de produção**: Produção permanece estritamente isolada e intocada; nenhuma chave de produção, credencial ou bucket remoto foi manipulado.

## Distinção fundamental: pipeline local comprovado vs WORM do provedor não verificado

Este `/check` **não transforma testes de filesystem local em aprovação de produção**. A distinção é mantida deliberadamente:

- **Pipeline local comprovado (PASS)**: AC-01 (service_role server-only), AC-02 (adaptador filesystem com `linkSync` e concorrência entre processos reais do SO), AC-03 (falha fechada em produção sem fallback de memória), AC-05 (sanitização da rota pública `/api/ofertas`), AC-06 (validação defensiva UUIDv4/limit), AC-07 (isolamento `server-only`), AC-08 (rota de ingestão HMAC + anti-replay + propagação de identidade).
- **WORM do provedor ainda não verificado (UNVERIFIABLE)**: AC-09 — Cloudflare R2 com Bucket Locks não está disponível localmente; `storage-factory.ts` lança `EvidenceStorageUnavailableError` em produção sem R2. A retenção em camadas está especificada e simulada no disco local, mas a homologação em nuvem permanece pendente (spec 0021, build plan item 7).
- **Concorrência real de banco não comprovada (UNVERIFIABLE)**: AC-04 — os testes de idempotência são sequenciais (uma sessão/transação). Não há duas conexões/transações independentes disputando simultaneamente a mesma `operation_key`. Chave primária e testes sequenciais, sozinhos, não comprovam a disputa simultânea exigida pela spec.

## Critérios de Aceite

### ofertas-pipeline/AC-01: Invocação da RPC via service_role exclusivamente no servidor após autorização

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-01-invocacao-service-role-autorizada.md`  
**Nota**: `lib/offers/service-client.ts:9` declara `import 'server-only'`; a RPC é executada apenas após `assertAdminApiAuth` (AAL2) na rota administrativa. Usuários não autorizados são rejeitados antes de qualquer credencial de serviço.

### ofertas-pipeline/AC-02: Armazenamento local com criação atômica linkSync e expurgo seguro

**Status**: PASS (escopo local/development)  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-02-storage-filesystem-local.md`  
**Nota**: `fs.linkSync` impede substituição de destino; dois processos independentes do SO sincronizados por barreira disputando a mesma chave gravam exatamente um efeito (`reused_existing: true` para o segundo). Expurgo de temporários preserva processos ativos e `EPERM`, remove apenas `ESRCH` após 15 min. **Não comprova produção** (AC-09 pendente).

### ofertas-pipeline/AC-03: Falha fechada em produção sem fallback para memória

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-03-falha-fechada-producao.md`  
**Nota**: `storage-factory.ts` exige R2 configurado em produção e lança `EvidenceStorageUnavailableError` caso contrário; proibido fallback para memória. `OFFERS_INGEST_SECRET` sozinho **não ativa** o pipeline; sem armazenamento durável com retenção validada, a concessão de selo falha fechada com 503.

### ofertas-pipeline/AC-04: Idempotência transacional, concorrência e conflito 409

**Status**: UNVERIFIABLE  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-04-idempotencia-concorrencia.md`  
**Nota**: Reenvio idêntico → `reused_existing: true` sem novas linhas em `price_audit_logs` (testado, pgTAP + Vitest). Mesma chave + hash divergente → 23505 → 409 (testado). **Não testado**: reenvios concorrentes simultâneos com duas transações independentes sobre a mesma `operation_key` produzindo exatamente um efeito. Além disso, a RPC compara apenas `evidence_hash`; campos que alteram a operação (ex. `p_action`) não são comparados para conflito.

### ofertas-pipeline/AC-05: Sanitização fail-closed de mensagens de erro na rota pública /api/ofertas

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-05-sanitizacao-rota-ofertas.md`  
**Nota**: `/api/ofertas` registra detalhes no log interno e retorna JSON opaco HTTP 503 ao consumidor externo.

### ofertas-pipeline/AC-06: Validação defensiva de parâmetros na rota pública /api/ofertas

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-06-validacao-parametros-ofertas.md`  
**Nota**: `product_id` e `merchant_id` UUIDv4 estrito; `limit` inteiro 1 a 100; rejeição HTTP 400 antes de acessar o banco.

### ofertas-pipeline/AC-07: Isolamento server-only do cliente de serviço

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-07-isolamento-server-only.md`  
**Nota**: `lib/offers/service-client.ts` declara `import 'server-only'`, sem persistência de sessão, refresh de token ou cookies.

### ofertas-pipeline/AC-08: Rota dedicada de ingestão de coletores com HMAC e anti-replay compartilhado

**Status**: PASS  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-08-rota-ingestao-hmac.md`  
**Nota**: HMAC validado antes do consumo do nonce; nonce PK `(collector_id, nonce)` com 409 em replay; identidade `collector:<id>` propagada à RPC; limite de corpo 512 KB (413); janela de timestamp 300s. **Gap de teste**: não há cenário empírico de nonce consumido seguido de falha de storage/RPC com retry via novo nonce e confirmação de ausência de efeito duplicado sob banco real.

### ofertas-pipeline/AC-09: Política de retenção probatória em camadas e ciclo de vida

**Status**: UNVERIFIABLE  
**Evidência**: `docs/reviews/evidence/2026-10-17-1330-0021-pipeline-ofertas/ac-09-retencao-probatoria.md`  
**Nota**: Retenção em camadas especificada (730 dias quente, até 1825 dias frio/arquivo, expurgo condicionado a ausência de legal hold) e simulada no filesystem local. **Cloudflare R2 com Bucket Locks não verificado localmente**; homologação em nuvem permanece pendente. Testes de filesystem não aprovam produção.

## Achados de Revisão (Review Findings)

| Severidade | Descrição resumida                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WARNING    | AC-04: concorrência real de banco não comprovada (testes sequenciais; não há duas transações independentes disputando a mesma operation_key).                                                                 |
| WARNING    | AC-04: a RPC compara apenas `evidence_hash` para conflito; `p_action` e outros campos que alteram a operação não são comparados.                                                                              |
| WARNING    | AC-05/AC-08: rotas de ingestão e admin retornam `code: rpcError.code` na resposta de falha da RPC, expondo códigos internos do PostgreSQL ao consumidor. A rota pública `/api/ofertas` sanitiza corretamente. |
| INFO       | AC-09: WORM do provedor de nuvem (R2 Bucket Locks) não verificado localmente; produção permanece bloqueada (AC-03) até homologação dedicada.                                                                  |
| INFO       | AC-03: `OFFERS_INGEST_SECRET` sozinho não ativa o pipeline; falha fechada com 503 sem armazenamento durável com retenção validada.                                                                            |

## Veredito Final

O artefato de validação `check/0021-pipeline-ofertas/results.json` foi avaliado por `scripts/check-decision.mjs` contra a spec `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md`.

- **Veredito**: **REPROVADO** (exit 1)
- **Total de Critérios de Aceite**: 9 (7 PASS, 0 FAIL, 2 UNVERIFIABLE)
- **Razões de reprovação**:
  1. `AC sem PASS: ofertas-pipeline/AC-04` — concorrência real de banco e comparação de todos os campos mutantes não comprovadas.
  2. `AC sem PASS: ofertas-pipeline/AC-09` — WORM do provedor de nuvem (R2) não verificado localmente.

## Próximos passos (não bloqueados por este gate, mas necessários para aprovação)

1. **AC-04**: adicionar teste de concorrência real no banco (duas conexões/transações independentes disputando a mesma `operation_key` com payload idêntico, afirmando exatamente um efeito transacional) e estender a comparação de conflito para todos os campos que alteram a operação (não apenas `evidence_hash`).
2. **AC-09**: homologar Cloudflare R2 com Bucket Locks e ciclo de vida em camadas em infraestrutura real de produção (marco futuro, fora do escopo local).
3. **Achados WARNING**: remover a exposição de `code: rpcError.code` das respostas das rotas de ingestão e admin, mantendo detalhes técnicos restritos ao log interno.

Após a correção, reexecutar `/check verify` e `/check review` para novo veredito.
