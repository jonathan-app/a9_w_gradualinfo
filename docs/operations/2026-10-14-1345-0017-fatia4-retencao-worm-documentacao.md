# Documentação Técnica: Spec 0017 / Fatia 4 (Retenção WORM e Endpoints)

**Data:** 2026-10-14 13:45  
**Spec base:** `docs/specs/2026-10-13-1710-0017-modulo-ofertas-historico-precos.md`  
**Escopo:** `docs/scope/2026-10-14-1100-0017-fatia4-retencao-worm-endpoints.md`  
**Adendo técnico:** `docs/specs/2026-10-14-1115-0017-fatia4-retencao-worm-endpoints-adendo.md`  
**Relatório de verificação:** `docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md`  
**Status:** Consolidado e verificado localmente (688 testes Vitest / 0 erros de qualidade)  
**Ambiente:** Estritamente local (desenvolvimento e CI); sem acesso a produção ou Cloudflare remota.

---

## 1. Visão Geral da Entrega

A Fatia 4 consolida a cadeia de custódia e integridade do Selo de Preço Verificado da GradualInfo. Ela integra o pipeline transacional (Fatias 1, 2 e 3) aos endpoints da aplicação Next.js App Router e ao modelo probatório imutável WORM (Write Once, Read Many).

Esta entrega foi implementada e validada com **688 testes automatizados**, mantendo o código enxuto (filosofia Ponytail, zero dependências extras no `package.json`) e com arquitetura _fail-closed_ contra falhas parciais.

---

## 2. Contratos dos Endpoints da Aplicação

### 2.1 `POST /api/admin/ofertas/[id]/avaliar-selo`

- **Arquivo:** `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`
- **Objetivo:** Ingestão de observação de preço, canonização determinística, persistência WORM e avaliação transacional do selo.
- **Autenticação Dual (Fail-Closed):**
  1. _Administrador:_ Sessão administrativa com MFA AAL2 (`assertAdminApiAuth`).
  2. _Coletor Automatizado:_ Assinatura HMAC-SHA256 (`x-gradualinfo-signature`) com timestamp (`x-gradualinfo-timestamp`) e nonce (`x-gradualinfo-nonce`).
- **Limites e Validações de Entrada:**
  - Limite estrito de payload: 512 KB (`Buffer.byteLength(rawBodyText, 'utf8') <= 524288`).
  - Oferta e Lojista: Requer `offers.id` UUIDv4 válido e `merchants.domain` preenchido. Se o lojista não tiver domínio válido, a requisição aborta com **HTTP 422** (`missing_merchant_domain`) antes de gerar digest ou gravar no storage.
  - Prova Bruta (`raw_proof`): Requer `proof_type` (`api_response_json` ou `selector_text_extract`) e `content` textual não vazio.
- **Ordem de Operações (Fail-Closed):**
  1. Recebe e valida payload e autenticação.
  2. Valida domínio do lojista (rejeita 422 se vazio).
  3. Canoniza payload via RFC 8785 e computa hash SHA-256.
  4. Persiste no storage WORM com retenção de 730 dias. Se o storage falhar (503), o processo é interrompido sem tocar no banco.
  5. Se a evidência já existia e a oferta já possui selo ativo e vigente, devolve **HTTP 200** com `reused_active_evidence` de forma idempotente, sem escrita redundante.
  6. Dispara a RPC transacional `evaluate_and_set_verified_price` com os 12 parâmetros canônicos da Fatia 3.
  7. Se a RPC reprovar ou sofrer restrição, devolve **HTTP 422**. A evidência permanece registrada no WORM para fins de auditoria forense.

### 2.2 `GET /api/admin/evidencias/[hash]`

- **Arquivo:** `app/api/admin/evidencias/[hash]/route.ts`
- **Objetivo:** Consulta de evidências físicas para fiscalização, auditoria e defesa do consumidor.
- **Autenticação:** Exclusiva para administradores autenticados com MFA AAL2.
- **Contrato:**
  - Valida formato do hash (`^[a-f0-9]{64}$`).
  - Executa verificação de existência via HEAD no storage.
  - Retorna metadados de auditoria e presigned URL temporária com expiração limitada a 15 minutos (900 segundos).

### 2.3 `GET /api/ofertas`

- **Arquivo:** `app/api/ofertas/route.ts`
- **Objetivo:** Listagem pública de ofertas ativas para a home e componentes de busca.
- **Autenticação:** Pública (anon).
- **Contrato:**
  - Consulta unicamente a view `active_offers_view`.
  - Suporta filtros por `product_id` e `merchant_id`, com paginação segura (máximo 100 itens).
  - Cabeçalhos de cache: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

### 2.4 `GET /api/out/[id]`

- **Arquivo:** `app/api/out/[id]/route.ts`
- **Objetivo:** Despacho seguro de redirecionamento para parceiros e afiliados.
- **Segurança contra Open Redirect:**
  - Validação estrita de protocolo: apenas `https:`.
  - Bloqueio de credenciais embutidas na URL (`user:pass`).
  - Bloqueio de portas não padrão (apenas porta 443 ou vazia).
  - _Boundary Matching_ estrito de hostname contra o domínio do lojista (`merchants.domain`). Exemplo: para lojista `amazon.com.br`, aceita `amazon.com.br` e `sub.amazon.com.br`; rejeita `atacante-amazon.com.br`.
  - _Shortcut documentado:_ Redes agregadoras intermediárias (ex.: Lomadee, Awin) exigirão allowlist antes do uso em produção.
- **Tratamento de Ofertas Inativas (HTTP 410):**
  - Se a oferta estiver com `status = 'esgotada'`, `status = 'pausada'` ou o lojista inativo (`is_active = false`), retorna **HTTP 410 (Gone)** com interface HTML institucional informando o encerramento da oferta e link de retorno ao portal.
  - Para ofertas ativas, executa redirecionamento **HTTP 307 (Temporary Redirect)** com cabeçalhos restritivos (`Cache-Control: private, no-store, max-age=0`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 3. Canonização Determinística RFC 8785 (JCS)

- **Arquivo:** `lib/offers/evidence-canonicalizer.ts`
- **Princípio:** O hash SHA-256 de uma evidência deve ser idêntico e reprodutível independente da plataforma, versão de runtime ou ordem de chaves fornecida pelos coletores.
- **Regras Estritas:**
  - Ordenação recursiva de chaves de objetos por unidades de código UTF-16 (`.sort()`).
  - Serialização de números conforme ES6 / IEEE-754 (rejeitando `NaN` e `Infinity`, convertendo `-0` em `0`).
  - Caracteres Unicode normais (como acentuação pt-BR) mantidos nativamente em UTF-8 (sem escapes supérfluos).
  - Escapes delimitados estritamente conforme RFC 8785 (aspas, barra invertida e caracteres de controle U+0000 até U+001F).
  - Propriedades com valor `undefined` ou funções disparam erro de formato, exigindo que campos vazios sejam explicitamente `null`.
- **Vetores Homologados:**
  - Vetor 1 (básico, 69 bytes UTF-8): SHA-256 `6726c7fb10e76b5b98acdb09c355885e2e7867ce594f3c3afba7322bb0a2190b`.
  - Vetor 2 (aninhado com arrays, 882 bytes UTF-8): SHA-256 `6345ec466ff4dd85bf8a7862da4593452c9dbe0699bc694eb0be8610ebec718c`.

---

## 4. Camada de Armazenamento WORM

- **Interfaces e Erros:** `lib/offers/storage/evidence-storage-adapter.ts`
- **Adaptador em Memória:** `lib/offers/storage/memory-adapter.ts`
- **Semântica de Imutabilidade (Object Lock Compliance):**
  - `putEvidence(sha256, bytes, retentionDays)`:
    - Retém o objeto por 730 dias a partir da data de gravação (`retainUntilDate`).
    - Valida integridade criptográfica: o SHA-256 dos bytes deve bater com o parâmetro declarado.
    - Idempotência: se o objeto já existir e os bytes forem idênticos, retorna `{ stored: false, reused_existing: true }`.
    - Proteção contra colisão: se o objeto já existir com bytes divergentes, dispara `EvidenceCollisionConflictError` (HTTP 409).
  - `deleteEvidence()`: Sumariamente proibido (`WORMOperationForbiddenError` com HTTP 403).
  - `extendRetention(sha256, additionalDays)`: Permite exclusivamente avançar a data de expiração, respeitando o teto de 5 anos (1825 dias civis) do CDC Art. 27. Reduções ou anulações são rejeitadas.

---

## 5. Autenticação e Proteção Anti-Replay de Webhooks

- **Arquivo:** `lib/offers/webhook-auth.ts`
- **Mecanismos:**
  - Assinatura HMAC-SHA256 comparada via `crypto.timingSafeEqual` sobre o payload canônico `v1:<timestamp>:<nonce>:<rawBody>`.
  - Janela temporal máxima de ±300 segundos (5 minutos) contra clock drift.
  - `MemoryNonceCache`: Implementação em memória local com:
    - Auto-sweep periódico a cada 60 segundos em `consume()`.
    - Teto estrito de capacidade (`maxEntries = 5000`) com descarte FIFO da chave mais antiga caso a capacidade seja excedida, evitando vazamento de memória.
- **Trava de Produção:** O cache local é estritamente monoprocesso. A ativação do webhook para coletores externos em produção permanece **bloqueada** até que a camada de nonces seja migrada para armazenamento distribuído (ex.: Cloudflare KV / Durable Objects / PostgreSQL com TTL).

---

## 6. Distinção Crucial: Validação Local vs. Infraestrutura Real

| Capacidade Arquitetural        | Estado no Checkout Local                             | Dependência para Produção Real                                                                                         |
| :----------------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Canonização RFC 8785 e SHA-256 | **Validado 100%** (algoritmo puro em Node/TS)        | Pronto para produção sem alterações.                                                                                   |
| Consistência Fail-Closed       | **Validado 100%** (testes com simulação de 503)      | Pronto para produção sem alterações.                                                                                   |
| Redirecionamento e HTTP 410    | **Validado 100%** (14 testes unitários)              | Requer provisionamento de domínio e allowlist de afiliados.                                                            |
| Imutabilidade WORM 730d        | **Emulado 100%** (`MemoryEvidenceStorageAdapter`)    | **Pendente de infraestrutura:** Requer bucket Cloudflare R2 com Object Lock Compliance ativado via Terraform/Wrangler. |
| Ciclo de Vida 5 Anos Cold      | **Contrato validado** (extensão preventiva testada)  | **Pendente de infraestrutura:** Requer bucket frio e Worker batch de reconciliação.                                    |
| Anti-Replay de Webhook         | **Validado localmente** (`MemoryNonceCache`)         | **Pendente de infraestrutura:** Requer cache compartilhado distribuído (KV/DO/PostgreSQL).                             |
| Migrations no Banco            | **Validado localmente** (Supabase local / 152 pgTAP) | **Pendente de deploy:** Requer aplicação de migrations no Supabase de produção.                                        |

---

## 7. Rastreabilidade e Arquivos de Referência

- **Código da Aplicação:**
  - `lib/offers/evidence-canonicalizer.ts`
  - `lib/offers/storage/evidence-storage-adapter.ts`
  - `lib/offers/storage/memory-adapter.ts`
  - `lib/offers/webhook-auth.ts`
  - `app/api/admin/ofertas/[id]/avaliar-selo/route.ts`
  - `app/api/admin/evidencias/[hash]/route.ts`
  - `app/api/ofertas/route.ts`
  - `app/api/out/[id]/route.ts`
- **Testes Automatizados (97 testes de ofertas, 688 no total):**
  - `__tests__/unit/lib/offers/evidence-canonicalizer.test.ts`
  - `__tests__/unit/lib/offers/memory-adapter.test.ts`
  - `__tests__/unit/lib/offers/webhook-auth.test.ts`
  - `__tests__/unit/lib/offers/route-avaliar-selo.test.ts`
  - `__tests__/unit/lib/offers/route-evidencias.test.ts`
  - `__tests__/unit/lib/offers/route-ofertas.test.ts`
  - `__tests__/unit/lib/offers/route-out-redirect.test.ts`
- **Governança e Verificação:**
  - Relatório formal de verificação: `docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md`
  - Histórico de delegação: `workflow/STATE.md`
