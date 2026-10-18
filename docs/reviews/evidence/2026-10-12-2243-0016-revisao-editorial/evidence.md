# Evidência Empírica — Spec 0016 (Revisão Editorial dos Dez Novos Rascunhos)

**Data:** 2026-10-12 22:43 (America/Sao_Paulo)  
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
- Todas as afirmações técnicas, numéricas e comerciais foram verificadas contra documentações oficiais (Cloudflare Workers, Next.js, OpenTelemetry, OWASP Gen AI Security, NIST, Google Search Central, GA4, Dominican University / Western Psychological Association).
- Data de consulta registrada: 2026-10-12.
- Resultados classificados conforme vocabulário prescrito: `Confirmado`, `Desatualizado`, `Incorreto` ou `Não verificado`.
- Limites de Workers retificados para os valores oficiais vigentes: 10 ms CPU para plano Free, 30 s padrão (configurável até 5 min) para planos pagos, e 64 MiB sem compressão para tamanho de Worker.
- Estudo de Gail Matthews devidamente identificado como apresentado na **87th Convention of the Western Psychological Association** (WPA, Vancouver, 2007) e arquivado pelo repositório institucional da Dominican University (2015), discriminando 267 participantes recrutados e 149 concluintes (76% vs 43%), sem extrapolação para *body doubling*.

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
  - `sistema-produtividade-digital-sustentavel`: rotina de triagem e blocos de foco sustentável, com distinção empírica do estudo controlado de Gail Matthews (87th WPA 2007 / Dominican 2015, 267 recrutados, 149 concluintes).
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
- Reconciliação dos arquivos de suporte do leitor com o manifesto de Cambridge:
  - 7 arquivos com 100% de identidade byte a byte em relação ao manifesto de Cambridge (`scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json`).
  - 1 arquivo (`components/layout/site-header.tsx`) com exceção autorizada no escopo da spec 0010 (menu responsivo violeta e busca pública, hash `5db306f45a6921902a9c6203695fc7ee187bae739abd72b554b80b3a600b8c4d`), cuja baseline foi integralmente preservada sem edições durante a spec 0016.

### editorial-ten/AC-07 (Relatório datado e ordem editorial recomendada dos 16 artigos) — PASS
- Relatório `docs/reviews/2026-10-12-1520-0016-revisao-editorial-dez-rascunhos.md` registra a matriz factual completa e a ordem recomendada de leitura para os 16 artigos estruturada em 4 trilhas:
  1. Fundamentos de Performance e Otimização Web (artigos 1 a 4).
  2. Engenharia de Aplicação, Borda e Confiabilidade (artigos 5 a 8).
  3. Inteligência Artificial e Produtividade em Desenvolvimento (artigos 9 a 12).
  4. Ativos Digitais, Estratégia de Conteúdo e Negócio (artigos 13 a 16).
- A recomendação não atribui datas futuras de publicação nem executa qualquer ação de deploy.

### editorial-ten/AC-08 (Sincronização do catálogo local e conferência das rotas locais) — PASS
- `scripts/sync-editorial.mjs` gerou o catálogo `lib/editorial/local-posts.json` com exatamente 16 artigos, slugs únicos e capas existentes em `public/artigos/`.
- `scripts/verify-editorial-parity.mjs` confirmou 100% de paridade campo a campo entre os arquivos Markdown e o catálogo JSON.
- A Home (`http://127.0.0.1:3000/`) e todas as 16 rotas individuais `/artigos/[slug]` responderam com HTTP 200 OK no servidor local de desenvolvimento (processo `task-2633` com Next 16 e Turbopack). A rota genérica `/artigos` não existe na aplicação e não faz parte do contrato.
- Nenhum envio ao Sanity Studio e nenhum deploy na Cloudflare foi disparado.

### editorial-ten/AC-09 (Separação estrita de aprovação editorial e status de publicação) — PASS
- Todos os 10 artigos cumpriram AC-02 a AC-06 e foram aprovados editorialmente no frontmatter (`revisao_editorial: 'aprovada'`).
- `status: 'rascunho'` permanece rigorosamente em todos os dez artigos.
- Publicação no Sanity Studio (`production`) e deploy na Cloudflare permanecem desacoplados como etapas futuras sob decisão do proprietário.

---

## 2. Reconciliação Explícita com o Manifesto de Preservação (`preservados.json`)

| Arquivo Protegido                        | Hash Manifesto Cambridge (`preservados.json`)                      | Hash Vigente no Repositório                                        | Status de Reconciliação                                                               |
| :--------------------------------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `app/globals.css`                        | `7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae` | `7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `app/layout.tsx`                         | `4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562` | `4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `components/layout/site-header.tsx`      | `4bcc0df4c73a1af3f477c785b981768081c175c8aa49a14ac63eba6023639b6e` | `5db306f45a6921902a9c6203695fc7ee187bae739abd72b554b80b3a600b8c4d` | ⚠️ **EXCEÇÃO AUTORIZADA PELA SPEC 0010** (menu violeta/busca pública; preservado na 0016)|
| `app/artigos/[slug]/page.tsx`            | `74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155` | `74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `components/editorial/article-body.tsx`  | `1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f` | `1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `components/editorial/article-share.tsx` | `d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4` | `d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `components/shared/editorial-cover.tsx`  | `7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371` | `7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |
| `lib/editorial/reading.ts`               | `f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586` | `f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586` | ✓ 100% IDENTIDADE BYTE A BYTE                                                         |

---

## 3. Testes Automatizados e Confiabilidade
- Vitest unit suite: 56 arquivos de teste, 593 testes aprovados (exit code 0).
- Verificação estrutural da Spec 0016 (`scripts/verify-spec-0016.mjs`): 10/10 artigos aprovados (exit code 0).
- Verificação de paridade de catálogo (`scripts/verify-editorial-parity.mjs`): 16/16 artigos validados com 100% de paridade (exit code 0).

