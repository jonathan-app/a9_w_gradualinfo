# Evidência Empírica — Spec 0016 (Revisão Editorial dos Dez Novos Rascunhos)

**Data:** 2026-10-12 21:46 (America/Sao_Paulo)  
**Spec Avaliada:** `docs/specs/2026-10-12-1317-0016-revisao-editorial-dez-rascunhos.md` (Accepted)  
**Executor:** `/check verify`

---

## 1. Verificação dos Critérios de Aceite

### editorial-ten/AC-01 (Revisão individual dos 10 rascunhos e preservação dos 6 anteriores) — PASS
- Todos os dez artigos do corpus foram revisados individualmente em `docs/rascunhos-editoriais/`.
- Os seis artigos aprovados na spec 0015 permanecem com seu conteúdo editorial preservado, com apontamento documentado sobre a unificação dos caminhos de capas em `public/artigos/` e o ajuste pontual na citação do NIST no artigo de IA (`como-verificar-respostas-da-ia.md`).
- Hashes SHA-256 e tamanhos dos 16 arquivos consolidados e verificados em disco.

### editorial-ten/AC-02 (Matriz factual verificável com fontes primárias oficiais e datas de consulta) — PASS
- Relatório `docs/reviews/2026-10-12-1520-0016-revisao-editorial-dez-rascunhos.md` documenta a matriz factual completa de cada um dos dez artigos.
- Todas as afirmações técnicas, numéricas e comerciais foram verificadas contra documentações oficiais (Cloudflare Workers, Next.js, OpenTelemetry, OWASP Gen AI Security, NIST, Google Search Central, GA4, Dominican University).
- Data de consulta registrada: 2026-10-12.
- Resultados classificados conforme vocabulário prescrito: `Confirmado`, `Desatualizado`, `Incorreto` ou `Não verificado`.
- Limites de Workers retificados para os valores oficiais vigentes: 10 ms CPU para plano Free, 30 s padrão (configurável até 5 min) para planos pagos, e 64 MiB sem compressão para tamanho de Worker.

### editorial-ten/AC-03 (Eliminação de marcadores pendentes e fontes citadas primárias) — PASS
- Script automatizado `scripts/verify-spec-0016.mjs` confirmou zero ocorrências de `[fonte a confirmar]` e zero referências `[web:n]` nos 10 rascunhos.
- Cada artigo possui `fontes_citadas` no frontmatter com título e URL primária correspondente a cada afirmação técnica suportada externamente.

### editorial-ten/AC-04 (Alinhamento instrutivo para desenvolvedores e procedimentos práticos) — PASS
- Tom instrutivo focado em estudantes e programadores em evolução.
- Cada um dos dez artigos contém procedimentos aplicáveis, diagramas lógicos, matrizes de decisão, fórmulas microeconômicas ou checklists operacionais:
  - `otimizar-velocidade-site-sem-perder-design`: pipeline de otimização de imagens (WebP/AVIF), fontes com `font-display: swap` e isolamento de CSS crítico.
  - `nextjs-cloudflare-workers-producao`: matriz de limites de CPU e memória, configuração de bindings e tratamento de runtime Node vs Edge.
  - `logs-metricas-traces-diagnostico`: taxonomia dos três sinais OTel e modelo de log estruturado JSON com injeção de IDs de correlação (`trace_id`, `cf-ray`).
  - `checklist-seguranca-aplicacao-deploy`: roteiro de 7 verificações críticas OWASP Top 10 pré-deploy e isolamento de segredos de build vs runtime.
  - `usar-ia-produtividade-com-controle-de-qualidade`: pipeline de 4 fases (Prompt restrito -> Triagem de dados sensíveis -> Execução -> Revisão humana) com OWASP LLM02:2025.
  - `sistema-produtividade-digital-sustentavel`: rotina de triagem e blocos de foco sustentável, com distinção empírica do estudo controlado de Gail Matthews (2007/2015, 267 recrutados, 149 concluintes).
  - `ferramentas-ia-gratuitas-vs-pagas`: modelo microeconômico de custo por tarefa útil `(Assinatura + Tempo de Revisão) / Volume` e separação entre assinaturas de aplicativos (Google AI Pro R$ 96,99/mês no Brasil, OpenAI US$ 20 EUA) e consumo sob demanda de APIs regido por TPM/RPM.
  - `transformar-site-conteudo-ativo-digital`: matriz de modelos de monetização e métricas de engajamento GA4 com simulação de cenários de conversão.
  - `seo-palavras-chave-conversoes`: taxonomia de intenções de busca e mapeamento da jornada até eventos de conversão no GA4.
  - `arquitetura-conteudo-seo-clusters`: metodologia de arquitetura de informação com páginas-pilar e clusters satélites contra canibalização de URLs.

### editorial-ten/AC-05 (Padronização rigorosa de frontmatter e metadados) — PASS
- Validação executada via `scripts/verify-spec-0016.mjs`:
  - `status: 'rascunho'` mantido em 10 de 10 artigos.
  - `revisao_editorial: 'aprovada'` em 10 de 10 artigos.
  - Slugs únicos e sem colisões.
  - Editorias válidas conforme taxonomia do portal.
  - Excerpt de exatamente 140 a 160 caracteres em todos os dez artigos (amplitude observada: 148 a 158 caracteres).
  - Capas existentes em `public/artigos/<slug>.jpeg` para todos os 10 artigos.
  - Autor padronizado (`Redação GradualInfo`).
  - `fontes_citadas` presentes com título e URL válida em todos os artigos.

### editorial-ten/AC-06 (Hierarquia semântica, legibilidade e preservação visual) — PASS
- Hierarquia estrita: exatamente 1 `h1` em cada página, seções em `h2`, subseções `h3` exclusivamente dentro de suas seções `h2`.
- Comentários em blocos de código com `# ` não interferem na árvore de headings HTML.
- Capas mantêm `alt=""` para evitar redundância de leitura de tela conforme WCAG.
- 100% de integridade preservada nos 8 arquivos de código do leitor contra o baseline de preservação.

### editorial-ten/AC-07 (Relatório datado e ordem editorial recomendada dos 16 artigos) — PASS
- Relatório `docs/reviews/2026-10-12-1520-0016-revisao-editorial-dez-rascunhos.md` registra a matriz factual completa e a ordem recomendada de leitura para os 16 artigos estruturada em 4 trilhas:
  1. Fundamentos de Performance e Otimização Web (artigos 1 a 4).
  2. Engenharia de Aplicação, Borda e Confiabilidade (artigos 5 a 8).
  3. Inteligência Artificial e Produtividade em Desenvolvimento (artigos 9 a 12).
  4. Ativos Digitais, Estratégia de Conteúdo e Negócio (artigos 13 a 16).
- A recomendação não atribui datas futuras de publicação nem executa qualquer ação de deploy.

### editorial-ten/AC-08 (Sincronização do catálogo local e conferência das 16 rotas) — PASS
- `scripts/sync-editorial.mjs` gerou o catálogo `lib/editorial/local-posts.json` com exatamente 16 artigos, slugs únicos e capas existentes em `public/artigos/`.
- `scripts/verify-editorial-parity.mjs` confirmou 100% de paridade campo a campo entre os arquivos Markdown e o catálogo JSON.
- Todas as 16 rotas `/artigos/[slug]` responderam com HTTP 200 OK no servidor local de desenvolvimento (processo `task-2633` com Next 16 e Turbopack).
- Nenhum envio ao Sanity Studio e nenhum deploy na Cloudflare foi disparado.

### editorial-ten/AC-09 (Separação estrita de aprovação editorial e status de publicação) — PASS
- Todos os 10 artigos cumpriram AC-02 a AC-06 e foram aprovados editorialmente no frontmatter (`revisao_editorial: 'aprovada'`).
- `status: 'rascunho'` permanece rigorosamente em todos os dez artigos.
- Publicação no Sanity Studio (`production`) e deploy na Cloudflare permanecem desacoplados como etapas futuras sob decisão do proprietário.

---

## 2. Testes Automatizados e Confiabilidade
- Vitest unit suite: 56 arquivos de teste, 593 testes aprovados (exit code 0).
- Verificação estrutural da Spec 0016 (`scripts/verify-spec-0016.mjs`): 10/10 artigos aprovados (exit code 0).
- Verificação de paridade de catálogo (`scripts/verify-editorial-parity.mjs`): 16/16 artigos validados com 100% de paridade (exit code 0).

