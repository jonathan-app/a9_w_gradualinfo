# Relatório de Revisão Editorial Factual dos Seis Rascunhos

**Data**: 2026-10-12  
**Spec de Referência**: `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md` (Accepted)  
**Status**: Executado em `/develop`

---

## 1. Padrão de Estrutura e Auditoria Factual

Todos os seis rascunhos em `docs/rascunhos-editoriais/` foram auditados contra fontes primárias (RFCs, W3C, Google Search Central, Next.js Docs, web.dev, NIST AI RMF). O artigo de referência (`diagnosticar-erro-500-503-site.md`) forneceu a diretriz de tom, estrutura e leitura, mas suas afirmações foram submetidas ao mesmo crivo analítico das demais matérias.

---

## 2. Matrizes de Checagem Factual por Artigo

### 2.1 `diagnosticar-erro-500-503-site.md` (Artigo de Referência)

- **Editoria**: Engenharia & Confiabilidade
- **Capa**: `/5. Por que seu site retorna erro 500 ou 503? Um método de diagnóstico sem achismos.jpeg`
- **Função da Imagem**: Atmosférica/decorativa (mulher desenvolvedora analisando dashboard de métricas). `alt=""` é WCAG compliance; conteúdo textual autossuficiente.

| Afirmação no Rascunho                                          | Fonte Primária                           | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                                         |
| :------------------------------------------------------------- | :--------------------------------------- | :-----------: | :--------: | :-------------------------------------------------------------------------------------------- |
| HTTP 500 vs HTTP 503 conforme RFC                              | RFC 9110 (Seções 15.6.1 e 15.6.4)        |  2026-10-12   | Confirmado | Nenhuma. Mantida distinção técnica entre falha não tratada de runtime e contenção temporária. |
| Next.js App Router streaming break em erro 500                 | Next.js Error Handling Docs (App Router) |  2026-10-12   | Confirmado | Mantida explicação de propagação para `app/error.tsx`.                                        |
| Timeouts com AbortController                                   | MDN Fetch API & AbortController          |  2026-10-12   | Confirmado | Recomendado padrão explícito com `AbortSignal.timeout()` ou `controller.abort()`.             |
| Headers de telemetria `cf-ray`, `cache-control`, `retry-after` | Cloudflare Observability & RFC 9110      |  2026-10-12   | Confirmado | Mantido protocolo de inspeção via `curl -s -i`.                                               |

---

### 2.2 `auditoria-seo-tecnico-checklist.md`

- **Editoria**: Performance & SEO
- **Capa**: `/2. Auditoria SEO técnica: 21 verificações que podem revelar problemas invisíveis.jpeg`
- **Função da Imagem**: Decorativa/editorial (ilustração de painel de auditoria SEO). O texto descreve os 21 pontos exaustivamente.

| Afirmação no Rascunho                                                | Fonte Primária                                     | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                      |
| :------------------------------------------------------------------- | :------------------------------------------------- | :-----------: | :--------: | :------------------------------------------------------------------------- |
| Soft 404 consome crawl budget                                        | Google Search Central: Soft 404s & Crawl Budget    |  2026-10-12   | Confirmado | Ressaltada a necessidade de emitir status HTTP 404 real na borda/servidor. |
| Bloqueio de assets no robots.txt prejudica renderização do Googlebot | Google Search Central: Robots.txt specifications   |  2026-10-12   | Confirmado | Confirmado que CSS/JS bloqueados impedem detecção de mobile-friendliness.  |
| Limiares de LCP (< 2.5s) e CLS (< 0.1)                               | web.dev: Core Web Vitals definitions               |  2026-10-12   | Confirmado | Valores alinhados às especificações vigentes da W3C / Chrome.              |
| Dados estruturados `Article` e `NewsArticle`                         | Schema.org & Google Search Central Structured Data |  2026-10-12   | Confirmado | Validados atributos obrigatórios (`headline`, `image`, `datePublished`).   |

---

### 2.3 `seo-nextjs-16-metadata-indexacao.md`

- **Editoria**: Desenvolvimento Web
- **Capa**: `/3. SEO no Next.js 16: metadados, indexação e erros que passam despercebidos.jpeg`
- **Função da Imagem**: Decorativa (gráfico conceitual de busca e código). Texto integralmente descritivo.

| Afirmação no Rascunho                                                    | Fonte Primária                                                                                  | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                                                                                                                         |
| :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :-----------: | :--------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 descontinuou tag `<Head>` em favor do App Router Metadata API | Next.js 16 Metadata API Documentation                                                           |  2026-10-12   | Confirmado | Explicada substituição definitiva do Pages Router pelo App Router.                                                                                                            |
| Exigência de `metadataBase` para imagens Open Graph relativas            | Next.js API Reference: metadataBase                                                             |  2026-10-12   | Confirmado | Confirmado alerta em tempo de compilação quando ausente.                                                                                                                      |
| Comportamento de `notFound()` sob streaming vs sem streaming             | Next.js File Conventions: `not-found.js` (`/docs/app/api-reference/file-conventions/not-found`) |  2026-10-12   | Confirmado | Especificado que `notFound()` retorna HTTP 404 antes do streaming iniciar, mas permanece HTTP 200 com injeção de `<meta name="robots" content="noindex" />` após o streaming. |
| Geração assíncrona de `params` no Next.js 15/16 (`await params`)         | Next.js 15+ Upgrade Guide: Async Request APIs                                                   |  2026-10-12   | Confirmado | Ajustada tipagem do exemplo para `params: Promise<{ slug: string }>` e `await params`.                                                                                        |
| Arquivos dinâmicos `app/sitemap.ts` e `app/robots.ts`                    | Next.js Metadata Files Documentation                                                            |  2026-10-12   | Confirmado | Validada assinatura `MetadataRoute.Sitemap`.                                                                                                                                  |

---

### 2.4 `site-lento-mesmo-com-boa-nota-pagespeed.md`

- **Editoria**: Performance & SEO
- **Capa**: `/1. Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram.jpeg`
- **Função da Imagem**: Atmosférica/decorativa (leitor analisando laptop com notas adesivas).

| Afirmação no Rascunho                                               | Fonte Primária                                         | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                   |
| :------------------------------------------------------------------ | :----------------------------------------------------- | :-----------: | :--------: | :---------------------------------------------------------------------- |
| Discrepância entre Lab Data (Lighthouse) e Field Data (CrUX)        | web.dev: Lab vs Field Data Differences                 |  2026-10-12   | Confirmado | Explicado detalhadamente o perfil sintético emulado vs condições reais. |
| Substituição do FID pelo INP como Core Web Vital oficial            | Google Chrome Developers (Março 2024 INP Launch)       |  2026-10-12   | Confirmado | Reforçado que INP mede todas as interações e que FID foi depreciado.    |
| Critério do Percentil 75 (p75) na janela de 28 dias do CrUX         | Chrome UX Report Documentation & Google Search Console |  2026-10-12   | Confirmado | Mantida a regra estatística adotada pelo Google para aprovação no CWV.  |
| Faixas do INP: bom (<= 200ms), melhoria (200-500ms), ruim (> 500ms) | web.dev: Interaction to Next Paint (INP) thresholds    |  2026-10-12   | Confirmado | Limiares conferidos e exatos.                                           |

> **Nota Técnica de Evolução de Hash (PageSpeed)**:
> O arquivo inicial do rascunho media 6.583 bytes (hash `a502e38b...`). Na revisão factual de 2026-10-12, os links em `fontes_citadas` foram atualizados para apontar para as URLs canônicas permanentes com o prefixo `/articles/` do web.dev (`/articles/lab-and-field-data-differences`, `/articles/inp`, `/articles/lcp`) e a documentação oficial do CrUX no Developer Chrome, prevenindo falhas de redirecionamento HTTP e quebras 404. Após formatação canônica de código via Prettier, o tamanho final consolidado passou para 6.670 bytes com hash `59d8c6f12886444f7b2e82d3a64116d348537fe912708dc541201141d0729671`.

---

### 2.5 `como-verificar-respostas-da-ia.md`

- **Editoria**: Inteligência Artificial
- **Capa**: `/10. Como verificar se uma resposta de IA é confiável: um método de checagem em 7 passos.jpeg`
- **Função da Imagem**: Decorativa (ambiente de trabalho com anotações e laptop).

| Afirmação no Rascunho                                                      | Fonte Primária                                                                                                    | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                                                                                   |
| :------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :-----------: | :--------: | :-------------------------------------------------------------------------------------------------------------------------------------- |
| Confabulação (Alucinação) como categoria formal de risco de IA Generativa  | NIST AI 600-1 (Generative AI Profile, Jul 2024), Seção 2.2, p. 6 impressa / p. 10 no PDF                          |  2026-10-12   | Confirmado | Atribuído expressamente ao perfil de IA Generativa NIST AI 600-1 (Seção 2.2, p. 6 impressa / p. 10 no PDF).                             |
| Viés de aquiescência (Sycophancy) e riscos de configuração humano-IA       | NIST AI 600-1 (Seção 2.7, p. 9 impressa / p. 13 no PDF) & Anthropic Research (_Towards Understanding Sycophancy_) |  2026-10-12   | Confirmado | Teste de inversão de premissa contextualizado contra viés de automação e sycophancy (Seção 2.7, p. 9 impressa / p. 13 no PDF).          |
| Alucinação de pacotes (Package Hallucination) e supply chain               | Sonatype / VulnCheck Security Research & OWASP Top 10 for LLM Applications                                        |  2026-10-12   | Confirmado | Alerta sobre typosquatting mantido como recomendação de segurança indispensável.                                                        |
| Governança e responsabilidade humana mandatória (Protocolo dos Três Olhos) | NIST AI 100-1 (AI RMF 1.0, Jan 2023), Função GOVERN (GOVERN 1.2, 2.1 e 3.2)                                       |  2026-10-12   | Confirmado | Paráfrase analítica identificada articulando GOVERN 1.2 (práticas confiáveis), GOVERN 2.1 (papéis) e GOVERN 3.2 (supervisão humano-IA). |
| Verificação determinística via linters, typecheckers e sandboxes           | Práticas de Engenharia e NIST AI 100-1 (Measure Function)                                                         |  2026-10-12   | Confirmado | Enfatizado que ferramentas determinísticas são a primeira linha contra código inventado.                                                |

---

### 2.6 `construindo-gradualinfo-estudo-de-caso.md`

- **Editoria**: Engenharia de Software
- **Capa**: `/16. Construindo o GradualInfo: decisões reais, testes e aprendizados de um projeto digital.jpeg`
- **Função da Imagem**: Decorativa (mulher desenvolvedora trabalhando com interfaces e anotações).

| Afirmação no Rascunho                                        | Fonte Primária                                                                               | Data Consulta | Resultado  | Correção Necessária / Ajuste Aplicado                                                                                                |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :-----------: | :--------: | :----------------------------------------------------------------------------------------------------------------------------------- |
| Execução do Next.js 16 no Cloudflare Workers via OpenNext    | Repositório GradualInfo (`open-next.config.ts`, `wrangler.jsonc`) e OpenNext Cloudflare Docs |  2026-10-12   | Confirmado | Arquivos comprovam a implementação/configuração local; validação de runtime em produção depende de publicação ativa e deploy remoto. |
| Substituição de `middleware.ts` por `proxy.ts` no Next.js 16 | Repositório GradualInfo (`proxy.ts`) e Next.js 16 Changelog                                  |  2026-10-12   | Confirmado | Evidência documental e funcional comprovada no repositório.                                                                          |
| Rate limiting e preview state com Cloudflare Durable Objects | Repositório GradualInfo (`lib/preview/session-do.ts`, `lib/admin/rate-limit-do.ts`)          |  2026-10-12   | Confirmado | Comprovado por código e testes unitários locais; instância distribuída ao vivo requer deploy na Cloudflare.                          |
| RLS estrita no Supabase para proteção de tabelas             | Repositório GradualInfo (`supabase/migrations/`)                                             |  2026-10-12   | Confirmado | Comprovado por migrações ativas e testes pgTAP locais.                                                                               |

---

## 3. Avaliação de Acessibilidade das Imagens

Conforme o critério `editorial-review/AC-06`:

- Todas as 6 imagens de capa atuam como ilustrações complementares e de atmosfera. Nenhuma delas contém esquemas de rede exclusivos, códigos ou dados que não estejam integralmente transcritos e estruturados em tabelas ou blocos de código dentro do Markdown.
- Portanto, o uso de `alt=""` implementado em `components/shared/editorial-cover.tsx` atende plenamente às recomendações de acessibilidade (WCAG 2.1 - Imagens Decorativas), eliminando redundância para leitores de tela sem qualquer prejuízo informacional.
- Nenhum componente protegido foi tocado.

---

## 4. Ordem Recomendada de Publicação

1. **`construindo-gradualinfo-estudo-de-caso`**: Fundamenta a visão do portal e a autoridade técnica baseada em decisões do próprio repositório.
2. **`diagnosticar-erro-500-503-site`**: Artigo prático e investigativo sobre contenção e resiliência de borda.
3. **`site-lento-mesmo-com-boa-nota-pagespeed`**: Desmistifica métricas de performance e introduz o olhar focado em dados de campo (CrUX).
4. **`seo-nextjs-16-metadata-indexacao`**: Guia técnico cirúrgico e de alta demanda para quem desenvolve com Next.js 16.
5. **`como-verificar-respostas-da-ia`**: Ensina estudantes a auditar respostas de IA com método crítico.
6. **`auditoria-seo-tecnico-checklist`**: Checklist de referência para consulta contínua.

---

## 5. Hashes Finais dos Rascunhos e Sequência de Sincronização

A sincronização e conferência dos hashes foram executadas rigorosamente **após a formatação dos arquivos Markdown** e validadas campo a campo via `node scripts/verify-editorial-parity.mjs` (exit 0):

| Rascunho                                     |   Tamanho   | SHA-256                                                            | Paridade com Catálogo |
| :------------------------------------------- | :---------: | :----------------------------------------------------------------- | :-------------------: |
| `auditoria-seo-tecnico-checklist.md`         | 6.182 bytes | `290fecad4ff40884b3cf5d14a3c76b6d06da5022798ef169e8b9ceaeab978771` | 100% (campo a campo)  |
| `como-verificar-respostas-da-ia.md`          | 8.226 bytes | `988dc0ed1e7419a2db2341ce681afc7b1e49dcbfe4c9cabc0927e788f454a059` | 100% (campo a campo)  |
| `construindo-gradualinfo-estudo-de-caso.md`  | 7.169 bytes | `aebf46991b43a98d88cfacb0b30f13614c0a300f54148fb16ed868cc27e448e9` | 100% (campo a campo)  |
| `diagnosticar-erro-500-503-site.md`          | 7.207 bytes | `b4ed6248f29a47fb702247cc5f3839b1a4fe70c4941bedfb08533918719f671c` | 100% (campo a campo)  |
| `seo-nextjs-16-metadata-indexacao.md`        | 7.473 bytes | `e8a962bade9cf1fed75c2eb048112cf9a6cef21b76dce63fa074db2d9de5e816` | 100% (campo a campo)  |
| `site-lento-mesmo-com-boa-nota-pagespeed.md` | 6.670 bytes | `59d8c6f12886444f7b2e82d3a64116d348537fe912708dc541201141d0729671` | 100% (campo a campo)  |

- **Validação de Paridade:** `scripts/verify-editorial-parity.mjs` compara exaustivamente `title`, `slug`, `excerpt`, `editoria`, `author`, `cover`, `sources` e `content`.
- **Evolução de Baseline da Spec 0015:**
  - `site-lento-mesmo-com-boa-nota-pagespeed.md`: de 6.583 bytes (`a502e38b...`) para 6.670 bytes (`59d8c6f1...`) pela padronização das rotas canônicas `/articles/` no web.dev (prevenindo 404s/redirecionamentos) e formatação Prettier.
  - `como-verificar-respostas-da-ia.md`: de 8.150 bytes para 8.226 bytes (`988dc0ed...`) pela discriminação formal de citações do NIST AI 600-1 ("página impressa X / página Y do visualizador PDF").
- **Evidência Formal:** `docs/reviews/evidence/2026-10-12-1145-0015-revisao-editorial/2026-10-12-1145-resultado.json` (SHA-256 da spec: `602237a17c2f0143ee2fb4e9070287827830d5c7336d1d1ff9186d256991e4a0`, gate `check-decision.mjs` APROVADO: 8 PASS, 0 FAIL, exit 0).
- **Catálogo Local:** `lib/editorial/local-posts.json` sincronizado via `scripts/sync-editorial.mjs`.
