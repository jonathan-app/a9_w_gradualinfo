# 0017. Módulo de Ofertas Verificadas e Histórico de Preços

**Date**: 2026-10-13  
**Status**: Accepted  
**Author**: Jonathan Simão / Copiloto  
**Decision source**: Decisão formal do proprietário em 2026-10-13 (Fase 03 do Plano de Backend profissional, `docs/operations/2026-10-13-1436-plano-backend-nivel-profissional.md`). Aceite formal da arquitetura comercial e editorial desacoplada após checagem exaustiva de consistência em quatro pontos críticos: imutabilidade de índices e concorrência na agregação diária de preços, modelagem matemática de corte de outliers e tratamento de itens de baixo valor, ciclo de vida de retenção de evidências (730 dias hot storage + 5 anos cold storage para CDC Art. 27), e blindagem de privilégios estruturais em nível de banco/storage independentes de convenções de aplicação.  
**Restrição operacional absoluta**: Aceite estritamente arquitetural e documental. Proibida expressamente a execução de migrations, criação de tabelas em produção ou deploys até nova autorização formal do proprietário.

---

## 1. Contexto e Problema

O portal **GradualInfo** é uma publicação digital voltada para tecnologia, engenharia de software e consumo digital consciente.

### O Problema Comercial no Varejo Digital

No comércio eletrônico de eletrônicos e hardware, promoções frequentemente sofrem de vícios que prejudicam a experiência e lesam a confiança do consumidor:

1. **Falsos descontos ("metade do dobro")**: inflação artificial do preço de referência dias antes do evento comercial para forjar percentuais irreais de desconto.
2. **Confusão de variantes e SKUs**: atribuir o preço de um modelo de entrada (ex.: notebook com 8 GB de RAM e 256 GB SSD) à variante topo de linha (16 GB / 512 GB) na manchete ou card da recomendação.
3. **Condições de pagamento e custos ocultos**: divulgar como valor principal o preço à vista no Pix, mas omitir juros elevados no parcelamento, ou promover produtos cujo custo de frete obrigatório anula a vantagem econômica ("frete maquiado").
4. **Cupons restritivos opacos**: anunciar preço condicionado a cupom que é válido exclusivamente para clientes novos, cartões específicos de lojas parceiras ou assinaturas pagas.
5. **Links quebrados e promoções esgotadas**: redirecionar o usuário cegamente para páginas de erro ou produtos esgotados, degradando a autoridade editorial.

### O Papel do GradualInfo

O GradualInfo atua como curador técnico imparcial. A monetização via afiliação deve ser sustentada pela **credibilidade técnica**: o leitor confia porque o preço é historicamente auditado e o selo **"Preço Verificado"** possui metodologia empírica, dados comparáveis, auditoria imutável e expiração temporal rígida.

### Limites Explícitos (Fora de Escopo)

- **Zero contas de leitores**: não criamos cadastros de visitantes, perfis ou carteiras digitais no GradualInfo.
- **Zero intermediação de pagamento**: não implementamos checkout, gateway ou carrinho no portal (o leitor realiza a compra diretamente no e-commerce credenciado).
- **Zero scraping agressivo**: não realizamos varredura indiscriminada que sobrecarregue servidores parceiros ou viole termos de serviço.

---

## 2. Princípios de Arquitetura e Integração

```
┌────────────────────────────────────────────────────────┐
│                      Sanity Studio                     │
│  (Conteúdo editorial, artigos, guias de compra e reviews) │
└───────────────────────────┬────────────────────────────┘
                            │ (Referencia produto por slug)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Next.js 16 + Cloudflare Workers            │
│  • Cards de oferta integrados aos artigos e home       │
│  • APIs públicas: /api/ofertas, /api/ofertas/[slug]    │
│  • Redirecionamento seguro e auditado: /api/out/[id]   │
│  • Computação em tempo real de expiração do selo       │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (Leitura via Views com security_invoker)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL                  │
│  • merchants (lojistas credenciados com allowlist)    │
│  • products (catálogo padronizado de produtos e SKUs) │
│  • offers (ofertas ativas, preços em centavos)        │
│  • price_history (série temporal com agregação diária) │
│  • price_audit_logs (auditoria append-only infalsificável)│
└────────────────────────────────────────────────────────┘
```

1. **Separação Rígida de Responsabilidades**:
   - **Sanity**: permanece como fonte exclusiva do texto editorial dos artigos e análises. O artigo referencia apenas o `product_slug`.
   - **Supabase**: motor transacional do módulo comercial (lojistas, ofertas, preços históricos e auditoria).
   - **Next.js**: renderiza o artigo do Sanity e hidrata os blocos de oferta consultando as views públicas do Supabase.

2. **Prevenção de Erros de Ponto Flutuante**:
   - Todos os valores monetários são armazenados em **centavos inteiros** (`price_cents`, tipo `integer`), impedindo anomalias de arredondamento IEEE-754. Formatação para `R$ X.XXX,XX` ocorre estritamente na apresentação via `Intl.NumberFormat('pt-BR')`.

3. **Falha Segura (Fail-Safe)**:
   - Se os dados históricos forem insuficientes, se o tempo de verificação expirou, ou se houver divergência de variante, o selo "Preço Verificado" é **ocultado**. A oferta permanece informativa simples, sem a chancela do selo ativo.

---

## 3. Modelo Relacional no Supabase (Schema Proposto)

### Tabela: `merchants` (Lojistas Credenciados)

Armazena as plataformas parceiras autorizadas e suas regras de domínio canônico.

```sql
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE, -- ex: "amazon.com.br", "kabum.com.br"
  logo_url TEXT,
  affiliate_tag TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_merchant_domain CHECK (domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$')
);
```

### Tabela: `products` (Catálogo Canônico de Produtos e SKUs)

Padroniza especificações técnicas para evitar falsas equivalências entre modelos.

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  model_code TEXT, -- ex: "A2848", "G15-5530"
  category TEXT NOT NULL, -- ex: "Notebooks", "Monitores", "Smartphones"
  ean_upc TEXT UNIQUE, -- código de barras para match inequívoco de variante
  specs_json JSONB DEFAULT '{}'::jsonb, -- atributos estruturados (ram, storage, processador)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_product_slug CHECK (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
```

### Tabela: `offers` (Ofertas Atuais de Varejo)

Armazena as ofertas vigentes para cada produto.

```sql
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  url TEXT NOT NULL, -- URL limpa de destino no lojista
  affiliate_url TEXT NOT NULL, -- URL processada com tag de afiliação
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  original_price_cents INTEGER CHECK (original_price_cents IS NULL OR original_price_cents >= price_cents),
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT NOT NULL DEFAULT 'a_vista', -- 'a_vista', 'parcelado'
  installment_count INTEGER DEFAULT 1 CHECK (installment_count >= 1),
  installment_price_cents INTEGER,
  coupon_code TEXT,
  shipping_cost_cents INTEGER DEFAULT 0 CHECK (shipping_cost_cents >= 0),

  -- Estado do Selo Preço Verificado
  badge_status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'verified', 'expired', 'rejected'
  badge_verified_at TIMESTAMPTZ,
  badge_expires_at TIMESTAMPTZ,
  verified_by TEXT,

  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa', 'pausada', 'esgotada'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_badge_status CHECK (badge_status IN ('unverified', 'verified', 'expired', 'rejected')),
  CONSTRAINT chk_offer_status CHECK (status IN ('ativa', 'pausada', 'esgotada')),
  CONSTRAINT chk_payment_method CHECK (payment_method IN ('a_vista', 'parcelado')),

  -- Consistência lógica interna das datas de verificação
  CONSTRAINT chk_badge_consistency CHECK (
    (badge_status = 'verified'
      AND badge_verified_at IS NOT NULL
      AND badge_expires_at IS NOT NULL
      AND badge_expires_at = badge_verified_at + INTERVAL '24 hours')
    OR (badge_status IN ('unverified', 'expired', 'rejected'))
  )
);
```

### Tabela: `price_history` (Série Temporal de Coletas e Log Imutável)

Armazena o histórico cronológico de coletas brutas. Para assegurar total robustez sob concorrência e evitar falhas de inserção simultânea (`unique_violation`), a tabela armazena cada coleta válida como um evento temporal, enquanto a consolidação diária é realizada via agregação canônica no banco:

```sql
CREATE TABLE public.price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  payment_method TEXT NOT NULL DEFAULT 'a_vista',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'api_partner', 'verified_audit'
  is_anomalous BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT chk_history_payment_method CHECK (payment_method IN ('a_vista', 'parcelado')),
  CONSTRAINT chk_history_source_type CHECK (source_type IN ('manual', 'api_partner', 'verified_audit'))
);

-- Índice composto para consultas rápidas na janela de 30 dias
CREATE INDEX idx_price_history_query ON public.price_history (
  product_id, merchant_id, payment_method, captured_at
) WHERE is_anomalous = false;

-- Índice com cast expressamente IMMUTABLE para agregação diária por data UTC
CREATE INDEX idx_price_history_daily_trunc ON public.price_history (
  product_id, merchant_id, payment_method, ((captured_at AT TIME ZONE 'UTC')::date)
) WHERE is_anomalous = false;
```

> **Decisão sobre Concorrência e Deduplicação**:
> Em vez de impor uma restrição `UNIQUE` rígida na tabela de histórico bruto (o que provocaria erros 500 se dois jobs de verificação concorrentes coletassem preços no mesmo dia), a tabela `price_history` funciona como log de eventos. A consolidação diária (1 observação canônica por dia) é calculada deterministicamente selecionando o menor preço válido coletado naquelas 24h UTC via `DISTINCT ON (((captured_at AT TIME ZONE 'UTC')::date))`. Caso se utilize ingestão em lote com UPSERT, aplica-se `ON CONFLICT (...) DO UPDATE SET price_cents = LEAST(...)`.

### Tabela: `price_audit_logs` (Auditoria Imutável e Rastreabilidade)

Auditoria estritamente **append-only** para concessão, renovação ou revogação do selo.

```sql
CREATE TABLE public.price_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE RESTRICT: Impede expressamente que uma oferta seja deletada para expurgar seus logs
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('concessao', 'renovacao', 'revogacao', 'expiracao')),
  rule_applied TEXT NOT NULL, -- ex: 'mediana_30d_estrita', 'auditoria_manual_sku'
  rule_result TEXT NOT NULL CHECK (rule_result IN ('aprovado', 'reprovado')),
  evaluated_price_cents INTEGER NOT NULL,
  median_30d_cents INTEGER,
  discount_percent NUMERIC(5,2),

  -- Origem rastreável com autenticação forte
  origin TEXT NOT NULL CHECK (origin IN ('admin_aal2', 'signed_webhook', 'automated_collector')),
  origin_actor_id TEXT NOT NULL, -- UUID do admin AAL2 ou ID do webhook/worker autenticado

  -- Prova documental criptográfica imutável
  evidence_hash TEXT NOT NULL CHECK (evidence_hash ~* '^[a-f0-9]{64}$'), -- Hash SHA-256 do arquivo/payload
  evidence_byte_size INTEGER NOT NULL CHECK (evidence_byte_size > 0),
  evidence_content_type TEXT NOT NULL, -- 'application/json', 'image/webp', 'text/html'
  evidence_storage_path TEXT NOT NULL, -- caminho seguro no bucket privado WORM

  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now() -- Timestamp UTC de captura
);
```

### Imutabilidade Estrita no Banco (Trigger Append-Only)

Para impedir adulterações até mesmo por rotinas administrativas ou privilégios de serviço:

```sql
CREATE OR REPLACE FUNCTION public.tg_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'A tabela price_audit_logs é estritamente append-only. Operações de UPDATE ou DELETE são proibidas.';
END;
$$;

-- Fixa proprietário seguro no catálogo do PostgreSQL
ALTER FUNCTION public.tg_prevent_audit_log_mutation() OWNER TO postgres;

CREATE TRIGGER trg_protect_price_audit_logs
  BEFORE UPDATE OR DELETE ON public.price_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_prevent_audit_log_mutation();
```

### View Canônica Pública com `security_invoker` e Expiração Automática

Como o PostgreSQL não admite funções voláteis como `now()` em constraints estáticas de tabela, a expiração temporal automática em tempo real é garantida através da view pública consumida pela aplicação.

A opção `WITH (security_invoker = true)` (PostgreSQL 15+) é mandatória para garantir que as políticas RLS da tabela `offers` e `merchants` sejam avaliadas no contexto do usuário chamador, impedindo que a view atue como vetor de bypass de segurança:

```sql
CREATE VIEW public.active_offers_view
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.product_id,
  o.merchant_id,
  o.title,
  o.price_cents,
  o.original_price_cents,
  o.currency,
  o.payment_method,
  o.installment_count,
  o.installment_price_cents,
  o.coupon_code,
  o.shipping_cost_cents,
  -- Predicado em tempo real de expiração do selo
  CASE
    WHEN o.badge_status = 'verified' AND o.badge_expires_at > now() THEN true
    ELSE false
  END AS is_badge_verified,
  CASE
    WHEN o.badge_status = 'verified' AND o.badge_expires_at <= now() THEN 'expired'
    ELSE o.badge_status
  END AS effective_badge_status,
  o.badge_verified_at,
  o.badge_expires_at,
  o.status,
  o.created_at,
  o.updated_at
FROM public.offers o
WHERE o.status = 'ativa';
```

---

## 4. Regras do Selo "Preço Verificado" (A Metodologia Técnica)

O selo **Preço Verificado** obedece a critérios matemáticos e procedimentais estritos:

### Regra 1: Identidade Estrita de Variante e SKU

- O produto da oferta deve coincidir em **100% dos parâmetros de variante**:
  - Mesma capacidade de armazenamento e memória RAM (ex.: 512 GB / 16 GB).
  - Mesma geração de processador, GPU e tecnologia de tela.
  - Se houver `ean_upc` disponível no produto, a conferência com o código de barras anunciado é mandatória.
- _Falha_: Qualquer oferta com divergência de variante recebe `badge_status = 'rejected'`.

### Regra 2: Amostragem Mínima, Deduplicação e Origem Confiável

Para garantir que a mediana represente uma série temporal real e não coletas repetidas artificialmente:

1. **Deduplicação Diária UTC**: Somente **uma observação canônica por dia (24h UTC)** é elegível para o cálculo da série temporal por tríade `(product_id, merchant_id, payment_method)`. Múltiplas coletas no mesmo dia são consolidadas no menor preço válido daquele dia via ordenação determinística.
2. **Intervalo Mínimo de Amostragem**: Coletas consecutivas devem possuir espaçamento cronológico mínimo de 12 horas para serem consideradas observações estatisticamente independentes.
3. **Origem Confiável**: Apenas observações com `source_type IN ('verified_audit', 'api_partner')` compõem o cálculo automático da mediana. Coletas manuais sem auditoria (`manual`) são descartadas da base estatística.
4. **Base Mínima**: Exigência de no mínimo **5 dias distintos** com observações válidas na janela móvel de 30 dias:
   $$\text{count}(\text{DISTINCT } ((captured\_at \text{ AT TIME ZONE 'UTC'})::\text{date})) \ge 5$$
5. **Mesma Tríade Homogênea**: É expressamente vedada a mistura de lojistas diferentes ou métodos de pagamento divergentes (`a_vista` no Pix vs `parcelado` sem juros no cartão) para compor a mediana.

### Regra 3: Tratamento Matemático de Outliers e Filtro Anti-Anomalia

1. **Preço de Referência Histórica ($M\_{30}$)**:
   - A âncora de comparação para detecção de anomalias estatísticas é a mediana histórica dos 30 dias prévios ($M_{30}$) calculada deterministicamente via `public.calculate_offer_median(p_product_id, p_merchant_id, p_payment_method)`.
   - O cálculo de $M_{30}$ exige o piso de no mínimo 5 coletas diárias distintas em UTC na mesma tríade (`product_id`, `merchant_id`, `payment_method`), ignorando coletas com `is_anomalous = true` ou `source_type = 'manual'`.
   - Se a série contiver menos de 5 dias distintos consolidados, `calculate_offer_median` retorna `NULL`. Nesse caso, o filtro estatístico automático não atua (`is_anomalous = false`), e a concessão automática do selo permanece vedada (`badge_status = 'unverified'`). Concessões em produtos recentes exigem auditoria manual com operador AAL2 e evidência WORM (`evidence_hash`).

2. **Fórmula de Desvio Relativo e Limite de 50% ($\Delta\_{\text{rel}}$)**:
   - Para observações com $M_{30}$ disponível, a queda relativa é definida por:
     $$\Delta_{\text{rel}} = \frac{M_{30} - \text{price\_cents}}{M_{30}}$$
   - **Critério de corte (estrito)**: A anomalia exige desvio relativo **estritamente superior a 50%**:
     $$\Delta_{\text{rel}} > 0.50 \iff \text{price\_cents} < \frac{M_{30}}{2}$$
   - **Em aritmética inteira de centavos**:
     $$\text{is\_anomalous} \iff (\text{price\_cents} \times 2) < M_{30}$$
   - **Fronteira exata de 50%**: Um desconto de exatamente 50% ($\text{price\_cents} \times 2 = M_{30}$) é **válido e lícito** (não é anômalo). O corte só dispara a partir de 50,01% ($\text{price\_cents} \times 2 < M_{30}$). Exemplo: para $M_{30} = 10000$ (R$ 100,00), o preço de R$ 50,00 (`5000`) é aceito; R$ 49,99 (`4999`) é marcado como anômalo.

3. **Salvaguarda de Itens de Baixo Valor ($M\_{30} < 5000$)**:
   - Para produtos cujo valor histórico de referência é inferior a R$ 50,00 ($M_{30} < 5000$ centavos), variações percentuais elevadas representam impacto financeiro reduzido e não devem gerar falsos positivos automáticos.
   - **Critério de corte duplo e cumulativo**: Nesses itens, a marcação de anomalia exige simultaneamente:
     $$\Delta_{\text{rel}} > 0.50 \quad \text{E} \quad \Delta_{\text{abs}} > 2500$$
     onde $\Delta_{\text{abs}} = M_{30} - \text{price\_cents}$.
   - **Fronteira exata de R$ 25,00**: Uma queda de até exatamente R$ 25,00 ($\Delta_{\text{abs}} \le 2500$ centavos) é **tolerada e protegida pela salvaguarda**. A anomalia só é declarada se a diferença em reais for **estritamente superior a R$ 25,00** ($> 2500$ centavos).
   - **Matriz de fronteira para itens de baixo valor ($M\_{30} = 4000$ / R$ 40,00)**:
     - Preço anunciado R$ 18,00 (`1800`): Queda de 55% ($> 50\%$), $\Delta_{\text{abs}} = 2200 \le 2500 \implies$ **NÃO anômalo** (protegido pela salvaguarda).
     - Preço anunciado R$ 15,00 (`1500`): Queda de 62,5% ($> 50\%$), $\Delta_{\text{abs}} = 2500 \le 2500 \implies$ **NÃO anômalo** (limite exato de R$ 25 tolerado).
     - Preço anunciado R$ 14,00 (`1400`): Queda de 65% ($> 50\%$), $\Delta_{\text{abs}} = 2600 > 2500 \implies$ **ANÔMALO** (ultrapassou desvio relativo e absoluto).

4. **Classificação Determinística na Ingestão**:
   - A classificação é executada de forma determinística antes da consolidação definitiva em `price_history`.
   - Observações marcadas como anômalas permanecem gravadas com `is_anomalous = true` para rastreabilidade forense, mas são imediatamente excluídas de `calculate_offer_median` pelos índices parciais e predicado `where is_anomalous = false`, impedindo contaminação da mediana histórica.

5. **Registro de Decisão e Auditoria**:
   - Quando um anúncio de oferta (`offers`) for avaliado para concessão ou renovação do selo e o preço anunciado for detectado como anômalo ou violar a mediana, a concessão é rejeitada (`rule_result = 'reprovado'`).
   - O evento deve ser registrado em `price_audit_logs` com:
     - `rule_applied = 'outlier_cut'`
     - `rule_result = 'reprovado'`
     - `evaluated_price_cents = price_cents`
     - `median_30d_cents = M_30`
     - `discount_percent = round((M_30 - price_cents) * 100.0 / M_30, 2)`
     - `notes = 'Rejeitado por anomalia estatística (>50% de desvio e >R$ 25 para baixo valor)'`

6. **Desconto Real Obrigatório**:
   - O preço anunciado deve ser **estritamente inferior à mediana histórica dos 30 dias**:
     $$\text{price\_cents} < \text{median}(\text{price\_cents}_{30\text{d}})$$

```sql
CREATE OR REPLACE FUNCTION public.calculate_offer_median(
  p_product_id UUID,
  p_merchant_id UUID,
  p_payment_method TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price_cents)::INTEGER
  FROM (
    SELECT DISTINCT ON (((captured_at AT TIME ZONE 'UTC')::date))
      price_cents
    FROM public.price_history
    WHERE product_id = p_product_id
      AND merchant_id = p_merchant_id
      AND payment_method = p_payment_method
      AND captured_at >= now() - INTERVAL '30 days'
      AND is_anomalous = false
      AND source_type IN ('verified_audit', 'api_partner')
    ORDER BY ((captured_at AT TIME ZONE 'UTC')::date), price_cents ASC
  ) daily_samples
  HAVING count(*) >= 5;
$$;

-- Fixa proprietário seguro e revoga execução pública
ALTER FUNCTION public.calculate_offer_median(UUID, UUID, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.calculate_offer_median(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_offer_median(UUID, UUID, TEXT) TO service_role;
```

### Regra 4: Tratamento de Frete e Cupons

- **Regra de Frete $\le 15\%$**:
  - **Base de cálculo**: O custo de frete (`shipping_cost_cents`) não pode ultrapassar 15% do valor líquido do produto anunciado (`price_cents`).
  - **Justificativa técnica**: No nicho de tecnologia do GradualInfo (ticket médio elevado), fretes desproporcionais caracterizam prática de "preço maquiado", onde o lojista simula desconto no item e recupera a margem cobrando tarifas abusivas no checkout.
  - **Exceções formais catalogadas**:
    1. Produtos de **grande porte ou peso volumoso comprovado** (gabinetes full-tower, monitores ultrawide $\ge 34"$, nobreaks $> 15\text{kg}$ ou cadeiras/móveis de setup).
    2. Regiões geográficas remotas com tabela tarifária oficial e uniforme do parceiro logístico.
    - Em qualquer exceção, a emissão do selo requer auditoria manual com justificativa catalogada e hash da prova em `price_audit_logs`.
- **Regra de Cupons**:
  - Somente cupons públicos e universais da loja (aplicáveis por qualquer usuário no checkout sem restrições) podem ser considerados no preço com desconto.
  - Cupons restritivos (ex.: "válido apenas para primeiro pedido em conta nova", "exclusivo para portadores do cartão da loja", ou vinculados a programas pagos de fidelidade) são expressamente vedados para o selo geral do site.

### Regra 5: Expiração Automática em Tempo Real

- Todo selo possui validade máxima de **24 horas** a partir da verificação:
  $$\text{badge\_expires\_at} = \text{badge\_verified\_at} + 24\text{h}$$
- A expiração é garantida em tempo de execução na consulta SQL via view `active_offers_view` (`badge_expires_at > now()`) e verificada no DTO da API Next.js. Mesmo que um processo assíncrono de atualização em lote esteja indisponível ou atrasado, nenhuma requisição do usuário ou leitor recebe o status de verificado se o timestamp atual for posterior a `badge_expires_at`.

### Regra 6: Falha Segura (Fail-Safe)

- Na ausência de dados suficientes, timeout na consulta ou inconsistência de informações, a oferta é apresentada sem o selo (`is_verified = false`). O leitor pode visualizar o preço informativo, mas o portal jamais exibe a insígnia de verificação ativa.

---

## 5. Políticas de Segurança, RLS e Funções Privilegiadas

Seguindo o princípio de menor privilégio e isolamento rigoroso entre dados públicos e operacionais:

### Revogações Explícitas de Privilégios Estruturais

A segurança não depende de convenções de aplicação. O catálogo de privilégios do PostgreSQL bloqueia estruturalmente acessos indevidos:

```sql
-- 1. Revoga todos os privilégios públicos na tabela de auditoria (privacidade absoluta em pg_class)
REVOKE ALL ON TABLE public.price_audit_logs FROM PUBLIC, anon, authenticated;

-- 2. Revoga qualquer capacidade de escrita nas tabelas comerciais por usuários de leitor
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.merchants, public.products, public.offers, public.price_history FROM PUBLIC, anon, authenticated;

-- 3. Concede estritamente SELECT para leitura pública nas tabelas de catálogo
GRANT SELECT ON TABLE public.merchants, public.products, public.offers, public.price_history TO anon, authenticated;
GRANT SELECT ON TABLE public.active_offers_view TO anon, authenticated;
```

### Configuração de Row Level Security (RLS)

```sql
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_audit_logs ENABLE ROW LEVEL SECURITY;

-- Força aplicação de RLS mesmo para tabelas em join
ALTER TABLE public.offers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.price_audit_logs FORCE ROW LEVEL SECURITY;

-- Leitura de lojistas: apenas ativos
CREATE POLICY "Leitura de lojistas ativos"
  ON public.merchants FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Leitura de produtos: catálogo público
CREATE POLICY "Leitura de catálogo de produtos"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Leitura de ofertas: apenas ofertas ativas
CREATE POLICY "Leitura pública de ofertas ativas"
  ON public.offers FOR SELECT
  TO anon, authenticated
  USING (status = 'ativa');

-- Leitura de histórico: dados expostos para gráficos
CREATE POLICY "Leitura pública de histórico de preços"
  ON public.price_history FOR SELECT
  TO anon, authenticated
  USING (is_anomalous = false);

-- Tabela price_audit_logs: ZERO policies de SELECT para anon e authenticated
-- Nenhuma requisição com chave anônima ou de usuário comum consegue ler registros de auditoria.

-- Escrita administrativa restrita à service_role (usada pelo backend autenticado com AAL2)
CREATE POLICY "Acesso total de serviço em merchants"
  ON public.merchants FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total de serviço em products"
  ON public.products FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total de serviço em offers"
  ON public.offers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total de serviço em price_history"
  ON public.price_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Inserção e leitura de serviço em price_audit_logs"
  ON public.price_audit_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
```

### Proteção de Evidências, Armazenamento WORM e Retenção Legal

1. **Quem pode inserir logs**: Exclusivamente o backend executando sob `service_role`, autorizado por sessões administrativas validadas com MFA AAL2 (`ADMIN_USER_ID`) ou webhooks de ingestão assinados com HMAC-SHA256.
2. **Armazenamento no Supabase Storage**:
   - Bucket privado `audit-evidence` com RLS estrito a `service_role`.
   - Propriedade pública desativada (`public = false`); URLs públicas diretas bloqueadas.
   - Padrão **WORM (Write Once, Read Many)**: arquivos nomeados pelo hash SHA-256 (`[evidence_hash].[ext]`), sem permissão de sobrescrita.
3. **Ciclo de Vida de Retenção e Ressalva Legal**:
   - **Hot Storage (730 dias / 2 anos)**: Mantido no Supabase Storage para consultas rápidas de conformidade no painel administrativo.
   - **Ressalva Formal de Suficiência Legal**: O prazo operacional de 730 dias **não presume satisfazer isoladamente todas as obrigações legais**. Em especial, para atender ao prazo prescricional de reparação civil por danos em relações de consumo (**5 anos / 1.825 dias**, Art. 27 do Código de Defesa do Consumidor - CDC) e aos prazos gerais do Código Civil (Art. 206), os dados são arquivados em **Cold Storage criptografado** após 730 dias até completarem 5 anos, garantindo salvaguarda probatória antes do expurgo definitivo em conformidade com a LGPD.
   - Backups diários com Point-in-Time Recovery (PITR) ativos no Supabase.
   - Chave estrangeira `ON DELETE RESTRICT` em `price_audit_logs.offer_id` impede deleções acidentais de ofertas que contenham histórico de auditoria.

### Blindagem de Funções `SECURITY DEFINER`

Para todas as funções privilegiadas no banco de dados:

1. **Proprietário**: Fixado exclusivamente em `postgres` via `ALTER FUNCTION ... OWNER TO postgres;`.
2. **Permissões de Execução**: `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated;` garantindo que apenas `service_role` execute cálculos e auditorias.
3. **Prevenção de Sequestro de Schema**: Cláusula mandatória `SET search_path = public, pg_temp;` em todas as funções.
4. **Ausência de SQL Dinâmico**: Consultas implementadas com queries estáticas parametrizadas, prevenindo injeções indiretas de SQL.

---

## 6. Contratos de API (Next.js App Router)

### `GET /api/ofertas`

Retorna a lista de ofertas ativas filtradas e paginadas, consultando `active_offers_view`.

- **Parâmetros**: `categoria`, `lojista`, `verificadas` (`true`/`false`), `limit` (padrão 20, máx 50), `cursor`.
- **Headers de Resposta**:
  - `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- **Schema JSON**:
  ```json
  {
    "data": [
      {
        "id": "c1f7b0e1-4829-4d6e-931b-26f58f4a1329",
        "product": {
          "slug": "notebook-dell-g15-5530",
          "title": "Dell G15 5530 (i7-13650HX, RTX 4050, 16GB, 512GB)",
          "category": "Notebooks"
        },
        "merchant": {
          "name": "Amazon Brasil",
          "slug": "amazon-br"
        },
        "price_cents": 549900,
        "original_price_cents": 629900,
        "payment_method": "a_vista",
        "installment_summary": "10x de R$ 599,90",
        "coupon_code": null,
        "badge": {
          "is_verified": true,
          "status": "verified",
          "verified_at": "2026-10-13T14:30:00Z",
          "expires_at": "2026-10-14T14:30:00Z",
          "discount_vs_median_percent": 12.7
        },
        "out_url": "https://gradualinfo.com.br/api/out/c1f7b0e1-4829-4d6e-931b-26f58f4a1329"
      }
    ],
    "next_cursor": null
  }
  ```

### `GET /api/ofertas/[slug]/historico`

Retorna a série temporal dos últimos 30/60/90 dias para plotagem de gráfico comparativo.

- **Parâmetros**: `periodo` (`30d`, `60d`, `90d`).
- **Comportamento**: Retorna apenas registros com `is_anomalous = false`. Agrupa pela menor oferta diária registrada por lojista. Não expõe nomes de auditores, hashes nem dados internos.

### `GET /api/out/[id]` (Redirecionamento Seguro e Auditado)

Endpoint que gerencia o clique de afiliação e encaminha o leitor ao lojista com validação rigorosa de fronteira de hostname.

#### Requisitos Estritos de Segurança e Implementação

1. **Validação de Rota e Identidade (Zero Query Params)**:
   - O parâmetro `[id]` é estritamente validado como UUIDv4 (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`).
   - A rota descarta qualquer query param externo (ex.: `?url=...`, `?dest=...`), prevenindo vulnerabilidades de Open Redirect.

2. **Consulta Segura ao Banco de Dados**:
   - A rota executa query parametrizada direta contra o banco:
     ```sql
     SELECT o.affiliate_url, o.status, m.domain, m.is_active
     FROM public.offers o
     JOIN public.merchants m ON o.merchant_id = m.id
     WHERE o.id = $1;
     ```

3. **Tratamento de Ofertas Inexistentes ou Esgotadas**:
   - Se a oferta não existir: responde **HTTP 404 Not Found**.
   - Se o lojista estiver inativo (`m.is_active = false`): responde **HTTP 410 Gone**.
   - Se a oferta estiver com `status = 'esgotada'` ou `status = 'pausada'`: responde **HTTP 410 Gone** com tela/mensagem institucional amigável explicando que a oferta expirou e fornecendo link para retornar à matéria no GradualInfo, **nunca efetuando redirecionamento para o e-commerce parceiro**.

4. **Validação Léxica Estrita de Fronteira de Hostname (Hostname Boundary Matching)**:
   A URL de destino é submetida a sanitização estrutural antes de qualquer despacho:

   ```typescript
   let parsedUrl: URL;
   try {
     parsedUrl = new URL(offer.affiliate_url);
   } catch {
     return new Response('URL de destino malformada', { status: 400 });
   }

   // 1. Validação estrita de protocolo
   if (parsedUrl.protocol !== 'https:') {
     return new Response('Protocolo inseguro', { status: 403 });
   }

   // 2. Bloqueio de credenciais embutidas (prevenção de user:pass@host)
   if (parsedUrl.username !== '' || parsedUrl.password !== '') {
     return new Response('Credenciais embutidas não autorizadas', {
       status: 403,
     });
   }

   // 3. Bloqueio de portas não padrão
   if (parsedUrl.port !== '' && parsedUrl.port !== '443') {
     return new Response('Porta de conexão não autorizada', { status: 403 });
   }

   // 4. Comparação estrita por fronteira de hostname (evita bypass de substring)
   const targetHost = parsedUrl.hostname.toLowerCase();
   const allowedDomain = merchant.domain.toLowerCase();

   const isExactDomain = targetHost === allowedDomain;
   const isSubdomain = targetHost.endsWith('.' + allowedDomain);

   if (!isExactDomain && !isSubdomain) {
     // Aborta imediatamente e loga incidente de segurança
     return new Response('Domínio de destino não autorizado pela allowlist', {
       status: 403,
     });
   }
   ```

5. **Headers de Resposta no Redirecionamento**:
   - Status: **HTTP 307 Temporary Redirect**.
   - Headers:
     - `Location: [affiliate_url]`
     - `X-Robots-Tag: noindex, nofollow`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Cache-Control: private, no-store, max-age=0`

---

## 7. Critérios de Aceite (ACs Atualizados)

- **ofertas/AC-01**: A tabela `offers` armazena preços estritamente em centavos inteiros (`price_cents > 0`) e bloqueia valores decimais ou negativos via constraint SQL.
- **ofertas/AC-02**: A tabela `price_audit_logs` possui revogação explícita (`REVOKE ALL`) para roles `anon` e `authenticated`, retornando erro `42501 permission denied` em qualquer tentativa de leitura ou escrita pública.
- **ofertas/AC-03**: A tabela `price_audit_logs` é estritamente append-only; qualquer tentativa de `UPDATE` ou `DELETE` dispara erro via trigger `trg_protect_price_audit_logs`, e sua integridade referencial com `offers` utiliza `ON DELETE RESTRICT`.
- **ofertas/AC-04**: O cálculo da mediana na função `calculate_offer_median` exige no mínimo 5 observações diárias distintas consolidadas nos últimos 30 dias na mesma tríade (`product_id`, `merchant_id`, `payment_method`), provenientes exclusivamente de fontes auditadas (`verified_audit`, `api_partner`).
- **ofertas/AC-05**: Registros de histórico marcados com `is_anomalous = true` ou com desvio relativo $> 50\%$ sem evidência documental são sumariamente excluídos do cálculo da mediana, com tolerância absoluta para itens com `price_cents < 5000`.
- **ofertas/AC-06**: A concessão do selo rejeita ofertas cujo frete (`shipping_cost_cents`) ultrapasse 15% do valor do produto (`price_cents`), exceto para itens catalogados de peso volumoso comprovado com evidência arquivada.
- **ofertas/AC-07**: A tabela `offers` impede estados inconsistentes de verificação via constraint `chk_badge_consistency`, garantindo que `badge_expires_at = badge_verified_at + INTERVAL '24 hours'`.
- **ofertas/AC-08**: A view pública `active_offers_view` possui a opção `WITH (security_invoker = true)` e calcula em tempo de execução `is_badge_verified = false` e status `expired` para qualquer oferta com `badge_expires_at <= now()`.
- **ofertas/AC-09**: As funções `SECURITY DEFINER` pertencem exclusivamente a `postgres`, possuem `REVOKE EXECUTE FROM PUBLIC` e fixam `SET search_path = public, pg_temp;`.
- **ofertas/AC-10**: A rota `GET /api/out/[id]` valida lexicalmente a URL de destino (protocolo HTTPS, ausência de credenciais embutidas, porta padrão e fronteira estrita de hostname contra `merchants.domain`), respondendo com `HTTP 307` e headers restritivos.
- **ofertas/AC-11**: A rota `GET /api/out/[id]` responde com `HTTP 410 Gone` para ofertas com `status = 'esgotada'` ou `status = 'pausada'`, sem efetuar redirecionamento cego para o e-commerce parceiro.
- **ofertas/AC-12**: Artigos do Sanity associados a produtos sem ofertas ativas renderizam normalmente, omitindo o bloco comercial sem gerar erro 500 ou quebra de layout (fail-safe total).

---

## 8. Plano de Validação e Verificação Técnica

| AC        | Como reproduzir (comando / passos)                                              | Resultado esperado                            | Arquivo de Teste Previsto                                       |
| :-------- | :------------------------------------------------------------------------------ | :-------------------------------------------- | :-------------------------------------------------------------- |
| **AC-01** | Teste pgTAP inserindo `price_cents = -50` ou `99.9`                             | Inserção rejeitada por constraint SQL         | `supabase/tests/database/offers_schema.test.sql`                |
| **AC-02** | Consulta com chave anônima em `price_audit_logs`                                | Erro `42501 permission denied` / 0 linhas     | `__tests__/integration/offers-rls.test.ts`                      |
| **AC-03** | Tentativa de `UPDATE` ou `DELETE` em `price_audit_logs`                         | Exceção disparada pela trigger append-only    | `supabase/tests/database/audit_immutability.test.sql`           |
| **AC-04** | Mediana calculada com coletas repetidas no mesmo dia ou `< 5` dias distintos    | Retorno `NULL` (amostragem insuficiente)      | `__tests__/unit/lib/offers/median-calculation.test.ts`          |
| **AC-05** | Mediana calculada com coletas normais + 1 com `is_anomalous = true`             | Mediana ignora o valor anômalo                | `__tests__/unit/lib/offers/median-calculation.test.ts`          |
| **AC-06** | Avaliação de oferta com frete de 20% sem exceção catalogada                     | Emissão do selo rejeitada (`rejected`)        | `__tests__/unit/lib/offers/shipping-validation.test.ts`         |
| **AC-07** | Inserção de `badge_status = 'verified'` com `badge_expires_at` inconsistente    | Inserção rejeitada por constraint             | `supabase/tests/database/offers_schema.test.sql`                |
| **AC-08** | Consulta à view `active_offers_view` com oferta expirada há 1s                  | `is_badge_verified = false`, status `expired` | `__tests__/unit/api/ofertas-expiration.test.ts`                 |
| **AC-09** | Tentativa de execução anônima de `calculate_offer_median`                       | Erro `permission denied for function`         | `supabase/tests/database/security_definer_permissions.test.sql` |
| **AC-10** | Requisição a `/api/out/[id]` com URL malformada, portas espúrias ou credenciais | Retorno HTTP 400 Bad Request / 403 Forbidden  | `__tests__/unit/api/affiliate-redirect-boundary.test.ts`        |
| **AC-11** | Requisição a `/api/out/[id]` para oferta com `status = 'esgotada'`              | HTTP 410 Gone com página institucional        | `__tests__/unit/api/affiliate-redirect.test.ts`                 |
| **AC-12** | Renderização de artigo do Sanity sem ofertas cadastradas                        | HTTP 200 íntegro sem bloco comercial          | Teste de integração Next.js / Playwright                        |

---

## 9. Registro de Dependências e Pendências de Fases Anteriores

- **Fase 01 (Fundação)**: Concluída e auditada (migrations, RLS base e autenticação admin AAL2).
- **Fase 02 (Editorial)**: Concluída em produção com deploy do Worker Cloudflare versão `1493ced0-eebf-4176-b376-1082ff8ba76b`, 7 rotas com HTTP 200 e isolamento de rascunhos.
- **Pendência Formal da Fase 02**: Permanece registrada a necessidade de teste empírico de rejeição de cópia de cookie pós-logout contra o `PreviewSessionDO` (`sanity/AC-05.6`), a ser executado em momento operacional oportuno sem bloquear a especificação da Fase 03.
- **Fase 03 (Ofertas)**: Esta especificação está aceita em nível arquitetural (`Accepted`). A preparação de migrations e testes ocorrerá em ambiente estritamente local; nenhuma alteração será executada em produção sem nova autorização formal do proprietário.

---

## 10. Decision Check

- [x] Expiração do selo garantida em tempo de execução via view SQL com `security_invoker = true` e predicado `badge_expires_at > now()`.
- [x] Mediana restrita a no mínimo 5 observações diárias distintas consolidadas para a mesma tríade (`product_id`, `merchant_id`, `payment_method`).
- [x] Filtro anti-anomalia (`is_anomalous`) e corte estatístico de desvios $> 50\%$ formalizados, com salvaguarda de valor absoluto para itens baratos.
- [x] Regra de frete de 15% tecnicamente justificada no contexto de tecnologia, com exceções de peso volumoso catalogadas.
- [x] Auditoria imutável via trigger `trg_protect_price_audit_logs`, bucket WORM com integridade de hash SHA-256 e `ON DELETE RESTRICT`.
- [x] Retenção documentada com ressalva legal: 730 dias hot storage + 5 anos cold storage para conformidade com Art. 27 do CDC.
- [x] RLS e funções `SECURITY DEFINER` blindadas: proprietário `postgres`, `REVOKE EXECUTE FROM PUBLIC`, `SET search_path = public, pg_temp;`.
- [x] Redirecionamento `/api/out/[id]` estritamente seguro: validação de protocolo HTTPS, bloqueio de credenciais embutidas/portas não padrão, boundary match de hostname e HTTP 410 para esgotadas.
- [x] Status formalmente aceito como **Accepted**, com migrations e deploys expressamente proibidos nesta etapa.
