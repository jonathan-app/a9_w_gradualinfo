# Spec 0017 · Adendo da Fatia 4: Retenção WORM, Imutabilidade, Endpoints da Aplicação e Fechamento Arquitetural

**Data:** 2026-10-14 11:20  
**Status:** Accepted  
**Decisão formal do proprietário:** Aprovada em 2026-10-14 com fechamento de pendências de revisão (Cloudflare R2 Object Lock Compliance em produção com mock rigoroso em desenvolvimento local, JSON canônico determinístico RFC 8785 com vetores de teste SHA-256, ciclo de vida de 730 dias hot storage + transição auditada para arquivo frio com retenção total de cinco anos conforme CDC Art. 27, autenticação dual com AAL2 e webhook HMAC com nonce anti-replay, e idempotência concorrente).  
**Restrição operacional absoluta:** Aceite estritamente arquitetural e documental. Proibido deploy, proibida configuração remota na Cloudflare, proibido acesso a storage produtivo, proibido push ou merge. Sem código de aplicação ou novas migrations antes da liberação formal para `/develop`.

---

## 1. Visão Geral e Arquitetura Lógica

A Fatia 4 conecta o pipeline transacional da Fatia 3 (`evaluate_and_set_verified_price`) aos route handlers da aplicação Next.js e ao armazenamento físico de evidências sob garantia WORM (Write Once, Read Many).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Coletor ou Painel Admin                         │
│   (Submissão via POST com autenticação admin AAL2 ou webhook HMAC)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js App Router (Route Handlers)                  │
│                                                                        │
│  1. Validação estrutural de tipos, limites (max 512 KB) e schema       │
│  2. Canonização determinística RFC 8785 (JCS) e hash SHA-256           │
│  3. Persistência no Adaptador de Storage WORM (Fail-Closed)            │
│  4. Invocação da RPC SQL: public.evaluate_and_set_verified_price       │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Adaptador Storage WORM         │  │     Supabase PostgreSQL      │
│  • Local: MemoryStorageAdapter WORM  │  │  • public.offers             │
│    (emulação estrita de Object Lock) │  │  • public.price_audit_logs   │
│  • Prod: Cloudflare R2 Object Lock   │  │  • public.active_offers_view │
│    (Compliance Mode: 730d hot)       │  │  • SELECT ... FOR UPDATE     │
│  • Arquivo frio criptografado (5a)   │  │  • ON DELETE RESTRICT        │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Contrato de Evidência Canônica RFC 8785 (JCS) e SHA-256

Para que o resumo criptográfico SHA-256 seja perfeitamente estável e reprodutível independente da plataforma ou linguagem, a serialização dos bytes da evidência obedece rigorosamente ao padrão **RFC 8785 (JSON Canonicalization Scheme - JCS)**.

### 2.1 Regras de Canonização Determinística

1. **Codificação:** UTF-8 estrito, sem BOM (Byte Order Mark).
2. **Ordenação de chaves:** Chaves de objetos são ordenadas lexicograficamente pela sequência de code points UTF-16/Unicode (`Array.prototype.sort()`).
3. **Sem espaçamento:** Nenhum espaço em branco, tabulação ou quebra de linha entre tokens (`:` e `,`).
4. **Formatação de números:** Inteiros monetários em centavos sem zeros à esquerda; números de ponto flutuante conforme a representação canônica ECMAScript 6 / IEEE-754 (sem expoentes supérfluos, `0` é representado como `0`).
5. **Escape de strings:** Apenas aspas duplas (`\"`), barra invertida (`\\`) e caracteres de controle Unicode (U+0000 até U+001F) são escapados como `\u00xx`. Caracteres acentuados legítimos permanecem em sua representação UTF-8 nativa sem sequências de escape unicode desnecessárias.
6. **Campos nulos e opcionais:** O schema define os campos opcionais. No payload canônico, **campos opcionais não aplicáveis ou sem valor DEVEM ser serializados explicitamente como `:null`** (exemplo: `"coupon_code":null`). Valores `undefined`, `NaN`, `Infinity`, `Symbol` ou funções são expressamente proibidos e resultam em rejeição imediata com `HTTP 400 Bad Request (invalid_evidence_format)` antes da canonização.

### 2.2 Schema da Evidência (`evidence_schema_version = "1.0"`)

```typescript
export interface CanonicalEvidencePayload {
  schema_version: '1.0';
  captured_at: string; // ISO 8601 UTC ex: "2026-10-14T14:30:00.000Z"
  offer: {
    id: string; // UUIDv4 da oferta
    product_id: string; // UUIDv4 do produto
    merchant_id: string; // UUIDv4 do lojista
    merchant_domain: string; // ex: "amazon.com.br"
    advertised_url: string; // URL canônica anunciada
  };
  product_identity: {
    sku: string; // SKU anunciado (obrigatório)
    ean: string | null; // EAN/UPC anunciado (null se não houver no catálogo)
    specs: Record<string, unknown>; // Cópia exata de products.specs_json
  };
  commercial_terms: {
    price_cents: number; // Preço anunciado em centavos (> 0)
    original_price_cents: number | null; // Preço de referência se anunciado
    currency: 'BRL';
    payment_method: 'a_vista' | 'parcelado' | 'pix' | 'cartao';
    installment_count: number; // >= 1
    installment_price_cents: number; // >= 0
    shipping_cost_cents: number; // Frete em centavos (0 se grátis)
    region_code: string | null; // Código da UF ou região normalizada
    coupon_code: string | null; // Código do cupom testado
  };
  collector: {
    origin: 'admin_aal2' | 'signed_webhook';
    actor_id: string; // ADMIN_USER_ID ou ID do webhook coletor
    collector_version: string;
  };
  raw_proof: {
    proof_type: 'api_response_json' | 'selector_text_extract';
    content: string; // Texto exato ou JSON stringificado da resposta original
  };
}
```

### 2.3 Vetores de Teste de Referência (Test Vectors Comprovados)

A implementação da biblioteca de canonização em `lib/offers/evidence-canonicalizer.ts` adota o algoritmo canônico puro estritamente conforme RFC 8785 (Anders Rundgren / IETF JCS), garantindo:

- Ordenação de chaves por code units UTF-16 (`Array.prototype.sort()`).
- Serialização ES6 / IEEE-754 de números (inteiros sem zeros supérfluos, `-0` normalizado para `0`).
- Serialização de strings com escapes restritos a `\"`, `\\` e caracteres de controle U+0000 a U+001F (`\b`, `\f`, `\n`, `\r`, `\t` ou `\u00xx`), mantendo caracteres UTF-8 multilíngues legítimos (como acentuação pt-BR) nativos.

Os seguintes vetores foram recalculados e matematicamente comprovados no runtime local:

#### Vetor 1: Ordenação de Chaves e Escapes

- **Entrada (objeto em memória com chaves fora de ordem e caracteres de escape):**
  ```json
  {
    "z": "linha 1\nlinha 2",
    "a": 100,
    "chave com espaço": "valor",
    "m": null
  }
  ```
- **String Canônica RFC 8785 esperada:**
  ```text
  {"a":100,"chave com espaço":"valor","m":null,"z":"linha 1\nlinha 2"}
  ```
- **Tamanho exato:** 69 bytes UTF-8 (68 caracteres UTF-16, 69 bytes em UTF-8 devido ao "ç" que ocupa 2 bytes: 0xc3 0xa7).
- **SHA-256 Hex esperado:**
  ```text
  6726c7fb10e76b5b98acdb09c355885e2e7867ce594f3c3afba7322bb0a2190b
  ```

#### Vetor 2: Payload Real Completo da Evidência

- **String Canônica RFC 8785 esperada:**
  ```text
  {"captured_at":"2026-10-14T14:30:00.000Z","collector":{"actor_id":"a3qua96@gmail.com","collector_version":"1.0.0","origin":"admin_aal2"},"commercial_terms":{"coupon_code":null,"currency":"BRL","installment_count":1,"installment_price_cents":549900,"original_price_cents":629900,"payment_method":"a_vista","price_cents":549900,"region_code":"SP","shipping_cost_cents":0},"offer":{"advertised_url":"https://www.amazon.com.br/dp/B0CXYZ1234","id":"c1f7b0e1-4829-4d6e-931b-26f58f4a1329","merchant_domain":"amazon.com.br","merchant_id":"f5e4d3c2-0000-4000-8000-000000000002","product_id":"e4d3c2b1-0000-4000-8000-000000000001"},"product_identity":{"ean":"7891234567890","sku":"G15-5530-A20P","specs":{"processor":"i7-13650HX","ram":"16GB","storage":"512GB SSD"}},"raw_proof":{"content":"{\"status\":\"in_stock\",\"price\":549900}","proof_type":"api_response_json"},"schema_version":"1.0"}
  ```
- **Tamanho exato:** 882 bytes UTF-8.
- **SHA-256 Hex esperado:**
  ```text
  2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a
  ```
- **Chave de Armazenamento:** `evidences/sha256/2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a.json`

---

## 3. Armazenamento WORM, Object Lock e Retenção Legal de 5 Anos

### 3.1 Interface do Adaptador de Storage (`EvidenceStorageAdapter`)

A camada de aplicação comunica-se com o storage exclusivamente através da interface:

```typescript
export interface PutEvidenceResult {
  stored: boolean;
  reused_existing: boolean;
  storage_path: string;
  byte_size: number;
  sha256: string;
}

export interface GetEvidenceResult {
  data: Uint8Array;
  byte_size: number;
  sha256: string;
  content_type: string;
  created_at: Date;
}

export interface EvidenceStorageAdapter {
  putEvidence(
    sha256: string,
    canonicalBytes: Uint8Array,
    retentionDays: number,
  ): Promise<PutEvidenceResult>;
  getEvidence(sha256: string): Promise<GetEvidenceResult>;
  headEvidence(
    sha256: string,
  ): Promise<{ exists: boolean; byte_size?: number }>;
  getPresignedUrl(sha256: string, expiresInSeconds: number): Promise<string>;
}
```

### 3.2 Emulação de Object Lock e Validação em Desenvolvimento Local

Para desenvolvimento e testes automatizados sem acesso à Cloudflare remota, a implementação em `lib/offers/storage/memory-adapter.ts` replica estritamente o comportamento do Object Lock em modo Compliance:

1. **Tentativa de Deleção:** Lança `MethodNotAllowedError` (HTTP 405) para qualquer chamada de deleção.
2. **Tentativa de Sobrescrita com Conteúdo Divergente:** Se a chave já existir e os bytes recebidos divergirem do conteúdo gravado, lança `EvidenceCollisionConflictError` (HTTP 409).
3. **Idempotência:** Se a chave já existir e os bytes forem rigorosamente idênticos (mesmo SHA-256), retorna `{ stored: false, reused_existing: true }`.

### 3.3 Ciclo de Vida: Hot Storage (730d) e Cold Storage (5 Anos / CDC Art. 27)

A obrigação legal de preservação probatória (Artigo 27 do CDC) requer 5 anos (1.825 dias civis) a partir do timestamp original da coleta (`price_audit_logs.checked_at`). O ciclo divide-se em:

1. **Camada Quente (Hot Storage):**
   - Mantida no bucket principal com Object Lock Compliance até `checked_at + 730 days`.
   - Permite consultas imediatas pelo painel de auditoria.
2. **Modelo de Estados da Transição Fria no Banco (`price_audit_logs`):**
   - `cold_storage_status`: enum/check (`'hot'`, `'transitioning'`, `'archived'`, `'failed_retry'`), default `'hot'`.
   - `cold_storage_path`: texto com a localização no arquivo frio.
   - `cold_archived_at`: timestamp UTC da confirmação de integridade.
3. **Rotina de Transição e Reconciliação:**
   - Entre 700 e 730 dias de vida da evidência, um job batch agendado seleciona registros com status `'hot'` ou `'failed_retry'`.
   - O job atualiza o status para `'transitioning'` e copia o objeto para o bucket frio criptografado com retenção fixada até completar 5 anos da data original (`checked_at + 1825 days`).
   - **Verificação Criptográfica de Destino:** O job executa `GET` no objeto copiado no bucket frio, recomputa o SHA-256 e compara com `price_audit_logs.evidence_hash`.
   - Somente após igualdade exata do hash no destino, o registro é atualizado para `cold_storage_status = 'archived'` e `cold_archived_at = now()`.
4. **Tratamento de Falhas e Extensão Preventiva:**
   - Se a cópia ou a verificação de hash falhar: o status passa para `'failed_retry'`, um alerta é gerado e o job invoca a API do storage quente estendendo preventivamente o Object Lock do objeto original em blocos de 30 dias.
   - **Nenhuma evidência é expurgada ou abandonada sem que a presença criptograficamente conferida no arquivo frio esteja consolidada.**

### 3.3.1 Condições Técnicas e Operacionais da Extensão de Retenção Object Lock

1. **Semântica R2 / S3 Compliance Mode:** A especificação de Object Lock em modo Compliance permite estritamente que chamadas `PutObjectRetention` avancem a data `RetainUntilDate` para um momento posterior no tempo; ela proíbe de forma inviolável encurtar ou anular o período de retenção, garantindo proteção contra perda acidental mesmo durante incidentes operacionais.
2. **Permissões IAM / API Token:** O token de serviço ou worker responsável pelo job de reconciliação e transição necessita da permissão explícita `s3:PutObjectRetention` no bucket quente. Sem esse privilégio, qualquer tentativa de extensão preventiva falha fechada.
3. **Teto de Extensão e Salvaguarda Operacional:** Para mitigar retenção infinita em hot storage decorrente de falha externa persistente (gerando custos excessivos), a rotina de extensão impõe um teto absoluto cumulativo de **1.825 dias (5 anos)** a contar de `checked_at`. Caso esse teto seja atingido ou caso ocorram 5 tentativas consecutivas com status `'failed_retry'`, a extensão automática é suspensa e um alerta de severidade máxima (P0) é encaminhado para auditoria manual imediata, mantendo o objeto protegido pelo período vigente.

---

## 4. Assinatura Real da RPC SQL (Fatia 3) e Idempotência Concorrente

### 4.1 Assinatura Real Confirmada no Código

Conforme verificado na migração `supabase/migrations/20261013030000_modulo_ofertas_pipeline_selo_cupons.sql` (linhas 48 a 70), a função RPC possui **exatamente 12 parâmetros posicionais**:

```sql
public.evaluate_and_set_verified_price(
  p_offer_id             uuid,
  p_action               text,                     -- 'concessao' ou 'renovacao'
  p_announced_sku        text,                     -- SKU anunciado
  p_announced_ean        text,                     -- EAN anunciado ou null
  p_announced_variant    jsonb,                    -- specs da variante anunciada
  p_region_code          text,                     -- UF regional ou null
  p_origin_actor_id      text,                     -- ID do auditor ou coletor
  p_evidence_hash        text,                     -- SHA-256 minúsculo (64 chars)
  p_evidence_byte_size   integer,                  -- tamanho exato em bytes (> 0)
  p_evidence_content_type text,                    -- 'application/json'
  p_evidence_storage_path text,                    -- 'evidences/sha256/[hash].json'
  p_notes                text default null         -- observações de auditoria
)
returns table (
  approved boolean,
  badge_status text,
  reason text,
  effective_price_cents integer,
  median_30d_cents integer,
  audit_id uuid,
  badge_expires_at timestamptz
)
```

### 4.2 Idempotência Concorrente, Bloqueio de Colisões e Garantias Transacionais

1. **Bloqueio Transacional no Banco (`SELECT ... FOR UPDATE`):**
   - A RPC executa nativamente `SELECT o.* FROM public.offers o WHERE o.id = p_offer_id FOR UPDATE;` (linha 103), serializando requisições simultâneas para a mesma oferta e impedindo condições de corrida na avaliação do selo.
   - Qualquer segunda transação concorrente aguarda a conclusão da primeira.
2. **Atomicidade e Rollback Integral:**
   - A função `evaluate_and_set_verified_price` opera sob uma transação PL/pgSQL atômica. Se qualquer regra falhar com exceção (como `shipping_evaluation_changed` ou falha de integridade), o PostgreSQL reverte integralmente todas as operações (`ROLLBACK`), garantindo que a oferta não sofra alteração e nenhum log órfão seja comitado.
3. **Imutabilidade e Consistência Estrutural no Banco:**
   - A tabela `public.price_audit_logs` é protegida pelo trigger `tg_prevent_audit_log_mutation`, que bloqueia qualquer `UPDATE` ou `DELETE` com erro `55000`.
   - A integridade do selo é assegurada pela constraint `chk_badge_consistency` em `public.offers`, que impõe `badge_expires_at = badge_verified_at + interval '24 hours'` quando verificado, ou ambos `null` quando não verificado.
4. **Reexecução Idempotente (Mesmo Hash e Mesma Chave):**
   - Se uma requisição com o mesmo hash for recebida e o selo ativo já estiver vigente no banco: a aplicação detecta que o arquivo já existe com hash idêntico no storage (`reused_existing = true`) e retorna o resultado consolidado existente, evitando inserção desnecessária de logs repetidos no banco.
5. **Colisão de Hash com Conteúdo Divergente (Detecção de Adulteração):**
   - Se a chave `evidence_hash` já existir no storage físico mas os bytes recebidos divergirem (colisão de hash acidental ou tentativa de sobreposição maliciosa): o adaptador lança imediatamente `EvidenceCollisionConflictError` (HTTP 409 Conflict). A requisição é abortada e a RPC do banco **NÃO** é executada.

---

## 5. Autenticação Administrativa e Webhook Anti-Replay

O endpoint de avaliação aceita duas modalidades estritas de autorização (Fail-Closed):

### 5.1 Modalidade 1: Sessão Administrativa com MFA AAL2

- **Validação:** Realizada pelo helper canônico do repositório `assertAdminApiAuth(request)` em `lib/admin/auth.ts`.
- **Regras Estritas:**
  1. Identidade via `auth.getUser()`, exigindo `user.id === env.ADMIN_USER_ID`.
  2. Nível de segurança da sessão comprovado em AAL2 (`aal === 'aal2'`).
  3. Verificação de origem da requisição contra `SITE_ORIGIN` para proteção anti-CSRF.
  4. Sessões anônimas, sem MFA ou em AAL1 são rejeitadas com **HTTP 403 Forbidden** ou **HTTP 401 Unauthorized**.

### 5.2 Modalidade 2: Webhook de Coletor Assinado com HMAC-SHA256

- **Headers Obrigatórios:**
  - `x-gradualinfo-signature`: formato `v1=<hex_sha256>`
  - `x-gradualinfo-timestamp`: timestamp UNIX em segundos (ex: `1728905400`)
  - `x-gradualinfo-nonce`: UUIDv4 aleatório e único por requisição
- **Proteção contra Replay:**
  1. **Validação de Timestamp:** `Math.abs(now_seconds - timestamp) <= 300` (janela máxima de 5 minutos contra desvios de relógio).
  2. **Verificação de Nonce:** O nonce é verificado contra o cache de nonces. Se o nonce já tiver sido processado dentro da janela, a requisição é rejeitada com **HTTP 401 Unauthorized** (`replay_detected_nonce_already_used`).
- **Verificação da Assinatura:**
  1. String a ser assinada: `"v1:" + timestamp + ":" + nonce + ":" + rawBodyText`.
  2. Assinatura esperada computada via `crypto.subtle.sign("HMAC", key, encodedString)`.
  3. Comparação em tempo constante para mitigar ataques de temporização (timing attacks).
  4. Segredo gerenciado via variável de ambiente `OFFERS_WEBHOOK_SECRET` em `lib/env.ts`.

### 5.3 Limites Arquiteturais do Cache de Nonces: Local vs Distribuído

1. **Ambiente Local e Testes Unitários:** O cache de nonces é implementado via `MemoryNonceCache` (`Map<string, number>` em memória com TTL de 10 minutos e rotina periódica de limpeza de nonces expirados). É totalmente adequado e suficiente para testes automatizados, desenvolvimento monoprocesso e validação em sandbox.
2. **Ambiente Distribuído (Cloudflare Workers / Produção):** Instâncias serverless em múltiplos datacenters de borda não compartilham memória global. Portanto, a proteção anti-replay contra ataques concorrentes entre nós em produção exige uma camada de estado compartilhado consistente: **Cloudflare KV** (com expiração nativa TTL), **Durable Objects** ou **PostgreSQL** (`INSERT INTO webhook_nonces (nonce, expires_at) VALUES (...) ON CONFLICT DO NOTHING`).
3. **Salvaguarda de Ativação:** Fica expressamente documentado que **a ativação do webhook externo em produção é bloqueada até que a integração com o backend distribuído de nonces esteja configurada e validada**.

---

## 6. Especificação dos Endpoints (Next.js App Router)

### 6.1 `POST /api/admin/ofertas/[id]/avaliar-selo`

- **Limites de Entrada:** `Content-Length <= 524288` (máximo 512 KB).
- **Parâmetros da Rota:** `[id]` validado estritamente como UUIDv4.
- **Corpo da Requisição:**
  ```json
  {
    "advertised_sku": "G15-5530-A20P",
    "advertised_specs": {
      "ram": "16GB",
      "storage": "512GB SSD",
      "processor": "i7-13650HX"
    },
    "advertised_ean": "7891234567890",
    "region_code": "SP",
    "coupon_code": "TECH10",
    "raw_proof": {
      "proof_type": "api_response_json",
      "content": "{\"status\":\"in_stock\",\"price\":549900}"
    },
    "notes": "Coleta noturna automática"
  }
  ```
- **Códigos de Resposta:**
  - `200 OK`: Avaliação processada com sucesso (aprovada ou reprovada com justificativa técnica).
  - `400 Bad Request`: Parâmetros ausentes, SKU em branco, UUID inválido ou JSON malformado.
  - `401 Unauthorized`: Assinatura HMAC inválida, timestamp defasado ou nonce repetido.
  - `403 Forbidden`: Sessão administrativa sem MFA AAL2.
  - `404 Not Found`: Oferta não encontrada na tabela `public.offers`.
  - `409 Conflict`: Colisão de hash com conteúdo divergente no storage.
  - `422 Unprocessable Entity`: Cupom restritivo, variante divergente ou frete excessivo.
  - `503 Service Unavailable`: Falha de conexão ou timeout com o storage WORM.

### 6.2 `GET /api/admin/evidencias/[hash]`

- **Autenticação:** Exclusiva para administradores com MFA AAL2.
- **Validação:** `[hash]` deve coincidir estritamente com `/^[a-f0-9]{64}$/`.
- **Resposta (`200 OK`):**
  ```json
  {
    "evidence_hash": "2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a",
    "storage_path": "evidences/sha256/2b4e998ccd53e47a1c464a8cf4cb3dbe2bdbe131e875069644821c08ac7ca35a.json",
    "byte_size": 1024,
    "download_url": "https://...r2.cloudflarestorage.com/...?token=...",
    "expires_in_seconds": 900
  }
  ```

### 6.3 `GET /api/ofertas` e `GET /api/ofertas/[slug]/historico`

- **Acesso:** Público (anon).
- **Fonte:** View pública `active_offers_view` (com `security_invoker = true`) e `price_history` onde `is_anomalous = false`.
- **Headers:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

### 6.4 `GET /api/out/[id]` (Redirecionamento Seguro de Afiliados)

- **Acesso:** Público.
- **Validação Integral de URL:**
  1. Objeto `new URL(offer.affiliate_url)`.
  2. Protocolo restrito a `https:` (rejeita `http:`, `javascript:`, `data:`).
  3. Bloqueio de credenciais embutidas (`parsed.username !== '' || parsed.password !== ''`).
  4. Bloqueio de portas de conexão não padrão (`parsed.port !== '' && parsed.port !== '443'`).
  5. **Boundary Match Estrito de Hostname:**
     `const targetHost = parsed.hostname.toLowerCase();`  
     `const isExact = targetHost === merchantDomain.toLowerCase();`  
     `const isSub = targetHost.endsWith('.' + merchantDomain.toLowerCase());`  
     Se `!isExact && !isSub`: retorna **HTTP 403 Forbidden**.
  6. **Tratamento de Ofertas Inativas:**
     Se `offer.status IN ('esgotada', 'pausada')` ou `merchant.is_active = false`: responde **HTTP 410 Gone** com tela institucional explicativa e link para voltar ao artigo, **sem redirecionar para fora**.
  7. **Despacho Válido:**
     Responde **HTTP 307 Temporary Redirect** com `Location: <url>`, `Cache-Control: private, no-store, max-age=0`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 7. Modelo de Consistência Sequencial Fail-Closed

```
[1. Entrada e Validação]
      │
      ├─► Validação estrutural de tipos, limites (max 512 KB)
      ├─► Autenticação (AAL2 ou HMAC com nonce verificado)
      └─► Canonização RFC 8785 (JCS) -> SHA-256
      │
[2. Persistência no Storage WORM]
      │
      ├─► HEAD evidence_hash
      │     ├─► Existe com hash idêntico -> Reutiliza objeto
      │     └─► Existe com bytes divergentes -> ABORT 409 Conflict
      ├─► PUT objeto com Object Lock Compliance (730 dias)
      │     └─► Falha no storage -> ABORT 503 Service Unavailable (Banco Intocado)
      │
[3. Invocação Transacional da RPC no Supabase]
      │
      └─► Chama public.evaluate_and_set_verified_price (12 parâmetros)
            │
            ├─► Aprovado -> Grava auditoria, concede selo por 24h
            ├─► Reprovado -> Grava auditoria de reprovação, selo negado
            └─► Falha SQL / Timeout -> Transação reverte integralmente
                (Arquivo no storage permanece íntegro; retry futuro reutiliza o hash)
```

---

## 8. Matriz Mínima de Validação Arquitetural (12 Cenários)

| Cenário de Teste                             | Comportamento Esperado                                                                | Prova Automatizada Prevista                                                                    |
| :------------------------------------------- | :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| **1. Paridade RFC 8785**                     | Serialização idêntica aos vetores de teste 1 e 2 com hashes correspondentes.          | Testes unitários de canonização em `__tests__/unit/lib/offers/evidence-canonicalizer.test.ts`. |
| **2. Idempotência de Payload**               | Requisições repetidas retornam a mesma resposta sem criar duplicatas.                 | Teste chamando o handler 2x com mesma `Idempotency-Key`.                                       |
| **3. Colisão de Hash com Bytes Divergentes** | Chave com conteúdo divergente aborta com HTTP 409.                                    | `MemoryEvidenceStorageAdapter` disparando `EvidenceCollisionConflictError`.                    |
| **4. Indisponibilidade de Storage**          | Storage offline retorna HTTP 503; banco não sofre alteração.                          | Teste com mock de injeção de falha no storage verificando rollback no banco.                   |
| **5. Falha de Banco pós-Storage**            | Falha SQL na RPC reverte banco; evidência gravada é preservada no storage.            | Teste de falha provocada na chamada RPC após persistência no mock.                             |
| **6. Acesso Sem AAL2**                       | Requisição administrativa em AAL1 ou anônima retorna HTTP 403/401.                    | Teste com tokens de sessão sem segundo fator.                                                  |
| **7. Replay de Webhook por Timestamp**       | Assinatura HMAC com timestamp defasado $> 300$s é rejeitada com HTTP 401.             | Teste unitário com `timestamp = now - 301s`.                                                   |
| **8. Replay de Webhook por Nonce**           | Requisição dentro da janela de 300s com nonce já utilizado é rejeitada.               | Teste enviando 2 requisições com mesmo nonce e mesmo timestamp.                                |
| **9. Arquivamento Frio Incompleto**          | Divergência de hash na cópia fria impede `cold_archived = true` e estende retenção.   | Teste da rotina de transição fria simulando falha de hash no destino.                          |
| **10. Corrupção de Evidência**               | Leitura de objeto adulterado dispara alerta de integridade e nega retorno.            | Teste de leitura `getEvidence` com injeção de byte adulterado.                                 |
| **11. Tentativa de Open Redirect**           | Hostnames adulterados (`atacante-amazon.com.br`) retornam HTTP 403.                   | Teste de boundary matching em `/api/out/[id]`.                                                 |
| **12. Oferta Esgotada / Pausada**            | Requisição em `/api/out/[id]` para oferta esgotada devolve HTTP 410 sem redirecionar. | Teste unitário verificando resposta 410 institucional.                                         |

---

## 9. Critérios de Aceite da Especificação (`fatia4-arch/AC-01` a `AC-12`)

- **fatia4-arch/AC-01:** O payload canônico obedece estritamente ao RFC 8785 (JCS), validado pelos vetores de teste 1 e 2.
- **fatia4-arch/AC-02:** O adaptador de storage isola a aplicação e emula fielmente o Object Lock Compliance em desenvolvimento local.
- **fatia4-arch/AC-03:** A rota de avaliação consome a assinatura real de 12 parâmetros da RPC SQL da Fatia 3.
- **fatia4-arch/AC-04:** A autenticação dual suporta MFA AAL2 via `verifyAdminSession` e webhook HMAC com proteção anti-replay por nonce e janela de 300 segundos.
- **fatia4-arch/AC-05:** Tentativa de sobrescrita de evidência com bytes divergentes para o mesmo hash aborta com HTTP 409 Conflict.
- **fatia4-arch/AC-06:** A rota de avaliação é idempotente concorrente, apoiada no bloqueio `SELECT ... FOR UPDATE` do banco.
- **fatia4-arch/AC-07:** A rota `/api/out/[id]` valida lexicalmente a fronteira de hostname do lojista e devolve HTTP 410 para ofertas esgotadas ou pausadas.
- **fatia4-arch/AC-08:** A rota `/api/admin/evidencias/[hash]` fornece URL assinada temporária (máx 15 min) exclusiva para administradores AAL2.
- **fatia4-arch/AC-09:** A rota pública `/api/ofertas` calcula status efetivo e expiração via `active_offers_view`.
- **fatia4-arch/AC-10:** A rotina de arquivamento frio exige confirmação criptográfica de SHA-256 no destino antes de marcar `cold_archived = true`.
- **fatia4-arch/AC-11:** Em caso de falha no arquivamento frio, o status registra `'failed_retry'` e o Object Lock da camada quente é estendido preventivamente.
- **fatia4-arch/AC-12:** A suíte completa de testes executa localmente com código de saída zero, sem conexões externas à internet ou produção.

---

## 10. Delimitações e Implementação Local Concluída

1. **Implementação Local e Correções Ponytail:** Concluída sob autorização formal do proprietário em 2026-10-14, cobrindo o canonizador RFC 8785 determinístico (`lib/offers/evidence-canonicalizer.ts`), o adaptador de storage WORM (`lib/offers/storage/memory-adapter.ts`), a autenticação e anti-replay de webhooks (`lib/offers/webhook-auth.ts`) e os quatro route handlers em `app/api/`. Quatro achados do `/ponytail-review` foram sanados cirurgicamente (auto-sweep e teto de capacidade no nonce cache, validação 422 de domínio do lojista antes do WORM, otimização com `Buffer.byteLength` e documentação de allowlist para afiliados).
2. **Validação Automatizada e Verificação:** 97 testes unitários em 12 arquivos sob `__tests__/unit/lib/offers/` (56 novos testes adicionados pela Fatia 4) e portão `pnpm check:all` 100% aprovado (688 testes Vitest em 67 arquivos, 0 erros de tipo/lint/formatação). O relatório formal de verificação dos 10 Critérios de Aceite foi consolidado em `docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md` e a documentação técnica consolidada em `docs/operations/2026-10-14-1345-0017-fatia4-retencao-worm-documentacao.md`.
3. **Travas Operacionais Mantidas:** O ambiente de produção, credenciais da Cloudflare e buckets R2 remotos permanecem estritamente intocados. A ativação do webhook em produção permanece bloqueada até a implementação de um backend de nonces distribuído (Cloudflare KV / Durable Objects / PostgreSQL). Sem push, merge ou deploy.
