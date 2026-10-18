# Relatório de Verificação: Spec 0017 / Fatia 4 (`/check verify`)

**Data:** 2026-10-14 12:25  
**Spec base:** `docs/specs/2026-10-13-1710-0017-modulo-ofertas-historico-precos.md`  
**Escopo:** `docs/scope/2026-10-14-1100-0017-fatia4-retencao-worm-endpoints.md`  
**Adendo técnico:** `docs/specs/2026-10-14-1115-0017-fatia4-retencao-worm-endpoints-adendo.md`  
**Status da verificação:** **APROVADO LOCALMENTE COM RESSALVAS DE INFRAESTRUTURA DOCUMENTADAS**  
**Ambiente:** Estritamente local (Vitest, App Router Next.js 16.4, TypeScript strict, memória local); sem produção, sem Cloudflare, sem push.

---

## 1. Resumo Executivo e Correções Ponytail Aplicadas

A Fatia 4 implementa a camada de conformidade probatória e os endpoints da aplicação do módulo de ofertas. Foram aplicadas as correções recomendadas pelo `/ponytail-review` antes da homologação final deste `/check verify`:

1. **Achado 1 (Auto-sweep do Nonce Cache):** `MemoryNonceCache` (`lib/offers/webhook-auth.ts`) atualizado com expurgo automático (`sweep()`) a cada 60s ou quando atingir a capacidade, acrescido de política de capacidade máxima (`maxEntries = 5000`) com descarte FIFO da chave mais antiga, mitigando vazamento de memória em execuções prolongadas. Testado e validado.
2. **Achado 2 (Validação Estrita de Lojista):** `POST /api/admin/ofertas/[id]/avaliar-selo` valida a existência e conteúdo não vazio de `merchant_domain`. Se ausente ou em branco, aborta imediatamente com HTTP 422 (`missing_merchant_domain`), sem criar digest nem persistir evidência orfã no storage WORM. Teste de regressão adicionado e validado.
3. **Achado 3 (Otimização de Payload):** Substituição de `Buffer.from(rawBodyText).length` por `Buffer.byteLength(rawBodyText, 'utf8')`, eliminando alocação de memória no caminho quente de validação de tamanho de requisição.
4. **Achado 4 (Documentação de Redes de Afiliados):** Inclusão de comentário explícito `shortcut:` em `app/api/out/[id]/route.ts` documentando a restrição de domínio único contra _open redirect_ e a futura exigência de allowlist para agregadores intermediários (ex: Lomadee, Awin).

---

## 2. Matriz de Conformidade dos Critérios de Aceite (AC-01 a AC-10)

| Critério         | Descrição do Critério                                                                                                                                           |        Status         | Evidência Técnica / Arquivo de Prova                                                                                                                                                                                                                                                                                                                                                                                    |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **fatia4/AC-01** | O bucket de evidências rejeita qualquer tentativa de sobrescrita, alteração ou exclusão de arquivos, garantindo política WORM.                                  |   **PASS (Local)**    | `lib/offers/storage/memory-adapter.ts`: `deleteEvidence()` lança `WORMOperationForbiddenError` (403); `putEvidence()` com hash idêntico e bytes divergentes lança `EvidenceCollisionConflictError` (409); avanço de retenção é estritamente unidirecional. Coberto por 10 testes em `__tests__/unit/lib/offers/memory-adapter.test.ts`. _Ressalva: emulado localmente; R2 Object Lock real pendente de infraestrutura._ |
| **fatia4/AC-02** | A persistência da evidência no storage ocorre antes da confirmação do selo no banco, mantendo consistência fail-closed sob falhas.                              |       **PASS**        | `app/api/admin/ofertas/[id]/avaliar-selo/route.ts` (linhas 315-346): `storage.putEvidence()` é invocado antes de `supabase.rpc('evaluate_and_set_verified_price')`. Se o storage falhar (simulado por erro 503), a rota retorna HTTP 503 e a RPC do banco jamais é disparada. Coberto em `__tests__/unit/lib/offers/route-avaliar-selo.test.ts`.                                                                        |
| **fatia4/AC-03** | A rota de avaliação valida SKU/variante, calcula a mediana, avalia cupom e frete via RPC da Fatia 3, e responde com o status da concessão.                      |       **PASS**        | `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`: invoca `evaluate_and_set_verified_price` com os 12 parâmetros canônicos da migration da Fatia 3. Coberto por testes unitários e integrada ao pipeline transacional aprovado com 152 asserções pgTAP.                                                                                                                                                                |
| **fatia4/AC-04** | A rota de avaliação exige sessão administrativa com MFA AAL2 ou webhook assinado com HMAC-SHA256, rejeitando acesso anônimo.                                    |       **PASS**        | `app/api/admin/ofertas/[id]/avaliar-selo/route.ts` (linhas 110-134): fluxo fail-closed exige `x-gradualinfo-signature` com assinatura HMAC válida e janela de 300s OU sessão `assertAdminApiAuth` com AAL2. Requisições anônimas ou AAL1 são rejeitadas com 401/403. Testado em `route-avaliar-selo.test.ts` e `webhook-auth.test.ts`.                                                                                  |
| **fatia4/AC-05** | A rota de avaliação é idempotente: requisições repetidas com a mesma evidência não duplicam logs nem alteram datas indevidamente.                               |       **PASS**        | `app/api/admin/ofertas/[id]/avaliar-selo/route.ts` (linhas 348-370): se `putResult.reused_existing` for verdadeiro e a oferta já estiver com selo `verified` e `badge_expires_at > now()`, a rota retorna HTTP 200 com `reused_active_evidence` sem invocar a RPC do banco. Teste dedicado em `route-avaliar-selo.test.ts`.                                                                                             |
| **fatia4/AC-06** | A rota `GET /api/admin/evidencias/[hash]` fornece metadados e URL temporária de leitura com expiração máxima de 15 minutos (AAL2).                              |       **PASS**        | `app/api/admin/evidencias/[hash]/route.ts`: guard AAL2, validação de regex SHA-256 (64 hex), verificação de existência via HEAD e geração de presigned URL com expiração limitada a 900s (15 min). Coberto por 5 testes em `__tests__/unit/lib/offers/route-evidencias.test.ts`.                                                                                                                                        |
| **fatia4/AC-07** | A rota pública `GET /api/out/[id]` valida lexicalmente a URL de destino contra o domínio do lojista, bloqueia portas/credenciais e responde 410 para esgotadas. |       **PASS**        | `app/api/out/[id]/route.ts` e função `validateAffiliateUrl`: boundary match estrito de hostname, rejeição de credenciais (`user:pass`), rejeição de portas arbitrárias, HTTP 410 Gone formatado com página institucional para ofertas pausadas/esgotadas ou lojistas inativos, e HTTP 307 com cabeçalhos restritivos para ofertas ativas. Coberto por 14 testes em `route-out-redirect.test.ts`.                        |
| **fatia4/AC-08** | A rota pública `GET /api/ofertas` entrega apenas ofertas ativas via `active_offers_view` com cabeçalhos de cache.                                               |       **PASS**        | `app/api/ofertas/route.ts`: leitura da view pública com filtro opcional por `product_id` e `merchant_id`, paginação limitada a 100 itens e cabeçalho `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Coberto em `route-ofertas.test.ts`.                                                                                                                                                              |
| **fatia4/AC-09** | O ciclo de vida de retenção de 730 dias hot storage e 5 anos cold storage está documentado e coberto por testes locais de integridade temporal.                 | **PASS (Contratual)** | Formalizado em `lib/offers/storage/evidence-storage-adapter.ts` e `lib/offers/storage/memory-adapter.ts`. Retenção quente de 730 dias atribuída na gravação; extensão preventiva (`extendRetention`) suportada respeitando o teto de 1825 dias (5 anos) do CDC Art. 27. Testes unitários cobrem avanço temporal e rejeição de redução de prazo.                                                                         |
| **fatia4/AC-10** | A suíte completa de testes locais executa com código de saída zero, sem tocar em serviços de produção.                                                          |       **PASS**        | `pnpm check:all` finalizado com **exit code 0**: 0 erros no TypeScript (`tsc --noEmit`), 0 erros no ESLint, 100% formatado no Prettier e **688 testes Vitest aprovados em 67 arquivos** (97 testes de ofertas). Zero chamadas externas.                                                                                                                                                                                 |

---

## 3. Comandos Executados e Resultados Reais

```bash
# 1. Execução direcionada da suíte de ofertas (12 arquivos de teste)
pnpm vitest run __tests__/unit/lib/offers/
# Resultado: Test Files 12 passed (12) | Tests 97 passed (97) | Duração: 2.89s

# 2. Execução dos portões completos de qualidade e regressão geral
pnpm check:all
# Resultado:
# - tsc --noEmit: exit 0 (0 erros de tipagem)
# - eslint .: exit 0 (0 warnings / 0 erros)
# - prettier --check .: exit 0 (código 100% formatado)
# - vitest run: Test Files 67 passed (67) | Tests 688 passed (688) | Duração: 13.03s
```

---

## 4. Limitações de Infraestrutura e Pendências para Produção

1. **Emulação WORM em Memória vs. R2 Object Lock Real:**
   - O adaptador `MemoryEvidenceStorageAdapter` valida toda a semântica de imutabilidade, avanço de retenção, URLs assinadas e detecção de colisões. No entanto, a infraestrutura física de produção (Cloudflare R2 Object Lock em modo Compliance) requer provisionamento remoto via Terraform/Wrangler, fora do escopo desta fatia.
2. **Mitigação Anti-Replay Distribuída:**
   - O `MemoryNonceCache` agora possui auto-sweep e limite de tamanho, atendendo plenamente ao ambiente de desenvolvimento e testes locais. Antes de expor o endpoint de webhook a tráfego público de produção, a camada de nonces deve ser migrada para armazenamento distribuído (Cloudflare KV, Durable Objects ou tabela com índice e TTL no PostgreSQL).
3. **Redes Intermediárias de Afiliados:**
   - O validador `/api/out/[id]` realiza _boundary match_ estrito contra o domínio direto do lojista. A utilização de links por redes agregadoras (ex.: `awin1.com`, `lomadee.com`) necessitará de cadastro prévio e allowlist de gateways autorizados.
4. **Isolamento de Produção Mantido:**
   - Zero deploys, zero pushes no Git, zero migrations adicionais no banco. A migração `20261013030000_modulo_ofertas_pipeline_selo_cupons.sql` da Fatia 3 permaneceu como contrato estável.

---

## 5. Veredicto Final

**`/check verify`: APROVADO.**  
A Fatia 4 cumpre integralmente os requisitos arquiteturais e de código locais, os 10 Critérios de Aceite estão satisfeitos e verificados por testes automatizados, e todos os portões de qualidade do repositório operam em verde.
