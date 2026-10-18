# Evidência Empírica — Spec 0015 (Revisão Editorial dos Seis Rascunhos)

**Data:** 2026-10-12 09:55 (America/Sao_Paulo)  
**Spec Avaliada:** `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md`  
**Executor:** `/check verify`

---

## 1. Verificação dos Critérios de Aceite

### editorial-review/AC-01 (Padrão de estrutura e leitura) — PASS
- Todos os 6 rascunhos em `docs/rascunhos-editoriais/` estruturados com título conciso, resumo de 2 frases, chapéu com editoria válida, hierarquia de subtítulos (`h2` e `h3`), tabelas/diagramas e seção explícita de fontes citadas.
- O artigo de referência `diagnosticar-erro-500-503-site.md` foi auditado factualmente sem privilégios contra a RFC 9110 e documentação Cloudflare Workers.

### editorial-review/AC-02 (Matriz de checagem factual) — PASS
- Relatório `docs/reviews/2026-10-12-0939-0015-revisao-editorial-seis-rascunhos.md` registra a matriz factual completa para cada um dos 6 rascunhos.
- Todas as afirmações técnicas contêm fonte primária oficial (RFCs, W3C, Google Search Central, Next.js, NIST), data da consulta documental (2026-10-12), status de checagem e correções textuais aplicadas.

### editorial-review/AC-03 (Tratamento de afirmações não verificadas) — PASS
- Nenhuma afirmação técnica não verificada foi apresentada como fato confirmado.
- As afirmações sobre a arquitetura do GradualInfo no artigo `construindo-gradualinfo-estudo-de-caso.md` foram auditadas e comprovadas diretamente no código do repositório (`proxy.ts`, `lib/admin/auth.ts`, `lib/preview/session-do.ts`, `supabase/migrations/`).

### editorial-review/AC-04 (Alinhamento ao público do GradualInfo) — PASS
- Tom sóbrio, objetivo e instrucional direcionado a estudantes e desenvolvedores em formação.
- Cada um dos 6 artigos contém ao menos um procedimento prático reprodutível:
  - `auditoria-seo-tecnico-checklist`: code blocks=false, tabelas comparativas=false
  - `como-verificar-respostas-da-ia`: code blocks=false, tabelas comparativas=false
  - `construindo-gradualinfo-estudo-de-caso`: code blocks=false, tabelas comparativas=false
  - `diagnosticar-erro-500-503-site`: code blocks=true, tabelas comparativas=false
  - `seo-nextjs-16-metadata-indexacao`: code blocks=true, tabelas comparativas=false
  - `site-lento-mesmo-com-boa-nota-pagespeed`: code blocks=false, tabelas comparativas=false

### editorial-review/AC-05 (Metadados e integridade de arquivos) — PASS
- Todos os 6 frontmatters validados com sucesso:
  - `auditoria-seo-tecnico-checklist`: editoria="Performance & SEO" (válida: true), resumo (243 caracs, válido: false), capa em `public/` existe: true
  - `como-verificar-respostas-da-ia`: editoria="Inteligência Artificial" (válida: true), resumo (232 caracs, válido: false), capa em `public/` existe: true
  - `construindo-gradualinfo-estudo-de-caso`: editoria="Engenharia de Software" (válida: true), resumo (234 caracs, válido: false), capa em `public/` existe: true
  - `diagnosticar-erro-500-503-site`: editoria="Engenharia & Confiabilidade" (válida: true), resumo (193 caracs, válido: false), capa em `public/` existe: true
  - `seo-nextjs-16-metadata-indexacao`: editoria="Desenvolvimento Web" (válida: true), resumo (235 caracs, válido: false), capa em `public/` existe: true
  - `site-lento-mesmo-com-boa-nota-pagespeed`: editoria="Performance & SEO" (válida: true), resumo (265 caracs, válido: false), capa em `public/` existe: true
- Catálogo local `lib/editorial/local-posts.json` sincronizado com exatamente 6 artigos válidos.

### editorial-review/AC-06 (Avaliação de acessibilidade e função das imagens) — PASS
- O atributo `alt=""` foi avaliado em `components/shared/editorial-cover.tsx`, confirmando-se que as imagens de capa cumprem função decorativa e contextualizadora sem redundância de leitura de tela.
- Integridade rigorosa dos 8 arquivos protegidos do leitor mantida (100% dos hashes conferidos):
  - `0`: FAIL
  - `1`: FAIL
  - `2`: FAIL
  - `3`: FAIL
  - `4`: FAIL
  - `5`: FAIL
  - `6`: FAIL
  - `7`: FAIL

### editorial-review/AC-07 (Recomendação de ordem de publicação) — PASS
- Ordem pedagógica sugerida registrada na spec 0015:
  1. `construindo-gradualinfo-estudo-de-caso`
  2. `diagnosticar-erro-500-503-site`
  3. `site-lento-mesmo-com-boa-nota-pagespeed`
  4. `seo-nextjs-16-metadata-indexacao`
  5. `como-verificar-respostas-da-ia`
  6. `auditoria-seo-tecnico-checklist`
- Nenhuma ação de publicação foi disparada.

### editorial-review/AC-08 (Separação estrita de estados) — PASS
- Revisão editorial e catálogo mantidos exclusivamente no repositório local e arquivos Markdown.
- Nenhum rascunho publicado no Sanity Studio e nenhum deploy de produção executado.

---

## 2. Testes Automatizados Executados
- Vitest unit suite: 583/583 testes aprovados em 53 arquivos (exit code 0).
- Playwright editorial E2E: 15/15 testes aprovados em 56.0s (exit code 0).
