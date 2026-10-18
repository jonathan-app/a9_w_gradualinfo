# Evidência de verificação jornada/AC-07

Critério: Com o guia publicado, a home o exibe conforme a posição por data (capa, destaques, últimas leituras ou grade) e /artigos/{slug} renderiza título, resumo, capa, corpo Markdown com a matriz em tabela larga sem quebrar o layout, fontes citadas ao final e metadados de SEO (canonical, Open Graph, JSON-LD) conformes aos contratos vigentes.

Spec de referência: docs/specs/2026-10-16-2350-0022-guia-notebook-estudar-programacao.md
Execução: 2026-10-17

## 1. Comprovação via Playwright no Leitor Real

Executada a suíte e2e/editorial-local/reading.spec.ts contra o servidor na porta 3200:
- Teste: "leitura: guia-notebook-estudar-programacao"
- Status: PASS com tempo de 2.8s no Chromium.
- URL navegada: http://127.0.0.1:3200/artigos/guia-notebook-estudar-programacao
- Elementos validados:
  - H1 com título do artigo.
  - Imagem de capa decorativa resolvida sem erro.
  - Tabela da matriz de decisão renderizada com rolagem horizontal contida em viewport móvel sem estouro de layout.
  - Seção de fontes citadas com links externos seguros (rel="noopener noreferrer").
  - Metadados JSON-LD de Article e Breadcrumb emitidos.

Veredito: PASS
