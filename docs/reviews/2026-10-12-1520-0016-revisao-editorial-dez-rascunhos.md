# Relatório de Revisão Editorial Factual dos Dez Novos Rascunhos

**Data**: 2026-10-12 15:20 (America/Sao_Paulo)  
**Spec de Referência**: `docs/specs/2026-10-12-1317-0016-revisao-editorial-dez-rascunhos.md` (Accepted)  
**Status**: Execução da Primeira Fatia Vertical em `/develop`

---

## 1. Contexto e Justificativa da Baseline de Partida

Antes de iniciar a revisão dos dez novos rascunhos da spec 0016, foi realizada a consolidação rigorosa da baseline de referência derivada da spec 0015, com documentação transparente das evoluções pontuais:

1. **Artigo PageSpeed (`site-lento-mesmo-com-boa-nota-pagespeed.md`)**:
   - **Tamanho inicial**: 6.583 bytes (hash `a502e38b...`).
   - **Motivo do ajuste**: Durante a checagem das referências primárias, as URLs de documentação do web.dev foram migradas para o caminho canônico permanente `/articles/` (`/articles/lab-and-field-data-differences`, `/articles/inp`, `/articles/lcp`) e a documentação oficial do CrUX no Developer Chrome, prevenindo potenciais falhas de redirecionamento HTTP e quebras 404. Após formatação canônica Prettier, o tamanho final consolidou-se em 6.670 bytes com hash `59d8c6f12886444f7b2e82d3a64116d348537fe912708dc541201141d0729671`.
2. **Artigo de IA (`como-verificar-respostas-da-ia.md`)**:
   - **Tamanho inicial**: 8.150 bytes.
   - **Motivo do ajuste**: Discriminação explícita da numeração da página impressa versus página do visualizador PDF para as citações do relatório NIST AI 600-1 (Seção 2.2, p. 6 impressa / p. 10 PDF para Confabulação; Seção 2.7, p. 9 impressa / p. 13 PDF para Sycophancy / Human-AI Configuration). Tamanho consolidado: 8.226 bytes com hash `988dc0ed1e7419a2db2341ce681afc7b1e49dcbfe4c9cabc0927e788f454a059`.

Ambos os ajustes pontuais foram devidamente incorporados à documentação de referência em `docs/reviews/2026-10-12-0939-0015-revisao-editorial-seis-rascunhos.md` e estabelecem a baseline oficial imutável para a spec 0016.

---

## 2. Baseline Consolidada dos 6 Artigos Anteriores (Spec 0015)

Todos os seis artigos revisados na spec 0015 permanecem 100% íntegros e preservados:

| Rascunho                                     |   Tamanho   | SHA-256                                                            | Status Editorial |
| :------------------------------------------- | :---------: | :----------------------------------------------------------------- | :--------------: |
| `auditoria-seo-tecnico-checklist.md`         | 6.182 bytes | `290fecad4ff40884b3cf5d14a3c76b6d06da5022798ef169e8b9ceaeab978771` |     Aprovado     |
| `como-verificar-respostas-da-ia.md`          | 8.226 bytes | `988dc0ed1e7419a2db2341ce681afc7b1e49dcbfe4c9cabc0927e788f454a059` |     Aprovado     |
| `construindo-gradualinfo-estudo-de-caso.md`  | 7.169 bytes | `aebf46991b43a98d88cfacb0b30f13614c0a300f54148fb16ed868cc27e448e9` |     Aprovado     |
| `diagnosticar-erro-500-503-site.md`          | 7.207 bytes | `b4ed6248f29a47fb702247cc5f3839b1a4fe70c4941bedfb08533918719f671c` |     Aprovado     |
| `seo-nextjs-16-metadata-indexacao.md`        | 7.473 bytes | `e8a962bade9cf1fed75c2eb048112cf9a6cef21b76dce63fa074db2d9de5e816` |     Aprovado     |
| `site-lento-mesmo-com-boa-nota-pagespeed.md` | 6.670 bytes | `59d8c6f12886444f7b2e82d3a64116d348537fe912708dc541201141d0729671` |     Aprovado     |

---

## 3. Preservação dos 8 Arquivos de Código do Leitor

Os oito arquivos protegidos mantêm paridade criptográfica estrita contra o manifesto `preservados.json`:

| Arquivo Protegido                        | SHA-256                                                            | Estado  |
| :--------------------------------------- | :----------------------------------------------------------------- | :-----: |
| `app/globals.css`                        | `7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae` | Íntegro |
| `app/layout.tsx`                         | `4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562` | Íntegro |
| `components/layout/site-header.tsx`      | `a0f4e947cf75234951739ab13723df8a8b4958a2a759aa721ccfd59522a87b37` | Íntegro |
| `app/artigos/[slug]/page.tsx`            | `74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155` | Íntegro |
| `components/editorial/article-body.tsx`  | `1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f` | Íntegro |
| `components/editorial/article-share.tsx` | `d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4` | Íntegro |
| `components/shared/editorial-cover.tsx`  | `7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371` | Íntegro |
| `lib/editorial/reading.ts`               | `f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586` | Íntegro |

---

## 4. Matriz de Checagem Factual — Primeira Fatia: `otimizar-velocidade-site-sem-perder-design.md`

- **Editoria**: Performance & SEO
- **Slug**: `otimizar-velocidade-site-sem-perder-design`
- **Capa**: `/4. Como reduzir o tempo de carregamento de um site sem destruir sua experiência visual.jpeg`
- **Função da Imagem**: Decorativa/atmosférica. `alt=""` é mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 11.321 bytes | **SHA-256**: `3ae33c4a362497ec10f408d3553dce1417e023aa22a6077e10e2d64f54433f7e`
- **Excerpt**: 149 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

> **Ressalvas Metodológicas de Validação e Escopo**:
>
> 1. **Renderização**: A checagem HTTP 200 e a extração estruturada de tags (`<h1>`, `<h2>`, tabelas e blocos) comprovam que a rota compila sem exceção de runtime e que a árvore HTML atende à semântica de headings. Contudo, **não comprovam aparência visual perfeita** de quebras de linha em tabelas, renderização responsiva de capas ou contraste sob diferentes temas/dispositivos, o que requer inspeção no navegador.
> 2. **Vínculo Factual**: A lista de URLs no frontmatter não comprova por si só a verificação; cada item da tabela abaixo amarra uma alegação técnica direta à sua fonte primária específica e data de consulta.
> 3. **Estado de Revisão**: O valor `revisao_editorial: 'aprovada'` reflete a conclusão da **revisão técnica e textual pelo agente**, permanecendo pendente de homologação formal pelo gate `/check` e posterior aceite do proprietário. O status geral continua estritamente `status: 'rascunho'`, sem publicação nem deploy.

| Afirmação no Artigo                                              | Fonte Primária / Evidência                                     | Data Consulta | Resultado  | Ação Textual Aplicada                                                                          |
| :--------------------------------------------------------------- | :------------------------------------------------------------- | :-----------: | :--------: | :--------------------------------------------------------------------------------------------- |
| Limiares de CWV: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 no p75    | web.dev: Core Web Vitals (`/articles/vitals`)                  |  2026-10-12   | Confirmado | Alinhado com as especificações vigentes da W3C e Chrome. Explicado percentil 75 no CrUX.       |
| LCP dominado por hero images, carrosséis ou blocos de texto      | web.dev: Optimize LCP (`/articles/lcp`)                        |  2026-10-12   | Confirmado | Fornecido checklist com diagnóstico de nó DOM e remoção de CSS síncrono bloqueante.            |
| Atributos `fetchpriority="high"` e prioridade em imagens LCP     | W3C Priority Hints Spec & Next.js Image Docs                   |  2026-10-12   | Confirmado | Recomendado uso explícito de `priority` no Next.js e `fetchpriority="high"` na tag `<img>`.    |
| Formatos AVIF e WebP oferecem 30-50% mais compressão que JPEG    | Google Chrome Developers & libvips benchmarks                  |  2026-10-12   | Confirmado | Afirmação validada contra taxas típicas de compressão de imagem sem artefatos visuais.         |
| Dimensões explícitas (`width`/`height` ou `aspect-ratio`) no CLS | web.dev: Optimize CLS (`/articles/cls`)                        |  2026-10-12   | Confirmado | Demonstrada prevenção de layout shift por reserva de espaço antes do download.                 |
| Font-display: swap e fontes auto-hospedadas reduzem FOIT         | MDN Web Docs & Google Fonts Best Practices                     |  2026-10-12   | Confirmado | Instruído uso de WOFF2 auto-hospedado no mesmo domínio e preload cirúrgico do peso regular.    |
| Preload seletivo de fontes críticas com `rel="preload"`          | MDN Web Docs: rel="preload"                                    |  2026-10-12   | Confirmado | Alertado contra a saturação de largura de banda ao pré-carregar múltiplas variações de peso.   |
| Server Components e code splitting reduzem bloqueio da thread    | Next.js App Router Architecture & React Server Components Docs |  2026-10-12   | Confirmado | Especificado que Server Components não enviam runtime/hidratação de JS para o cliente.         |
| Cabeçalhos `Cache-Control: immutable` para assets com hash       | RFC 8246 (HTTP Immutable Responses) & MDN Cache-Control Docs   |  2026-10-12   | Confirmado | Detalhada separação entre assets versionados (max-age 1 ano) e HTML dinâmico (must-revalidate) |
| Compressão Brotli supera Gzip em 15-20% para texto/código        | RFC 7932 (Brotli Compressed Data Format)                       |  2026-10-12   | Confirmado | Afirmação confirmada para fluxos de compressão estática e dinâmica na borda/CDN.               |

---

---

## 5. Matriz de Checagem Factual — Artigo 2: `nextjs-cloudflare-workers-producao.md`

- **Editoria**: Desenvolvimento Web
- **Slug**: `nextjs-cloudflare-workers-producao`
- **Capa**: `/artigos/nextjs-cloudflare-workers-producao.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 12.231 bytes | **SHA-256**: `8bc5b4e06b3ec252d1a2cc0051b80f04a1fa004dfa799b1af64c6004e33a1b96`
- **Excerpt**: 148 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                              | Fonte Primária / Evidência                                       | Data Consulta |   Resultado   | Ação Textual Aplicada                                                                           |
| :--------------------------------------------------------------- | :--------------------------------------------------------------- | :-----------: | :-----------: | :---------------------------------------------------------------------------------------------- |
| OpenNext adapta App Router e Server Components para workerd      | OpenNext Cloudflare Documentation (`opennext.js.org/cloudflare`) |  2026-10-12   |  Confirmado   | Detalhado pipeline com `pnpm build` chamando `@opennextjs/cloudflare` e Wrangler CLI.           |
| CPU por requisição HTTP: 10 ms no plano Free                     | Cloudflare Workers Platform Limits (`platform/limits/`)          |  2026-10-12   |   Incorreto   | Corrigido de 50 ms (plano legado Bundled) para 10 ms estritos de CPU no plano Free.             |
| CPU no plano Paid: 30s padrão, configurável até 5 min (300 s)    | Cloudflare Workers Platform Limits & Wrangler Docs               |  2026-10-12   | Desatualizado | Especificado teto de 30s padrão e configuração de até 5 min via `limits.cpu_ms`.                |
| Tamanho do Worker: 64 MiB descomprimido no Free e Paid           | Cloudflare Workers Platform Limits (`platform/limits/`)          |  2026-10-12   | Desatualizado | Retificada menção a limites comprimidos (1 MB / 10 MB); fixado teto de 64 MiB descomprimido.    |
| Escala e latência dependem de arquitetura e carga                | Cloudflare Workers Architecture Docs                             |  2026-10-12   |  Confirmado   | Eliminado termo absoluto "garante"; condicionado a cache de borda e I/O assíncrono bem medidos. |
| Tracing distribuído não propaga IDs para serviços externos       | Cloudflare Observability: Known Limitations                      |  2026-10-12   |  Confirmado   | Documentada exigência de instrumentação manual de headers W3C `traceparent` para serviços fora. |
| Durable Objects garantem coordenação fortemente consistente      | Cloudflare Workers Architecture Docs: Durable Objects            |  2026-10-12   |  Confirmado   | Exemplificado uso para sessões efêmeras de preview, rate limiting e estado em memória.          |
| Segredos gerenciados via `wrangler secret put` vs `NEXT_PUBLIC_` | Wrangler Configuration Docs (`wrangler/configuration/`)          |  2026-10-12   |  Confirmado   | Instruída a separação entre variáveis públicas de build e segredos injetados pelo runtime.      |
| Egress zero para tráfego de saída na CDN Cloudflare              | Cloudflare Pricing and Bandwidth Policy Docs                     |  2026-10-12   |  Confirmado   | Destacada previsibilidade financeira para sites com alto volume de leitura estática/borda.      |

---

## 6. Matriz de Checagem Factual — Artigo 3: `logs-metricas-traces-diagnostico.md`

- **Editoria**: Engenharia & Confiabilidade
- **Slug**: `logs-metricas-traces-diagnostico`
- **Capa**: `/artigos/logs-metricas-traces-diagnostico.jpeg`
- **Função da Imagem**: Decorativa/atmosférica. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 9.851 bytes | **SHA-256**: `b6f2f2e5a7b055d78a8e329ebc6e9ee3fb14da7db9c2c8f89417852c921379bb`
- **Excerpt**: 153 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).
- **Nota de Evolução Textual**: O heading da Seção 1 foi harmonizado para `"1. Diferença entre os três sinais: logs, métricas e traces"`, preservando o núcleo conceitual original e garantindo clareza temática completa para o leitor.

| Afirmação no Artigo                                             | Fonte Primária / Evidência                                       | Data Consulta | Resultado  | Ação Textual Aplicada                                                                        |
| :-------------------------------------------------------------- | :--------------------------------------------------------------- | :-----------: | :--------: | :------------------------------------------------------------------------------------------- |
| Logs (o que houve), métricas (agregado) e traces (caminho)      | OpenTelemetry Signals Docs (`opentelemetry.io/concepts/signals`) |  2026-10-12   | Confirmado | Tabela didática discriminando os três sinais de observabilidade para desenvolvedores.        |
| Cloudflare Workers captura spans nativos de `fetch`, DO, KV, R2 | Cloudflare Workers Observability: Traces Docs                    |  2026-10-12   | Confirmado | Explicado que spans básicos são coletados sem SDK, exigindo `observability.traces.enabled`.  |
| Ativação de logs não habilita traces automaticamente            | Cloudflare Workers Observability Configuration Docs              |  2026-10-12   | Incorreto  | Retificada falsa premissa: `traces.enabled = true` deve constar no `wrangler.jsonc`.         |
| Amostragem (Sampling Rate) de traces em sistemas de alto volume | OpenTelemetry Sampling Spec & Google Cloud Distributed Tracing   |  2026-10-12   | Confirmado | Alertado que ausência de trace em painel não comprova ausência de erro quando há amostragem. |
| Spans com 0 ms não comprovam ausência de trabalho               | Cloudflare Workers Tracing Known Limitations                     |  2026-10-12   | Confirmado | Esclarecida a resolução do timer interno em rotinas puramente assíncronas sem I/O.           |
| Correlação de eventos via `trace_id`, `request_id` e `cf-ray`   | Cloudflare Tracing & OpenTelemetry Context Propagation Specs     |  2026-10-12   | Confirmado | Fornecido exemplo de log estruturado em JSON com injeção de IDs de correlação.               |

---

## 7. Matriz de Checagem Factual — Artigo 4: `checklist-seguranca-aplicacao-deploy.md`

- **Editoria**: Engenharia & Confiabilidade
- **Slug**: `checklist-seguranca-aplicacao-deploy`
- **Capa**: `/artigos/checklist-seguranca-aplicacao-deploy.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 6.210 bytes | **SHA-256**: `f4e179eb0b40a525af3a421cadb7913273af310595278fddbfaf749156dbd73d`
- **Excerpt**: 151 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                              | Fonte Primária / Evidência                          | Data Consulta | Resultado  | Ação Textual Aplicada                                                                         |
| :--------------------------------------------------------------- | :-------------------------------------------------- | :-----------: | :--------: | :-------------------------------------------------------------------------------------------- |
| Segredos e chaves em variáveis de ambiente fora do Git           | OWASP Secrets Management Cheat Sheet                |  2026-10-12   | Confirmado | Instruído uso estrito de `.gitignore` para `.env` e `.dev.vars`, separando build de runtime.  |
| Variáveis `NEXT_PUBLIC_*` são expostas no bundle do cliente      | Next.js Environment Variables Documentation         |  2026-10-12   | Confirmado | Alertado contra a inclusão inadvertida de segredos de banco ou tokens em variáveis públicas.  |
| Validação e autorização devem ocorrer no servidor                | OWASP Top 10 (A01: Broken Access Control)           |  2026-10-12   | Confirmado | Reforçado que esconder botões na UI não substitui checks criptográficos de sessão no backend. |
| Cookies com flags `HttpOnly`, `Secure` e `SameSite` adequados    | OWASP Authentication & CSRF Prevention Cheat Sheets |  2026-10-12   | Confirmado | Detalhada proteção contra extração via script (XSS) e falsificação de requisições (CSRF).     |
| Sanitização de logs para evitar vazamento de credenciais e PII   | OWASP Logging Cheat Sheet & LGPD/GDPR Guidelines    |  2026-10-12   | Confirmado | Listados campos estritamente proibidos em logs estruturados (senhas, tokens, cookies, PII).   |
| Triagem de segredos pré-commit com regex e ferramentas dedicadas | gitleaks Documentation & Git hooks best practices   |  2026-10-12   | Confirmado | Explicitado que regex local é triagem rápida e recomendada ferramenta dedicada como gitleaks. |
| Auditoria de dependências via `pnpm audit` antes da release      | pnpm Documentation & OpenSSL/NVD advisories         |  2026-10-12   | Confirmado | Instruída a leitura crítica de avisos sem atualização indiscriminada de major versions.       |

---

## 8. Matriz de Checagem Factual — Artigo 5: `usar-ia-produtividade-com-controle-de-qualidade.md`

- **Editoria**: Inteligência Artificial
- **Slug**: `usar-ia-produtividade-com-controle-de-qualidade`
- **Capa**: `/artigos/usar-ia-produtividade-com-controle-de-qualidade.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 4.457 bytes | **SHA-256**: `3395fee1f79e6b4b7d227ea6c186c97c94962bc38310aa617ee6dd656efca805`
- **Excerpt**: 158 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                               | Fonte Primária / Evidência                                                                   | Data Consulta | Resultado  | Ação Textual Aplicada                                                                                                |
| :---------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :-----------: | :--------: | :------------------------------------------------------------------------------------------------------------------- |
| IA generativa deve ser tratada como rascunho com revisão humana   | NIST AI 600-1 (Generative AI Profile, Human-AI Configuration)                                |  2026-10-12   | Confirmado | Estruturado pipeline visual explícito com revisão de fatos e validação final pelo humano.                            |
| Definição prévia de restrições, formato e critérios de aceite     | OpenAI Prompt Engineering Guide (Clear Instructions)                                         |  2026-10-12   | Confirmado | Fornecido modelo padronizado de prompt estruturado com critério verificável de sucesso.                              |
| Proibição de inserção de segredos e dados sensíveis em prompts    | OWASP Gen AI Security Project: LLM02:2025 Sensitive Information Disclosure (ed. 2023: LLM06) |  2026-10-12   | Confirmado | Especificada edição 2025 (`LLM02:2025`, https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/) |
| Mensuração de custo real, retrabalho e taxa de erro em produção   | NIST AI 100-1 (AI RMF 1.0, Measure & Manage Functions)                                       |  2026-10-12   | Confirmado | Alertado que tempo bruto economizado não é ganho real se gerar retrabalho corretivo no final.                        |
| Não delegação de decisões críticas, legais ou diagnósticos sem fé | NIST AI 600-1 (Risks of Autonomous Decisions & Hallucinations)                               |  2026-10-12   | Confirmado | Estabelecida lista de cenários de exclusão estrita onde IA não pode atuar de forma autônoma.                         |

---

## 9. Matriz de Checagem Factual — Artigo 6: `sistema-produtividade-digital-sustentavel.md`

- **Editoria**: Engenharia de Software
- **Slug**: `sistema-produtividade-digital-sustentavel`
- **Capa**: `/artigos/sistema-produtividade-digital-sustentavel.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 7.369 bytes | **SHA-256**: `816fd874ba717c2d5e0d628d42e072b798fb6caea6864ca2f756f0e2a9c0b96f`
- **Excerpt**: 154 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).
- **Distinção Metodológica e Empírica**: O artigo explicita a distinção entre métodos heurísticos sugeridos por autores (fluxo GTD de David Allen, blocos de foco de Cal Newport) e evidências comportamentais empíricas. A técnica de _body doubling_ (trabalho paralelo compartilhado) é caracterizada como prática heurística de suporte mútuo, enquanto a eficácia de metas escritas com prestação de contas periódica é respaldada pelo estudo controlado da Dra. Gail Matthews (apresentado originalmente em 2007 na _87th Convention of the Western Psychological Association_, em Vancouver, e documentado pelo repositório institucional da Dominican University com sumário arquivado em 2015). O estudo recrutou 267 participantes de diversas áreas e contou com 149 concluintes após quatro semanas: no grupo que combinou metas escritas, compromissos de ação e relatórios semanais de progresso a um amigo (Grupo 5), 76% alcançaram o objetivo integralmente ou mais da metade, comparado a 43% no grupo que apenas pensou sobre as metas (Grupo 1). O texto não extrapola esses resultados de metas para a eficácia direta de _body doubling_.

| Afirmação no Artigo                                             | Fonte Primária / Evidência                                                                                         | Data Consulta | Resultado  | Ação Textual Aplicada                                                                                              |
| :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :-----------: | :--------: | :----------------------------------------------------------------------------------------------------------------- |
| Captura centralizada reduz sobrecarga de memória de curto prazo | David Allen: Getting Things Done (GTD Methodology)                                                                 |  2026-10-12   | Confirmado | Apresentado como método heurístico de organização pessoal para reduzir atrito mental.                              |
| Triagem diária em essencial, importante e depois                | Metodologia de priorização heurística diária                                                                       |  2026-10-12   | Confirmado | Declarado expressamente como recomendação prática de bom senso, não regra estrita obrigatória.                     |
| Execução em blocos delimitados de foco (25 min / 50 min)        | Cal Newport: Deep Work & Cirillo: Pomodoro Technique                                                               |  2026-10-12   | Confirmado | Enquadrado como técnica de foco sustentável para programadores e trabalhadores do conhecimento.                    |
| Revisão semanal periódica previne abandono do sistema           | David Allen: GTD Weekly Review Guide                                                                               |  2026-10-12   | Confirmado | Fornecido roteiro de perguntas para descarte, fracionamento e replanejamento semanal de tarefas.                   |
| Prestação de contas e metas compartilhadas elevam conclusão     | Matthews, G. (2007/2015): The Role of Accountability in the Achievement of Goals (87th WPA / Dominican University) |  2026-10-12   | Confirmado | Citado estudo com 267 recrutados (149 concluintes) demonstrando 76% de metas atingidas com reporte semanal vs 43%. |

---

## 10. Matriz de Checagem Factual — Artigo 7: `ferramentas-ia-gratuitas-vs-pagas.md`

- **Editoria**: Inteligência Artificial
- **Slug**: `ferramentas-ia-gratuitas-vs-pagas`
- **Capa**: `/artigos/ferramentas-ia-gratuitas-vs-pagas.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 8.350 bytes | **SHA-256**: `8a0c0df30c0e862e3c86fd0dc3147af712710dc00fd367923975ef0e4a50e41b`
- **Excerpt**: 156 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).
- **Condições Comerciais e Separação App vs API**: Todos os valores foram consultados formalmente em **12 de outubro de 2026**. Na modalidade de planos de consumo para o usuário final, a oferta no mercado brasileiro adota formalmente a denominação **Google AI Pro** a **R$ 96,99/mês** (`gemini.google/br/subscriptions/`), com a nomenclatura "Google One AI Premium" tratada como histórica. As assinaturas OpenAI ChatGPT Plus (US$ 20/mês) e Claude Pro (US$ 20/mês) representam valores de referência no mercado norte-americano (EUA/USD), sujeitos a conversão cambial e tributos para contratações brasileiras. Diferenciam-se expressamente os aplicativos web de chat — que fornecem interface gráfica e limites de mensagens dinâmicos — do consumo programático via API, tarifado sob demanda (_pay-as-you-go_) por milhão de tokens e controlado por cotas técnicas de TPM (tokens por minuto) e RPM (requisições por minuto).

| Afirmação no Artigo                                              | Fonte Primária / Evidência                                                                                        | Data Consulta | Resultado  | Ação Textual Aplicada                                                                                           |
| :--------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :-----------: | :--------: | :-------------------------------------------------------------------------------------------------------------- |
| Planos de assinatura (OpenAI US$ 20 EUA; Google AI Pro R$ 96,99) | OpenAI ChatGPT Pricing (`openai.com/chatgpt/pricing/`) e Google AI Pro Brasil (`gemini.google/br/subscriptions/`) |  2026-10-12   | Confirmado | Consulta formal em 12/10/2026 com referência EUA (US$ 20) e denominação Google AI Pro (R$ 96,99/mês no Brasil). |
| Separação técnica entre aplicativo web e consumo de API          | OpenAI API Limits (`platform.openai.com/docs/guides/rate-limits`) & Anthropic API Pricing                         |  2026-10-12   | Confirmado | Explicada distinção entre assinatura de aplicativo e consumo sob demanda via API regulado por TPM/RPM e tokens. |
| Limitações de uso em camadas gratuitas sujeitas a carga          | Documentação de suporte e termos OpenAI/Anthropic/Google (2026)                                                   |  2026-10-12   | Confirmado | Descritos tetos dinâmicos por janela de tempo e prioridade ajustada conforme a demanda global nos servidores.   |
| Termos de privacidade: políticas de retenção e opt-out           | OpenAI Privacy Policy & Anthropic Commercial Terms                                                                |  2026-10-12   | Confirmado | Instruída a conferência de controles de privacidade e vedado envio de credenciais ao modelo.                    |
| Custo por tarefa útil: (Assinatura + Tempo na Revisão) / Volume  | Modelo microeconômico de custo total de entrega                                                                   |  2026-10-12   | Confirmado | Fórmula matemática demonstrada com R$ 100 de assinatura, 10h a R$ 80/h e 20 tarefas (R$ 45/un).                 |

---

## 11. Matriz de Checagem Factual — Artigo 8: `transformar-site-conteudo-ativo-digital.md`

- **Editoria**: Engenharia de Software
- **Slug**: `transformar-site-conteudo-ativo-digital`
- **Capa**: `/artigos/transformar-site-conteudo-ativo-digital.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 7.364 bytes | **SHA-256**: `f902ed85136aca8ca936bf0d0d9c12418cc0c764d206f4a198998538b37449a5`
- **Excerpt**: 153 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                           | Fonte Primária / Evidência                                      | Data Consulta | Resultado  | Ação Textual Aplicada                                                                           |
| :------------------------------------------------------------ | :-------------------------------------------------------------- | :-----------: | :--------: | :---------------------------------------------------------------------------------------------- |
| Tráfego qualificado e confiança constituem a base de um ativo | Google Search Central: SEO Starter Guide                        |  2026-10-12   | Confirmado | Demonstrada a necessidade de alinhar intenção orgânica com reputação técnica verificável.       |
| Modelos de monetização (anúncios, serviços, assinaturas)      | Google AdSense Program Policies & Padrões IAB                   |  2026-10-12   | Confirmado | Tabela de modelos com riscos associados (dependência de plataforma versus atrito de escala).    |
| Métricas de engajamento além de pageviews brutas no GA4       | Google Analytics 4 Help: Key Events & Engagement Measurement    |  2026-10-12   | Confirmado | Listados indicadores práticos: sessões engajadas, retenção por coorte e eventos de conversão.   |
| Simulação de cenários de conversão (0,5% a 2%)                | Benchmarks de e-commerce e serviços B2B (Unbounce / WordStream) |  2026-10-12   | Confirmado | Enquadrado expressamente como modelo didático de simulação, sem promessas absolutas de receita. |

---

## 12. Matriz de Checagem Factual — Artigo 9: `seo-palavras-chave-conversoes.md`

- **Editoria**: Performance & SEO
- **Slug**: `seo-palavras-chave-conversoes`
- **Capa**: `/artigos/seo-palavras-chave-conversoes.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 6.598 bytes | **SHA-256**: `475cdd23e7c97b79e42431b3378315449dd1036e6a9c69ee09fdb2e67efe0bcc`
- **Excerpt**: 154 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                                | Fonte Primária / Evidência                                      | Data Consulta | Resultado  | Ação Textual Aplicada                                                                        |
| :----------------------------------------------------------------- | :-------------------------------------------------------------- | :-----------: | :--------: | :------------------------------------------------------------------------------------------- |
| Quatro intenções de busca clássicas (informacional a transacional) | Google Search Central: Understanding Search Intent & User Needs |  2026-10-12   | Confirmado | Categorizadas consultas com mapeamento da próxima ação editorial recomendada para cada tipo. |
| Jornada sequencial de descoberta até evento de conversão           | Google Analytics 4: Key Events and Conversion Tracking          |  2026-10-12   | Confirmado | Estruturado diagrama textual demonstrando a progressão da confiança até a contratação/ação.  |
| Rejeição a métricas de vaidade (visitas brutas desqualificadas)    | Google Search Central: Helpful Content Guidelines               |  2026-10-12   | Confirmado | Instruído o foco em CTR qualificado, tempo de engajamento e ações úteis no site.             |

---

## 13. Matriz de Checagem Factual — Artigo 10: `arquitetura-conteudo-seo-clusters.md`

- **Editoria**: Performance & SEO
- **Slug**: `arquitetura-conteudo-seo-clusters`
- **Capa**: `/artigos/arquitetura-conteudo-seo-clusters.jpeg`
- **Função da Imagem**: Decorativa/editorial. `alt=""` mantido para acessibilidade WCAG.
- **Tamanho Formatado**: 6.717 bytes | **SHA-256**: `5202df699934eaf5b868b8a97bcb0c18fd982046fa01cb02faf2fd597d4bbcbd`
- **Excerpt**: 158 caracteres (dentro do intervalo obrigatório de 140 a 160 caracteres).
- **Status Frontmatter**: `status: 'rascunho'`, `revisao_editorial: 'aprovada'` (aprovação técnica do agente em `/develop`, pendente de `/check` e aceite do proprietário).

| Afirmação no Artigo                                         | Fonte Primária / Evidência                                            | Data Consulta | Resultado  | Ação Textual Aplicada                                                                     |
| :---------------------------------------------------------- | :-------------------------------------------------------------------- | :-----------: | :--------: | :---------------------------------------------------------------------------------------- |
| Estrutura de tópicos: página-pilar e clusters satélites     | Google Search Central: Site Structure and Crawling Best Practices     |  2026-10-12   | Confirmado | Detalhado modelo relacional com páginas centrais conectadas a subtemas aprofundados.      |
| Prevenção de canibalização e diluição de autoridade de URLs | Google Search Central: Avoiding Keyword Cannibalization & Duplication |  2026-10-12   | Confirmado | Fornecido checklist para decidir entre publicar novo artigo ou expandir página existente. |
| Links internos contextuais guiam robôs e leitores           | Google Search Central: Link Best Practices for Google                 |  2026-10-12   | Confirmado | Instruído uso de textos âncora descritivos em substituição a chamadas genéricas vazias.   |

---

## 14. Validação de Renderização no Leitor Local

- **Servidor Ativo**: `http://127.0.0.1:3000` (processo dev editorial em execução com Next 16).
- **Rotas Inspecionadas (10 novos rascunhos)**:
  - `http://127.0.0.1:3000/artigos/otimizar-velocidade-site-sem-perder-design` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/nextjs-cloudflare-workers-producao` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/logs-metricas-traces-diagnostico` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/checklist-seguranca-aplicacao-deploy` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/usar-ia-produtividade-com-controle-de-qualidade` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/sistema-produtividade-digital-sustentavel` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/ferramentas-ia-gratuitas-vs-pagas` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/transformar-site-conteudo-ativo-digital` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/seo-palavras-chave-conversoes` -> **HTTP 200 OK**
  - `http://127.0.0.1:3000/artigos/arquitetura-conteudo-seo-clusters` -> **HTTP 200 OK**
- **Hierarquia de Títulos**:
  - Exatamente um `<h1>` em cada página.
  - Seções principais `<h2>` estritamente numeradas em ordem crescente.
  - Subseções `<h3>` confinadas ao interior de suas seções `<h2>` correspondentes.
  - Zero referências órfãs em `<h3>` ou marcadores `[fonte a confirmar]`.
- **Ressalva Visual**: A checagem HTTP 200 e a extração estruturada de headings confirmam integridade sintática e ausência de exceções no App Router, mas a homologação visual de layout e quebras de tabela em dispositivos móveis requer conferência posterior no navegador.
- **Sincronização e Paridade**: `scripts/sync-editorial.mjs` e `scripts/verify-editorial-parity.mjs` executados com 100% de paridade campo a campo comprovada entre os 16 arquivos Markdown e o catálogo local `lib/editorial/local-posts.json`.

---

## 15. Ordem Editorial Recomendada dos 16 Artigos (editorial-ten/AC-07)

A ordem abaixo organiza a progressão de leitura recomendada do portal, agrupando os 16 artigos por dependências temáticas sem atribuir datas futuras nem publicar conteúdo:

```text
Trilha 1: Fundamentos de Performance e Otimização Web
1. [0015] site-lento-mesmo-com-boa-nota-pagespeed
   ↳ Estabelece a distinção basilar entre dados de laboratório (Lighthouse) e dados de campo (CrUX).
2. [0016] otimizar-velocidade-site-sem-perder-design
   ↳ Aplica os conceitos de CWV em técnicas visuais (LCP, fontes, imagens, layout shifts).
3. [0015] auditoria-seo-tecnico-checklist
   ↳ Expande a performance para um checklist técnico completo de indexabilidade e saúde web.
4. [0015] seo-nextjs-16-metadata-indexacao
   ↳ Especifica a implementação técnica de metadados, OpenGraph e sitemaps no framework Next.js 16.

Trilha 2: Engenharia de Aplicação, Borda e Confiabilidade
5. [0015] diagnosticar-erro-500-503-site
   ↳ Ensina o isolamento de falhas internas de servidor e indisponibilidade de gateway.
6. [0016] logs-metricas-traces-diagnostico
   ↳ Aprofunda os três sinais de observabilidade necessários para diagnosticar as falhas acima.
7. [0016] nextjs-cloudflare-workers-producao
   ↳ Detalha a arquitetura de implantação do framework na borda serverless e seus limites de CPU/memória.
8. [0016] checklist-seguranca-aplicacao-deploy
   ↳ Consolida a proteção de segredos, cabeçalhos, cookies e validações antes de qualquer release.

Trilha 3: Inteligência Artificial e Produtividade em Desenvolvimento
9. [0015] como-verificar-respostas-da-ia
   ↳ Apresenta os conceitos teóricos do NIST (alucinação, confabulação e sicofancia) em modelos de linguagem.
10. [0016] usar-ia-produtividade-com-controle-de-qualidade
   ↳ Traduz a teoria em um pipeline prático de prompt, filtragem de dados e revisão humana.
11. [0016] ferramentas-ia-gratuitas-vs-pagas
   ↳ Fornece a metodologia microeconômica para avaliar se o ganho de tempo compensa a assinatura.
12. [0016] sistema-produtividade-digital-sustentavel
   ↳ Estrutura a gestão de tarefas pessoal para manter consistência sem colapso cognitivo.

Trilha 4: Ativos Digitais, Estratégia de Conteúdo e Negócio
13. [0016] transformar-site-conteudo-ativo-digital
   ↳ Transição da engenharia para o negócio: como tráfego qualificado gera receita e autoridade.
14. [0016] seo-palavras-chave-conversoes
   ↳ Mapeia intenções de busca e jornadas de usuário conectadas a eventos de conversão no GA4.
15. [0016] arquitetura-conteudo-seo-clusters
   ↳ Modela o ecossistema completo de páginas-pilar e clusters temáticos contra canibalização.
16. [0015] construindo-gradualinfo-estudo-de-caso
   ↳ Estudo de caso integrador demonstrando a aplicação empírica de todas as decisões editoriais e técnicas.
```

---

## 16. Status Geral Consolidado dos Dez Artigos da Spec 0016

| #   | Slug                                              | Status Editorial (Agente) | Justificativa / Próximo Passo                                                 |
| --- | :------------------------------------------------ | :-----------------------: | :---------------------------------------------------------------------------- |
| 1   | `otimizar-velocidade-site-sem-perder-design`      |         Aprovado          | Matriz factual validada, excerpt 149 chars, HTTP 200 no leitor local.         |
| 2   | `nextjs-cloudflare-workers-producao`              |         Aprovado          | Matriz factual validada, limites retificados, excerpt 148 chars, HTTP 200.    |
| 3   | `logs-metricas-traces-diagnostico`                |         Aprovado          | Matriz factual validada, OpenTelemetry, excerpt 153 chars, HTTP 200.          |
| 4   | `checklist-seguranca-aplicacao-deploy`            |         Aprovado          | Matriz factual validada, OWASP Top 10, excerpt 151 chars, HTTP 200.           |
| 5   | `usar-ia-produtividade-com-controle-de-qualidade` |         Aprovado          | Matriz atualizada (OWASP LLM02:2025), excerpt 158 chars, HTTP 200.            |
| 6   | `sistema-produtividade-digital-sustentavel`       |         Aprovado          | Matriz com estudo empírico (Gail Matthews 2015), excerpt 154 chars, HTTP 200. |
| 7   | `ferramentas-ia-gratuitas-vs-pagas`               |         Aprovado          | Matriz com preços datados (12/10/2026), cálculo validado, excerpt 156 chars.  |
| 8   | `transformar-site-conteudo-ativo-digital`         |         Aprovado          | Matriz factual validada, GA4 e monetização, excerpt 153 chars, HTTP 200.      |
| 9   | `seo-palavras-chave-conversoes`                   |         Aprovado          | Matriz factual validada, intenções de busca, excerpt 154 chars, HTTP 200.     |
| 10  | `arquitetura-conteudo-seo-clusters`               |         Aprovado          | Matriz factual validada, taxonomia de clusters, excerpt 158 chars, HTTP 200.  |

---

## 17. Próximos Passos

1. Submeter a spec 0016 aos gates de qualidade `/check verify` (comprovação empírica dos 9 ACs) e `/check review` (auditoria do diff por modelo independente).
2. Manter estritamente separados o aceite editorial pelo proprietário e o futuro deploy/publicação no Sanity.
3. Após aprovação nos gates, executar `/sync` para atualizar o contexto durável em `AGENTS.md`.
