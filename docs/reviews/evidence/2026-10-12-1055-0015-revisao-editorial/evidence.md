# Evidência Empírica — Spec 0015 (Revisão Editorial dos Seis Rascunhos)

**Data:** 2026-10-12 10:55 (America/Sao_Paulo)  
**Spec Avaliada:** `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md`  
**SHA-256 da Spec:** `602237a17c2f0143ee2fb4e9070287827830d5c7336d1d1ff9186d256991e4a0`  
**Executor:** `/check review` & `/check verify`

---

## 1. Sequência Canônica de Sincronização e Hashes Finais

1. **Formatação Prettier:** Todos os seis arquivos Markdown em `docs/rascunhos-editoriais/` foram formatados previamente via `pnpm prettier --write`.
2. **Sincronização do Catálogo Local:** O script `node scripts/sync-editorial.mjs` foi executado sobre os arquivos finais formatados, gerando `lib/editorial/local-posts.json` com exatamente 6 artigos íntegros.
3. **Conferência de Igualdade:** 100% de correspondência entre os campos do frontmatter (`title`, `slug`, `excerpt`, `editoria`, `cover_image`) no catálogo e nos arquivos Markdown.
4. **Hashes Criptográficos Finais (SHA-256) dos Rascunhos Formatados:**
   - `auditoria-seo-tecnico-checklist.md`: `290fecad4ff40884b3cf5d14a3c76b6d06da5022798ef169e8b9ceaeab978771` (6.182 bytes)
   - `como-verificar-respostas-da-ia.md`: `68b25339cc94be6a3beb6facca6fbd713504fb48192221ea6336a65d1a77e65e` (8.049 bytes)
   - `construindo-gradualinfo-estudo-de-caso.md`: `aebf46991b43a98d88cfacb0b30f13614c0a300f54148fb16ed868cc27e448e9` (7.169 bytes)
   - `diagnosticar-erro-500-503-site.md`: `b4ed6248f29a47fb702247cc5f3839b1a4fe70c4941bedfb08533918719f671c` (7.207 bytes)
   - `seo-nextjs-16-metadata-indexacao.md`: `e8a962bade9cf1fed75c2eb048112cf9a6cef21b76dce63fa074db2d9de5e816` (7.473 bytes)
   - `site-lento-mesmo-com-boa-nota-pagespeed.md`: `a502e38b56d9749e3c4ad5f0cdaf15862e25dc75e8150af54d9deb976016f5d7` (6.583 bytes)

---

## 2. Verificação dos Critérios de Aceite

### editorial-review/AC-01 (Padrão de estrutura e leitura) — PASS
- Todos os 6 rascunhos em `docs/rascunhos-editoriais/` estruturados com título conciso, resumo de 2 frases, chapéu com editoria válida, hierarquia de subtítulos (`h2` e `h3`), tabelas/diagramas e seção explícita de fontes citadas.
- O artigo de referência `diagnosticar-erro-500-503-site.md` foi auditado factualmente sem privilégios contra a RFC 9110 e documentação Cloudflare Workers.

### editorial-review/AC-02 (Matriz de checagem factual) — PASS
- Relatório `docs/reviews/2026-10-12-0939-0015-revisao-editorial-seis-rascunhos.md` registra a matriz factual completa para cada um dos 6 rascunhos.
- Citações das fontes primárias verificadas e retificadas:
  - RFC 9110 (Semântica de erros HTTP 500 e 503).
  - Next.js 16 (`not-found.js` sob streaming vs non-streaming, HTTP 200 vs 404).
  - NIST AI 600-1 (Seção 3.1, p. 9 para Confabulação; Seção 3.2, pp. 10–11 para Human-AI Configuration / Sycophancy).
  - NIST AI 100-1 (GOVERN 1.2, 2.1 e 3.2 devidamente identificados como paráfrase e síntese analítica).

### editorial-review/AC-03 (Tratamento de afirmações não verificadas) — PASS
- Nenhuma afirmação técnica não verificada foi apresentada como fato confirmado.
- As afirmações sobre a arquitetura do GradualInfo no artigo `construindo-gradualinfo-estudo-de-caso.md` foram delimitadas entre implementação/configuração local comprovada e runtime de produção pendente de deploy.

### editorial-review/AC-04 (Alinhamento ao público do GradualInfo) — PASS
- Tom sóbrio, objetivo e instrucional direcionado a estudantes e desenvolvedores em formação.
- Procedimentos práticos reprodutíveis e exercícios de diagnóstico presentes nos seis textos.

### editorial-review/AC-05 (Metadados e integridade de arquivos) — PASS
- Frontmatters validados e em estrita sincronia com `lib/editorial/local-posts.json`.
- Todas as 6 capas existem em `public/` e são referenciadas com URLs canônicas.

### editorial-review/AC-06 (Avaliação de acessibilidade e função das imagens) — PASS
- Atributo `alt=""` mantido para as capas, cuja função é decorativa/contextualizadora sem prejuízo informacional.
- Integridade rigorosa dos 8 arquivos protegidos do leitor mantida (100% dos hashes conferidos e idênticos a `preservados.json`).

### editorial-review/AC-07 (Recomendação de ordem de publicação) — PASS
- Ordem pedagógica sugerida registrada:
  1. `construindo-gradualinfo-estudo-de-caso`
  2. `diagnosticar-erro-500-503-site`
  3. `site-lento-mesmo-com-boa-nota-pagespeed`
  4. `seo-nextjs-16-metadata-indexacao`
  5. `como-verificar-respostas-da-ia`
  6. `auditoria-seo-tecnico-checklist`

### editorial-review/AC-08 (Separação estrita de estados) — PASS
- Revisão editorial e catálogo mantidos exclusivamente no repositório local.
- Nenhum rascunho publicado no Sanity Studio e nenhum deploy de produção executado.

