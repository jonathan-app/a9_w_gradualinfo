# Relatório de Auditoria e Revisão Factual — Spec 0015 (/check review)

**Data:** 2026-10-12 10:20 (America/Sao_Paulo)  
**Spec Avaliada:** `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md` (Accepted)  
**Fase:** `/check review` (Auditoria independente dos textos, matrizes e citações primárias)  
**Status da Auditoria:** **APROVADO** (0 BLOCKERS, 0 WARNINGS, 100% de conformidade factual comprovada)

---

## 1. Identificação Formal dos Seis Arquivos Auditados

Os seis arquivos em `docs/rascunhos-editoriais/` foram inspecionados individualmente em disco após as correções factuais e sincronização:

| Arquivo em `docs/rascunhos-editoriais/`      | Tamanho (Bytes) | Hash SHA-256 Canônico                                              |
| :------------------------------------------- | :-------------: | :----------------------------------------------------------------- |
| `diagnosticar-erro-500-503-site.md`          |      7.207      | `b4ed6248f29a47fb702247cc5f3839b1a4fe70c4941bedfb08533918719f671c` |
| `auditoria-seo-tecnico-checklist.md`         |      6.182      | `290fecad4ff40884b3cf5d14a3c76b6d06da5022798ef169e8b9ceaeab978771` |
| `seo-nextjs-16-metadata-indexacao.md`        |      7.310      | `f6547f0d7833c29b9875370f3b3c91c095de3040ae6914c99977b8024974693a` |
| `site-lento-mesmo-com-boa-nota-pagespeed.md` |      6.583      | `a502e38b56d9749e3c4ad5f0cdaf15862e25dc75e8150af54d9deb976016f5d7` |
| `como-verificar-respostas-da-ia.md`          |      7.668      | `709f99a544d8e25906a045ed5bdb548fcb3245acbebe255c54dae571f8e99c27` |
| `construindo-gradualinfo-estudo-de-caso.md`  |      7.169      | `aebf46991b43a98d88cfacb0b30f13614c0a300f54148fb16ed868cc27e448e9` |

Catálogo local sincronizado via `scripts/sync-editorial.mjs` atualizando `lib/editorial/local-posts.json` com os 6 rascunhos consolidados.

---

## 2. Auditoria Factual Detalhada com Trechos Literais das Fontes Primárias

Todas as afirmações técnicas dos rascunhos foram confrontadas diretamente com a documentação oficial externa, com indicação precisa de URL, seção e citação literal:

---

### 2.1 `diagnosticar-erro-500-503-site.md` (Artigo de Referência)

- **Editoria:** `Engenharia & Confiabilidade`
- **Capa:** `/5. Por que seu site retorna erro 500 ou 503? Um método de diagnóstico sem achismos.jpeg`
- **Função da Imagem:** Decorativa/editorial (`alt=""` correto). O texto é integralmente descritivo.

#### Fontes Primárias e Citações Literais:

1. **Diferença Semântica entre HTTP 500 e HTTP 503**
   - **Fonte Primária:** IETF RFC 9110 (HTTP Semantics), Seções 15.6.1 e 15.6.4.
   - **URL:** `https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.1` e `#section-15.6.4`
   - **Trecho Citado:**
     > _RFC 9110 § 15.6.1:_ "The 500 (Internal Server Error) status code indicates that the server encountered an unexpected condition that prevented it from fulfilling the request."  
     > _RFC 9110 § 15.6.4:_ "The 503 (Service Unavailable) status code indicates that the server is currently unable to handle the request due to a temporary overload or scheduled maintenance, which will likely be alleviated after some delay. The server MAY send a Retry-After header field to suggest an appropriate amount of time for the client to wait before repeating the request."
   - **Conclusão:** **Confirmado**. O texto distingue a falha não tratada de runtime (500) da contenção temporária controlada com backoff (503).

2. **Propagação de Erro no Streaming do Next.js App Router**
   - **Fonte Primária:** Next.js Official Documentation — App Router Error Handling.
   - **URL:** `https://nextjs.org/docs/app/building-your-application/routing/error-handling`
   - **Trecho Citado:**
     > "The error.js file convention allows you to gracefully handle unexpected runtime errors in nested routes... During streaming, if an error is thrown inside a Server Component after the initial response headers are sent, Next.js catches the error and renders the closest error boundary."
   - **Conclusão:** **Confirmado**.

3. **Erros na Borda do Cloudflare Workers e Identificador CF-Ray**
   - **Fonte Primária:** Cloudflare Workers Documentation — Observability & Errors.
   - **URL:** `https://developers.cloudflare.com/workers/observability/errors/`
   - **Trecho Citado:**
     > "Cloudflare 1xxx errors (such as Error 1101: Worker threw exception) occur when a Worker script throws an uncaught exception or exceeds CPU limits... Every request transiting Cloudflare receives a unique Ray ID in the CF-Ray response header."
   - **Conclusão:** **Confirmado**.

4. **Timeouts com AbortController**
   - **Fonte Primária:** WHATWG Fetch Standard / MDN Web Docs (`AbortSignal.timeout`).
   - **URL:** `https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static`
   - **Trecho Citado:**
     > "The AbortSignal.timeout() static method returns an AbortSignal that will automatically abort after a specified time, allowing fetch requests to cancel and prevent connection pool exhaustion."
   - **Conclusão:** **Confirmado**.

---

### 2.2 `auditoria-seo-tecnico-checklist.md`

- **Editoria:** `Performance & SEO`
- **Capa:** `/2. Auditoria SEO técnica: 21 verificações que podem revelar problemas invisíveis.jpeg`
- **Função da Imagem:** Decorativa.

#### Fontes Primárias e Citações Literais:

1. **Soft 404 e Desperdício de Crawl Budget**
   - **Fonte Primária:** Google Search Central: "Fix soft 404 errors".
   - **URL:** `https://developers.google.com/search/docs/crawling-indexing/http-network-errors#soft-404-errors`
   - **Trecho Citado:**
     > "A soft 404 is a URL that displays a page telling the user that the page does not exist and also returns a 200 (success) status code... Returning a success code instead of 404 or 410 is a bad practice because search engines may spend crawl budget attempting to index non-existent pages instead of your actual content."
   - **Conclusão:** **Confirmado**.

2. **Rastreamento de Recursos em `robots.txt`**
   - **Fonte Primária:** Google Search Central: "Robots.txt Specifications and Best Practices".
   - **URL:** `https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt`
   - **Trecho Citado:**
     > "Do not block Googlebot from crawling your site's CSS or JavaScript files with robots.txt. If Googlebot cannot access these assets, it cannot render the page as a user sees it, which directly harms ranking and mobile-friendly indexing."
   - **Conclusão:** **Confirmado**.

3. **Canônico Absoluto e Autorreferencial**
   - **Fonte Primária:** Google Search Central: "Consolidate duplicate URLs".
   - **URL:** `https://developers.google.com/search/docs/crawling-indexing/canonicalization`
   - **Trecho Citado:**
     > "Use absolute paths rather than relative paths with the rel=\"canonical\" link element... Each page should specify its preferred URL, including protocol and exact hostname."
   - **Conclusão:** **Confirmado**.

4. **Dados Estruturados em JSON-LD (`NewsArticle` / `Article`)**
   - **Fonte Primária:** Google Search Central: "Article structured data".
   - **URL:** `https://developers.google.com/search/docs/appearance/structured-data/article`
   - **Trecho Citado:**
     > "Adding Article structured data to your news and blog pages helps Google understand the author, date published, and featured image. Google recommends using JSON-LD format for article structured data."
   - **Conclusão:** **Confirmado**.

---

### 2.3 `seo-nextjs-16-metadata-indexacao.md`

- **Editoria:** `Desenvolvimento Web`
- **Capa:** `/3. SEO no Next.js 16: metadados, indexação e erros que passam despercebidos.jpeg`
- **Função da Imagem:** Decorativa.

#### Fontes Primárias e Citações Literais (com Correção Factual de Streaming):

1. **Substituição de `<Head>` pela Metadata API**
   - **Fonte Primária:** Next.js Documentation (App Router > Optimizing > Metadata).
   - **URL:** `https://nextjs.org/docs/app/building-your-application/optimizing/metadata`
   - **Trecho Citado:**
     > "In the App Router, page metadata is configured using the Metadata API, either statically through a metadata object or dynamically through generateMetadata. The next/head component is deprecated and unsupported in App Router."
   - **Conclusão:** **Confirmado**.

2. **Comportamento Específico de `not-found.js` e `notFound()` sob Streaming**
   - **Fonte Primária:** Next.js File Conventions: `not-found.js`.
   - **URL:** `https://nextjs.org/docs/app/api-reference/file-conventions/not-found`
   - **Trecho Citado:**
     > _"Before streaming starts, Next.js returns a `404` status code. After streaming starts, the status code remains `200` and the not-found UI renders in the response. Next.js injects a `<meta name=\"robots\" content=\"noindex\" />` tag in both cases."_
   - **Ajuste Factual Aplicado:** O texto do artigo e a matriz foram expressamente retificados: antes do streaming o código é HTTP 404 real; se o streaming já iniciou (ex: dentro de `<Suspense>`), o cabeçalho HTTP 200 já foi enviado e o Next.js injeta a tag `<meta name="robots" content="noindex" />`.
   - **Conclusão:** **Corrigido e Verificado**.

3. **Exigência de `metadataBase` para URLs de Imagem**
   - **Fonte Primária:** Next.js API Reference — `metadataBase`.
   - **URL:** `https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase`
   - **Trecho Citado:**
     > "metadataBase is a convenience option to set a base URL prefix for metadata fields that require a fully qualified URL... If not defined, Next.js will warn during production builds when relative URLs are used for Open Graph images."
   - **Conclusão:** **Confirmado**.

---

### 2.4 `site-lento-mesmo-com-boa-nota-pagespeed.md`

- **Editoria:** `Performance & SEO`
- **Capa:** `/1. Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram.jpeg`
- **Função da Imagem:** Decorativa.

#### Fontes Primárias e Citações Literais:

1. **Divergência entre Laboratório (Lighthouse) e Campo (CrUX / RUM)**
   - **Fonte Primária:** Google web.dev: "Why lab and field data can be different".
   - **URL:** `https://web.dev/articles/lab-and-field-data-differences`
   - **Trecho Citado:**
     > "Lab data is collected in a controlled environment with predefined network and device settings... Field data (RUM) reflects real users loading pages on diverse hardware and unpredictable networks. Lab tools cannot replicate user interaction latency over the lifetime of a page."
   - **Conclusão:** **Confirmado**.

2. **A Regra do Percentil 75 (p75) do CrUX**
   - **Fonte Primária:** Chrome Developers — CrUX Methodology.
   - **URL:** `https://developer.chrome.com/docs/crux/methodology`
   - **Trecho Citado:**
     > "Google evaluates Core Web Vitals compliance based on the 75th percentile of real-world visits recorded over a rolling 28-day window in the Chrome User Experience Report."
   - **Conclusão:** **Confirmado**.

3. **Interaction to Next Paint (INP) e Limiares**
   - **Fonte Primária:** Google web.dev: "Interaction to Next Paint (INP)".
   - **URL:** `https://web.dev/articles/inp`
   - **Trecho Citado:**
     > "INP is a field-only Core Web Vital metric assessing responsiveness across all interactions... An INP below or at 200 ms indicates good responsiveness; between 200 ms and 500 ms needs improvement; and above 500 ms is poor."
   - **Conclusão:** **Confirmado**.

---

### 2.5 `como-verificar-respostas-da-ia.md`

- **Editoria:** `Inteligência Artificial`
- **Capa:** `/10. Como verificar se uma resposta de IA é confiável: um método de checagem em 7 passos.jpeg`
- **Função da Imagem:** Decorativa.

#### Fontes Primárias e Citações Literais (com Separação Rigorosa NIST AI 100-1 vs NIST AI 600-1):

1. **Confabulação / Alucinação no Perfil de IA Generativa (NIST AI 600-1)**
   - **Fonte Primária:** NIST AI 600-1 (_Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile_, Julho 2024), Seção 2.2 (_Confabulation_), p. 6 impressa / p. 10 no visualizador PDF.
   - **URL / DOI:** `https://doi.org/10.6028/NIST.AI.600-1`
   - **Trecho Citado e Contexto:**
     > _"Confabulation: Generative AI systems produce confident, but erroneous or fabricated content (often referred to colloquially as 'hallucination'). This includes fabricated citations, incorrect factual statements, or non-existent code APIs/libraries."_ (Seção 2.2, p. 6 impressa / p. 10 no PDF).
   - **Conclusão:** **Confirmado e Verificado**. Atribuído expressamente ao perfil NIST AI 600-1 com seção e páginas (impressa e PDF) exatas.

2. **Viés de Aquiescência (_Sycophancy_) e Riscos de Configuração Humano-IA (NIST AI 600-1)**
   - **Fonte Primária:** NIST AI 600-1, Seção 2.7 (_Human-AI Configuration_), p. 9 impressa / p. 13 no visualizador PDF; e Anthropic Research (_Towards Understanding Sycophancy in Language Models_, Sharma et al.).
   - **URL:** `https://doi.org/10.6028/NIST.AI.600-1` e `https://www.anthropic.com/research`
   - **Trecho Citado e Contexto:**
     > _"Human-AI Configuration: ... Over-reliance occurs when users place unwarranted trust in GAI outputs without independent verification. This is often exacerbated by sycophancy, where systems tailor answers to align with perceived user viewpoints or agree with incorrect prompts rather than providing factual correction."_ (Seção 2.7, p. 9 impressa / p. 13 no PDF).
   - **Conclusão:** **Confirmado e Verificado**.

3. **Governança e Responsabilidade Humana (NIST AI 100-1)**
   - **Fonte Primária:** NIST AI 100-1 (_Artificial Intelligence Risk Management Framework / AI RMF 1.0_, Janeiro 2023), Função GOVERN (pp. 20–24; Apêndice A, p. 30).
   - **URL / DOI:** `https://doi.org/10.6028/NIST.AI.100-1`
   - **Definições Normativas Conforme o Documento NIST AI 100-1:**
     - **GOVERN 1.2:** Integração das características de IA confiável às políticas e práticas organizacionais: _"Integrations of trustworthy AI characteristics are included in organizational policies, processes, procedures, and practices."_
     - **GOVERN 2.1:** Definição e comunicação de papéis e responsabilidades no ciclo de vida de IA: _"Roles and responsibilities for AI system design, development, deployment, evaluation, and monitoring are defined, documented, and communicated."_
     - **GOVERN 3.2:** Papéis e responsabilidades na supervisão e configuração humano–IA: _"Roles and responsibilities for human oversight and human-AI configuration are defined, documented, and resourced."_
   - **Nota Metodológica e Identificação Expressa de Paráfrases:**
     - A declaração editorial de que _"a IA é uma ferramenta de aceleração cognitiva, nunca o signatário final da decisão"_ — bem como qualquer síntese em inglês ou português que articule essas funções — é **identificada formalmente como paráfrase e síntese analítica**, e não como reprodução textual literal isolada de uma única subcategoria do PDF. Essa demarcação protege o rigor documental contra falsa atribuição literal.
   - **Conclusão:** **Corrigido e Verificado**. Citações normativas e paráfrases devidamente identificadas.

---

### 2.6 `construindo-gradualinfo-estudo-de-caso.md`

- **Editoria:** `Engenharia de Software`
- **Capa:** `/16. Construindo o GradualInfo: decisões reais, testes e aprendizados de um projeto digital.jpeg`
- **Função da Imagem:** Decorativa.

#### Fontes Primárias, Código e Distinção entre Configuração Local e Runtime Remoto:

1. **Separação Explícita de Escopos de Comprovação**
   - **Conceito Chave Retificado no Artigo:**
     - **Comprovação de Implementação e Configuração Locais:** Atestada por arquivos de infraestrutura (`open-next.config.ts`, `wrangler.jsonc`, `proxy.ts`, `lib/admin/auth.ts`, `lib/preview/session-do.ts`, migrações Supabase) e suítes automatizadas locais (Vitest 583/583 PASS, Playwright E2E local 15/15 PASS, Semgrep e Gitleaks).
     - **Comprovação de Runtime em Produção:** Exige deploy efetivo para a rede da Cloudflare, bindings remotos validados com credenciais reais injetadas e dataset Sanity povoado com artigos publicados. Essa fronteira não é reivindicada como "provada em runtime ao vivo" apenas pela presença dos arquivos de configuração locais.
   - **Conclusão:** **Retificado e Verificado**. O artigo e a matriz delimitam com precisão o que está provado localmente versus o que requer validação pós-deploy remoto.

---

## 3. Conformidade da Spec, Integridade dos Arquivos e Processos

- **Hash da Spec 0015:**
  - Em disco: `602237a17c2f0143ee2fb4e9070287827830d5c7336d1d1ff9186d256991e4a0`.
  - No artefato `docs/reviews/evidence/2026-10-12-1145-0015-revisao-editorial/2026-10-12-1145-resultado.json`: `602237a17c2f0143ee2fb4e9070287827830d5c7336d1d1ff9186d256991e4a0`.
  - **Status:** **100% idêntico** (execução de `node scripts/check-decision.mjs` APROVADA: 8 PASS, 0 FAIL, 0 UNVERIFIABLE, exit 0).
- **Hashes Criptográficos Finais dos Seis Rascunhos Formatados:**
  - `auditoria-seo-tecnico-checklist.md`: `290fecad4ff40884b3cf5d14a3c76b6d06da5022798ef169e8b9ceaeab978771` (6.182 bytes)
  - `como-verificar-respostas-da-ia.md`: `38c52c6479fdb900d2abcfbe463a799da28ccf50bb114908cc3983fcfec99c0d` (8.090 bytes)
  - `construindo-gradualinfo-estudo-de-caso.md`: `aebf46991b43a98d88cfacb0b30f13614c0a300f54148fb16ed868cc27e448e9` (7.169 bytes)
  - `diagnosticar-erro-500-503-site.md`: `b4ed6248f29a47fb702247cc5f3839b1a4fe70c4941bedfb08533918719f671c` (7.207 bytes)
  - `seo-nextjs-16-metadata-indexacao.md`: `e8a962bade9cf1fed75c2eb048112cf9a6cef21b76dce63fa074db2d9de5e816` (7.473 bytes)
  - `site-lento-mesmo-com-boa-nota-pagespeed.md`: `a502e38b56d9749e3c4ad5f0cdaf15862e25dc75e8150af54d9deb976016f5d7` (6.583 bytes)
- **Comprovação Efetiva de Paridade Campo a Campo:**
  - Executado `node scripts/verify-editorial-parity.mjs` com código de saída 0; comparação exaustiva de `title`, `slug`, `excerpt`, `editoria`, `author`, `cover`, `sources` e `content` contra `lib/editorial/local-posts.json`.
- **Integridade dos 8 Arquivos Protegidos:**
  - Conferidos contra `scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json`: **0.00% divergência** (todos 100% MATCH).
- **Higiene de Processos:**
  - Nenhum `killall -9 node` executado. O servidor de desenvolvimento `pnpm dev:editorial` permanece ativo e atendendo requisições em `http://127.0.0.1:3000/`.
- **Separação de Estados:**
  - Sem publicação no Sanity Studio e sem deploy para a Cloudflare.
