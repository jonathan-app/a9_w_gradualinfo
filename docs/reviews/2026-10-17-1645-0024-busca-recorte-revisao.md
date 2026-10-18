# Revisão (modo review): Feature P, Busca textual com recorte por editoria e tolerância a erros de digitação (spec 0024)

- Data: 2026-10-17 16:45, America/Sao_Paulo.
- Spec: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md (Accepted; SHA-256 95cabf6a86e09f1ff5015f43824c265811f4c9d11f4554b66e0693d2d002c635).
- Modo: review (auditoria imparcial do diff, dimensões de modes/review.md), complementar ao modo verify aprovado em docs/reviews/2026-10-17-1615-0024-busca-recorte-verificacao.md.
- Artefato de decisão: check/0024-busca-recorte/2026-10-17-1645-review/results.json (decisão da máquina gravada no próprio artefato).

## 1. Escopo auditado

Auditoria integral do código fonte e do diff dos arquivos que compõem a Feature P:

- lib/utils/fuzzy-match.ts (algoritmo Levenshtein Damerau nativo, tolerância proporcional e correspondência em palavras)
- lib/utils/search-posts.ts (normalização, filtros por categoria, pontuação ponderada de relevância, desempate e paginação)
- app/busca/page.tsx (leitura e sanitização de query string, pílulas de editoria, lista paginada e estados honestos)
- app/busca/search.module.css (estilos da interface de busca, acessibilidade e responsividade)
- Testes automatizados: **tests**/unit/lib/search-posts.test.ts, **tests**/unit/app-busca.test.tsx e e2e/search-flow.spec.ts

A leitura foi realizada diretamente sobre os arquivos e testes reais do repositório.

## 2. Resultado da Autoridade de Decisão

0 BLOCKER, 0 WARNING, 2 NIT.
Os 9 critérios de aceite (busca/AC-01 a busca/AC-09) permanecem revalidados com PASS e evidências auditadas pela autoridade scripts/check-decision.mjs.

| Severidade | Contagem |
| ---------- | -------- |
| BLOCKER    | 0        |
| WARNING    | 0        |
| NIT        | 2        |

## 3. Dimensões auditadas

### 3.1 Correção (bugs)

Nenhum defeito bloqueante identificado.

- Termos de busca vazios ou compostos exclusivamente por espaços retornam estado inicial convidativo sem executar consultas desnecessárias.
- Limite de 120 caracteres aplicado no servidor com corte determinístico e sanitização de borda.
- Divisão em múltiplos termos opera como conjunção lógica, exigindo que todas as palavras pesquisadas correspondam a pelo menos um dos quatro campos (título, resumo, editoria ou corpo).
- Paginação lida com limites de borda: totalMatches igual a zero resulta em totalPages zero e página corrente 1 sem causar erros de divisão ou índices negativos.
- Classificação determinística com desempate por data mais recente e preservação da ordem de inserção do catálogo.

### 3.2 Segurança

Nenhuma vulnerabilidade ou segredo identificado.

- A rota /busca é pública e não requer credenciais administrativas.
- Termos de pesquisa são sanitizados contra caracteres de controle e passam por escape padrão do React e encodeURIComponent nos links gerados.
- Sem novas rotas de mutação, chamadas de banco de dados SQL brutas ou injeção de comandos.

### 3.3 Performance

Operação em memória leve e contida.

- O algoritmo Levenshtein Damerau opera sobre tokens individuais com guarda prévia de diferença de comprimento (Math.abs(word.length - term.length) > maxDist), evitando cálculos de matriz desnecessários.
- A filtragem e ranqueamento ocorrem no servidor em tempo sub-milissegundo para o volume atual de artigos.
- Zero dependências npm adicionadas ao projeto.

### 3.4 Acessibilidade (a11y)

Conformidade comprovada.

- O campo de pesquisa conta com label textual acessível via classe .sr-only.
- A navegação de pílulas utiliza aria-label="Filtrar por editoria" e sinaliza a categoria ativa com aria-current="page" e data-active="true".
- A paginação utiliza links navegáveis para páginas ativas e elementos span com aria-disabled="true" para botões inativos, evitando links quebrados.
- Controles com foco visível e estilos adaptados para navegadores com preferência de movimento reduzido (prefers-reduced-motion).

### 3.5 Convenções do projeto e Ponytail

- Todos os arquivos recém-criados possuem cabeçalhos JSDoc completos com @fileoverview, @module, @description e @dependencies em português.
- TypeScript estrito sem nenhum uso de any, @ts-ignore ou @ts-expect-error.
- Código livre de console.log ou chamadas de depuração residuais.
- Reuso estrito do modelo Post de lib/services/posts sem criação de abstrações supérfluas.

### 3.6 Alinhamento com a spec

A implementação respeita rigorosamente as diretrizes da Option 1 da Spec 0024:

- Módulo puro em TypeScript sem custos externos.
- Preservação da diretiva robots noindex, follow conforme a Spec 0023.
- Tratamento honesto de indisponibilidade editorial sem falhas silenciosas.

## 4. Achados (NITs)

1. NIT 1: Na folha de estilos app/busca/search.module.css, cores de marca utilizam valores hexadecimais como #7562d9 e #5142c8 em vez de referenciar diretamente os tokens CSS var(--color-brand-500) e var(--color-brand-600) definidos em DESIGN.md e app/globals.css. Sugestão: unificar esses seletores com variáveis CSS em futura rodada de polimento visual.
2. NIT 2: Em lib/utils/search-posts.ts, o conjunto de editorias únicas disponíveis é recalculado a cada requisição de busca a partir dos artigos fornecidos. O processamento é imperceptível para o volume atual, mas pode ser otimizado com cache estático caso o catálogo escale expressivamente.

## 5. Decisão da Máquina

Execução de `node scripts/check-decision.mjs check/0024-busca-recorte/2026-10-17-1645-review/results.json --spec docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md` com código de saída 0:

- approved: true
- verdict: APROVADO
- counts: totalACs 9, PASS 9, FAIL 0, UNVERIFIABLE 0, missingEvidence 0, BLOCKER 0, WARNING 0
- reasons: []

Veredito do modo review: APROVADO.
