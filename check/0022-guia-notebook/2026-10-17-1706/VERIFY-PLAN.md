# Plano de Verificação: 0022. Guia do notebook para estudar programação

- **Date**: 2026-10-17 17:06, America/Sao_Paulo.
- **Spec**: [0022 Accepted](../../docs/specs/2026-10-16-2350-0022-guia-notebook-estudar-programacao.md) (sha256: d85ddf6f264879fe63b01a1d95dc5eb99fbafebeab584e84451cb0be68c2ee04).
- **Status**: Not run (plano derivado para execução pelo /check verify).
- **Feature**: N do MVP (docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md).

## Passos observáveis por critério de aceite

### jornada/AC-01

- **Critério**: O guia existe como rascunho versionado em docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md com front matter completo (title, slug, editoria Tecnologia, excerpt, cover_image /artigos/guia-notebook-estudar-programacao.jpeg, author Redação GradualInfo, status rascunho, published_at nulo e fontes_citadas) e corpo Markdown de 2.000 a 3.000 palavras.
- **Como observar**: Executar verificação programática do arquivo, validando presença de todos os campos escalares no front matter, lista de fontes citadas e contagem de palavras do corpo no intervalo [2000, 3000].
- **Resultado esperado**: Todos os campos válidos e corpo com 2994 palavras.

### jornada/AC-02

- **Critério**: O corpo apresenta uma matriz de critérios objetivos (CPU, memória, armazenamento, bateria, tela e orçamento) com pontos de corte por perfil de uso (Iniciante, Intermediário, Avançado), permitindo ao leitor localizar seu caso (manter, melhorar, comprar).
- **Como observar**: Inspecionar a tabela Markdown do rascunho e conferir se todos os 6 componentes possuem pontos de corte e se os perfis estão caracterizados.
- **Resultado esperado**: Tabela com critérios para CPU, RAM, Armazenamento, Bateria, Tela e Faixa de Custo em todos os perfis.

### jornada/AC-03

- **Critério**: O guia fecha com um fecho curto por caminho: de 3 a 5 ações concretas para cada resultado (manter, melhorar, comprar), executáveis por quem já programa e é novo em hardware.
- **Como observar**: Inspecionar as três subseções do item 6 ("Se você vai MANTER", "Se você vai MELHORAR", "Se você vai COMPRAR") e contar os itens de ação numerados.
- **Resultado esperado**: Exatamente 4 ações práticas numeradas para cada uma das três opções.

### jornada/AC-04

- **Critério**: Cada afirmação técnica é ancorada em fonte primária listada em fontes_citadas com título e URL, e o título registra a data de consulta; mínimo de 5 fontes.
- **Como observar**: Inspecionar a lista fontes_citadas no front matter, conferir links de documentações oficiais e validar o padrão "(consultado em AAAA-MM-DD)".
- **Resultado esperado**: 6 fontes primárias válidas (VS Code, Docker, JetBrains, Apple, Ubuntu, Node.js), todas com sufixo de data de consulta.

### jornada/AC-05

- **Critério**: Preços e marcas aparecem como faixas e características, sem preço fixo nem recomendação nominal de modelo; quando um valor é citado, carrega contexto temporal explícito.
- **Como observar**: Varrer o texto em busca de menções a preços e marcas para certificar ausência de modelos fechados ou preços fixos.
- **Resultado esperado**: Faixas em reais referenciadas explicitamente a 2026 e menções a especificações técnicas abertas (ex: processador com 4 a 6 núcleos, painel IPS).

### jornada/AC-06

- **Critério**: O rascunho passa por revisão do proprietário antes de qualquer publicação; a publicação acontece no Sanity (dataset production) com slug, excerpt, editoria, capa e fontes_citadas preenchidos, pelo fluxo editorial vigente.
- **Como observar**: Submeter o rascunho à apreciação do proprietário; validar integridade de campos no catálogo local e no payload do Sanity.
- **Resultado esperado**: Rascunho aprovado para publicação e registrado no fluxo editorial.

### jornada/AC-07

- **Critério**: Com o guia publicado, a home o exibe conforme a posição por data e /artigos/{slug} renderiza título, resumo, capa, corpo Markdown com a matriz em tabela larga sem quebrar o layout, fontes citadas ao final e metadados de SEO conformes aos contratos vigentes.
- **Como observar**: Renderizar a rota /artigos/guia-notebook-estudar-programacao em navegador real ou testes de componente, inspecionando tabela, imagem de capa e JSON-LD.
- **Resultado esperado**: Layout sem quebra horizontal, capa resolvida e fontes visíveis.

### jornada/AC-08

- **Critério**: Antes da publicação, o guia é visível apenas em preview ou leitura local; leitor anônimo vê o guia somente depois de publicado, e remover a publicação o retira da home e da página.
- **Como observar**: Validar status rascunho e published_at nulo no catálogo, conferindo isolamento em requisições anônimas de produção.
- **Resultado esperado**: Post não vaza para leitores anônimos sem publicação explícita.

### jornada/AC-09

- **Critério**: O tom e o público ficam fixados no rascunho: leitor que já programa mas é novo em hardware, com glossário curto de termos técnicos na primeira ocorrência e sem explicações de programação básica.
- **Como observar**: Inspecionar a seção de glossário inicial e o vocabulário das seções técnicas.
- **Resultado esperado**: Glossário presente com 8 termos fundamentais e explicações focadas em impacto para desenvolvimento de software.

### jornada/AC-10

- **Critério**: A entrega registra evidência na árvore avaliada: rascunho revisado e guia observado, com registro do que não foi observado.
- **Como observar**: Coleta de artefatos em check/ e docs/reviews/evidence/ com hashes SHA-256 no ciclo /check verify.
- **Resultado esperado**: Evidências empíricas completas registradas.
