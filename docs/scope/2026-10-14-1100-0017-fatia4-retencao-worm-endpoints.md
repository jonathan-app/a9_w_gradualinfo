# Escopo: Spec 0017 / Fatia 4 (Retencao Fisica WORM e Endpoints da Aplicacao)

**Data:** 2026-10-14 11:00  
**Spec base:** `docs/specs/2026-10-13-1710-0017-modulo-ofertas-historico-precos.md`  
**Adendos vinculados:** Fatia 2 (`docs/specs/2026-10-14-0510-0017-fatia2-elegibilidade-frete-adendo.md`) e Fatia 3 (`docs/specs/2026-10-14-0556-0017-fatia3-cupons-variantes-adendo.md`)  
**Status do escopo:** Concluido localmente em 2026-10-14, com verificacao aprovada em `docs/reviews/2026-10-14-1225-0017-fatia4-retencao-worm-verify.md`; a persistencia duravel remanescente esta desenhada na Spec 0021 (aceita formalmente pelo proprietario em 2026-10-16, apos o ajuste contratual) e segue na secao 7 do escopo `docs/scope/2026-10-14-2135-backend-auth-operacoes.md`  
**Modo operacional:** Estritamente local (banco Supabase local, testes unitarios e mock local de storage)  
**Restricoes absolutas:** Proibido deploy, proibido push ou merge, proibida qualquer alteracao na Cloudflare, proibido uso de credenciais de producao

---

## 1. Objetivo da Fatia 4

A Fatia 4 completa a cadeia de confianca comercial da Spec 0017. Ela conecta o pipeline transacional do selo (validado na Fatia 3) aos endpoints da aplicacao Next.js e ao armazenamento fisico de evidencias com garantia WORM (Write Once, Read Many).

O trabalho divide se em dois eixos complementares:

1. **Retencao fisica WORM por 730 dias (hot storage) e 5 anos (cold storage):**  
   Preservar as evidencias de precos, cupons, variantes e frete em armazenamento imutavel. A politica impede delecao, truncamento ou alteracao prematura, inclusive por administradores ou scripts do sistema, satisfazendo o modelo probatorio exigido pelo Codigo de Defesa do Consumidor (Artigo 27).

2. **Endpoints da aplicacao Next.js App Router:**  
   Expor rotas seguras para ingestao, avaliacao de ofertas, consulta de historico e redirecionamento de afiliados, aplicando autorizacao administrativa AAL2, assinaturas HMAC, validacao estrita de limites de entrada e idempotencia.

---

## 2. Limites do Escopo

| Incluido no planejamento da Fatia 4                     | Fora do escopo autorizado                                |
| :------------------------------------------------------ | :------------------------------------------------------- |
| Contrato de retencao e ciclo de vida de evidencias WORM | Deploy ou configuracao remota na Cloudflare              |
| Desenho dos endpoints da aplicacao em `app/api/`        | Gravacao em buckets de producao ou uso de segredos reais |
| Integracao da chamada RPC com o pipeline da Fatia 3     | Push, merge ou publicacao de branches no Git             |
| Testes locais de seguranca, integridade e falhas        | Alteracoes na Home Cambridge ou na Spec 0013             |
| Politica de idempotencia e consistencia fail closed     | Criacao de contas de visitantes ou checkout proprio      |

---

## 3. Resolucao das Cinco Decisoes Criticas de Escopo

### 3.1 Armazenamento WORM e Mecanismo Real de Imutabilidade

Gravar um arquivo em pasta comum e aplicar apenas uma convencao de nomeacao nao constitui WORM. O mecanismo de retencao precisa resistir a tentativas de mutacao vindas da propria aplicacao.

- **Politica local e contratual:**  
  O bucket privado `audit-evidence` sera gerido localmente via Supabase Storage / S3 API local. A imutabilidade sera garantida em duas camadas:
  1. No banco de dados: a tabela `storage.objects` e protegida por politicas RLS e triggers dedicados que negam `UPDATE`, `DELETE` e `TRUNCATE` para qualquer identidade no bucket `audit-evidence`.
  2. No contrato de aplicacao: o cliente de storage verifica a presenca do objeto via HEAD request. Se o objeto ja existir com o mesmo SHA-256, a escrita e ignorada como idempotente; se houver divergencia de conteudo para a mesma chave, a operacao e sumariamente rejeitada com erro de conflito.
- **Inicio da contagem dos 730 dias:**  
  O marco temporal e o timestamp UTC de criacao registrado no log de auditoria (`checked_at`).
- **Regime de retencao em camadas:**
  - **Hot storage (730 dias / 2 anos):** bucket `audit-evidence` com consulta imediata pelo painel administrativo para fiscalizacao e auditoria.
  - **Cold storage (5 anos / 1.825 dias):** exportacao criptografada para arquivo historico conforme o Artigo 27 do CDC, com expurgo regulamentado por politica de ciclo de vida apos cinco anos.

### 3.2 Modelo da Evidencia e Payload Canonico

Cada decisao do selo gera um artefato de evidencia estruturado em formato JSON canonico:

- **Chave e nome do arquivo:** `[evidence_hash].json`, onde `evidence_hash` e o resumo criptografico SHA-256 gerado a partir dos bytes canonicos do payload (chaves ordenadas lexicograficamente, sem espacos em branco superfluos).
- **Campos mandatorios do payload:**
  1. `schema_version`: versao do formato da evidencia (exemplo: `"1.0"`).
  2. `captured_at`: timestamp ISO 8601 UTC da observacao original.
  3. `offer`: identificadores unicos (`offer_id`, `product_id`, `merchant_id`, `merchant_domain`, `url_anunciada`).
  4. `product_identity`: dados auditados de produto (`sku`, `ean`, `specs_json`).
  5. `commercial_terms`: precos em centavos (`price_cents`, `original_price_cents`), forma de pagamento (`payment_method`, parcelas), frete declarado (`shipping_cost_cents`, `region_code`) e dados do cupom testado (`coupon_code`, tipo, percentual ou valor fixo).
  6. `collector`: metadados da coleta (`origin`: `"admin_aal2"` ou `"signed_webhook"`, `actor_id`, `collector_version`).
  7. `raw_proof`: corpo bruto ou extrato relevante da resposta do parceiro ou seletor de preco.

### 3.3 Especificacao dos Endpoints da Aplicacao

Os endpoints serao implementados em Next.js App Router (rotas TypeScript nativas):

1. **`POST /api/admin/ofertas/[id]/avaliar-selo`**
   - **Finalidade:** Rota administrativa e de coletores para submeter evidencias e disparar a avaliacao transacional do selo.
   - **Autenticacao e Autorizacao:** Sessao administrativa com MFA AAL2 (`ADMIN_USER_ID`) ou header de webhook assinado com HMAC-SHA256 (`x-gradualinfo-signature`).
   - **Validacao de entrada:** Validacao estrita de esquema JSON (UUID de oferta, centavos inteiros positivos, SKU obrigatorio, hash SHA-256 com 64 caracteres hexadecimais).
   - **Idempotencia:** Header obrigatorio `Idempotency-Key` ou deducao pelo par `(offer_id, evidence_hash)`. Se submetida mais de uma vez dentro do periodo de vigencia, retorna a decisao existente sem reinserir logs.
   - **Resposta:** HTTP 200 com status da concessao (`verified`, `rejected` ou `unverified`), preco efetivo auditado, mediana utilizada e identificador do log de auditoria.

2. **`GET /api/admin/ofertas/[id]/evidencias` e `GET /api/admin/evidencias/[hash]`**
   - **Finalidade:** Consulta de auditoria para exibir o historico probatorio de uma oferta.
   - **Autenticacao:** Exclusiva para administradores autenticados com AAL2.
   - **Resposta:** Metadados da auditoria e link assinado de leitura temporaria com validade restrita (maximo de 15 minutos).

3. **`GET /api/ofertas` e `GET /api/ofertas/[slug]/historico`**
   - **Finalidade:** Consulta publica para componentes do frontend e leitores do portal.
   - **Autenticacao:** Publica (anon). Leitura estritamente via `active_offers_view` e `price_history` com predicado `is_anomalous = false`.
   - **Cache:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

4. **`GET /api/out/[id]`**
   - **Finalidade:** Despacho seguro de afiliados conforme a Secao 6 da Spec 0017.
   - **Comportamento:** Validacao estrita de UUIDv4, rejeicao de query params externos, consulta direta parametrizada no banco, verificacao de fronteira de hostname contra `merchants.domain`, HTTP 410 para ofertas pausadas ou esgotadas, e HTTP 307 com cabeçalhos restritivos para ofertas validas.

### 3.4 Tratamento de Falhas e Consistencia (Modelo Fail Closed)

A integracao entre storage e banco segue a regra fundamental de que nenhuma oferta recebe o selo verificado se a sua evidencia nao estiver comprovadamente persistida no bucket WORM.

- **Ordem de execucao obrigatoria:**
  1. A aplicacao recebe o payload da evidencia, valida a estrutura e calcula o resumo SHA-256.
  2. A aplicacao envia o arquivo para o storage privado WORM com o nome `[evidence_hash].json`. Se o storage falhar ou estiver indisponivel, a requisicao aborta imediatamente com HTTP 503 e o banco nao e alterado.
  3. Com a presenca fisica da evidencia confirmada no storage, a aplicacao executa a funcao SQL `public.evaluate_and_set_verified_price` via cliente Supabase de servico (`service_role`).
  4. Se a funcao SQL aprovar o selo, a transacao do banco atualiza a oferta para `verified` e grava o log de auditoria associado.
  5. Se a funcao SQL rejeitar (por frete, mediana ou cupom), o log de reprovacao e registrado no banco e a oferta fica como `rejected` ou `unverified`. O arquivo no storage permanece intacto (principio WORM de nunca apagar evidencias).
  6. Se a transacao do banco falhar ou sofrer timeout, a transacao SQL e revertida pelo banco. O arquivo permanece gravado no storage como orfao seguro, podendo ser reaproveitado em nova tentativa idempotente. Jamais ocorrera o inverso (selo ativo no banco sem arquivo no storage).

### 3.5 Provas de Aceite e Matriz de Testes Locais

A comprovacao da Fatia 4 sera executada integralmente no ambiente local:

1. **Testes de Imutabilidade no Storage (pgTAP / Integracao):**
   - Tentativa de `UPDATE` ou `DELETE` em arquivos do bucket `audit-evidence` deve retornar erro de permissao negada.
   - Tentativa de gravar arquivo com nome existente e conteudo diferente deve retornar conflito.
2. **Testes de Endpoint e Autorizacao (Vitest):**
   - Requisicao anonima em rotas administrativas retorna HTTP 401 ou 403.
   - Requisicao com sessao administrativa sem segundo fator (AAL1) retorna HTTP 403.
   - Webhook com assinatura HMAC invalida ou expirada retorna HTTP 401.
3. **Testes de Idempotencia e Deteccao de Duplicatas (Vitest):**
   - Duas chamadas consecutivas com a mesma `Idempotency-Key` ou mesma evidencia geram exatamente um unico log de auditoria no banco e retornam resposta identica.
4. **Testes de Falha e Resiliencia (Vitest / Mock Storage):**
   - Simulacao de timeout ou erro 500 no storage: a avaliacao e interrompida e o selo nao e concedido.
   - Simulacao de URL maliciosa em `/api/out/[id]` (tentativas de open redirect, bypass de subdominio, credenciais na URL): todas bloqueadas com HTTP 400 ou 403.

---

## 4. Criterios de Aceite da Fatia 4

- **fatia4/AC-01:** O bucket privado `audit-evidence` rejeita qualquer tentativa de sobrescrita, alteracao ou exclusao de arquivos, garantindo politica WORM.
- **fatia4/AC-02:** A persistencia da evidencia no storage ocorre antes da confirmacao do selo no banco, mantendo consistencia fail closed sob falhas de rede.
- **fatia4/AC-03:** A rota `POST /api/admin/ofertas/[id]/avaliar-selo` valida a identidade de SKU/variante, calcula a mediana, avalia cupom e frete via RPC da Fatia 3, e responde com o status da concessao.
- **fatia4/AC-04:** A rota de avaliacao exige sessao administrativa com MFA AAL2 ou webhook assinado com HMAC-SHA256, rejeitando qualquer acesso anonimo.
- **fatia4/AC-05:** A rota de avaliacao e idempotente: requisicoes repetidas com a mesma chave ou mesmo hash de evidencia nao duplicam logs nem alteram datas indevidamente.
- **fatia4/AC-06:** A rota `GET /api/admin/evidencias/[hash]` fornece metadados e URL temporaria de leitura com expiracao maxima de 15 minutos, exclusiva para administradores.
- **fatia4/AC-07:** A rota publica `GET /api/out/[id]` valida lexicalmente a URL de destino contra o dominio do lojista, bloqueia portas e credenciais estranhas, e responde com HTTP 410 para ofertas esgotadas.
- **fatia4/AC-08:** A rota publica `GET /api/ofertas` entrega apenas ofertas ativas com calculo dinamico de expiracao do selo via `active_offers_view`.
- **fatia4/AC-09:** O ciclo de vida de retencao de 730 dias hot storage e ressalva de 5 anos cold storage esta documentado e coberto por testes locais de integridade temporal.
- **fatia4/AC-10:** A suite completa de testes locais (pgTAP no Supabase local e Vitest na aplicacao) executa com codigo de saida zero, sem tocar em servicos de producao.

---

## 5. Dependencias e Riscos Operacionais

- **Dependencia da Fatia 3:** Os contratos de SKU/variante (`products.specs_json`), cupom universal (`offer_coupon_catalog`) e a funcao `evaluate_and_set_verified_price` consolidados na Fatia 3 sao os alicerces diretos da Fatia 4.
- **Risco de Falsa Imutabilidade:** Um bucket configurado sem Object Lock ou sem triggers restritivos no banco permite que chaves de servico apaguem evidencias. O escopo exige prova de rejeicao a exclusao.
- **Risco de Open Redirect:** A rota `/api/out/[id]` deve manter validacao estrita por fronteira de hostname (evitando que `atacante-amazon.com.br` seja aceito por conter `amazon.com.br`).
- **Preservacao de Escopos:** Nenhuma alteracao na camada editorial (Spec 0013 / Home Cambridge) ou na infraestrutura da Cloudflare deve ocorrer nesta frente.

---

## 6. Painel de Decisoes para o Proprietario

Antes de avancar para a especificacao tecnica detalhada em `/architect`, o proprietario deve deliberar sobre as seguintes opcoes:

### Decisao 1: Mecanismo Fisico do Armazenamento WORM em Producao

- **Opcao A (Recomendada):** Supabase Storage com bucket privado `audit-evidence` e triggers dedicados de imutabilidade em `storage.objects` impedindo DELETE/UPDATE, complementado por backup criptografado diario. Mantem a stack unificada no Supabase sem adicionar novos provedores na fase atual.
- **Opcao B:** Cloudflare R2 com politica nativa de Object Lock em modo Compliance ativada no bucket. Adiciona binding de R2 no Worker, oferecendo imutabilidade nativa em nivel de storage de objetos.

### Decisao 2: Formato da Prova Bruta da Evidencia (`raw_proof`)

- **Opcao A (Recomendada):** Payload JSON estruturado contendo a resposta integra da API do lojista ou extrato textual assinado dos seletores de preco e frete, acompanhado do hash SHA-256. Economiza espaco e permite comparacao programatica deterministica.
- **Opcao B:** Arquivo HTML bruto integral da pagina de oferta somado a screenshot rasterizada em PNG/WebP. Oferece prova visual completa, porem consome significativamente mais largura de banda e armazenamento.

---

## 7. Proxima Etapa do Fluxo

Apos a validacao deste escopo pelo proprietario:

1. Executar `/architect` para produzir a especificacao formal dos contratos e migrations da Fatia 4.
2. Executar `/develop` estritamente no ambiente local com testes unitarios e pgTAP.
3. Submeter a verificacao `/check verify` e revisao `/check review` antes de qualquer consolidacao.
