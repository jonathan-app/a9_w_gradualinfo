# 0022. Guia do notebook para estudar programação

**Date**: 2026-10-16 23:50, America/Sao_Paulo.
**Status**: Accepted
**Decision source**: Aceite formal do proprietário concedido em 2026-10-16, após apresentação do texto final em painel de confirmação. Decisões de design confirmadas em conversa /architect de 2026-10-16 (rodadas de requisitos, modelo de dados e referências).

## Summary

O portal vai publicar o guia de decisão "manter, melhorar ou comprar um notebook para estudar programação". O guia nasce como rascunho versionado no repositório, passa pela revisão do proprietário e é publicado no Sanity como qualquer artigo. Nenhum schema, endpoint ou ferramenta nova: é conteúdo real na primeira jornada editorial do escopo, com critérios objetivos, fontes primárias com data e um fecho executável por caminho.

## Context

O escopo do MVP define a primeira jornada como um artigo completo e real sobre manter, melhorar ou comprar um notebook para estudar programação, com critério explícito, fontes citadas e um próximo passo que o leitor consegue executar. A precondição está satisfeita em 2026-10-16: há 6 artigos publicados e leitura autenticada validada no Sanity, e falta escrever e publicar o guia.

As forças que moldam esta entrega: o público do site é formado por estudantes de programação e desenvolvedores em evolução, que decidem compra de hardware sem vocabulário técnico; o pipeline editorial vigente publica pelo Sanity (spec 0006) e o template do artigo entrega render, fontes e SEO sem código novo (spec 0010, Revisão 2); os rascunhos do portal já vivem versionados em `docs/rascunhos-editoriais/` com front matter e revisão editorial (specs 0015 e 0016).

Sem esta entrega, a jornada prometida no escopo não existe e o portal depende de conteúdo genérico para cumprir a função de tecnologia para estudar programação. Nada aqui autoriza mudar layout, sanitização, cache, rotas ou o modelo de publicação; tudo isso permanece regido pelos contratos vigentes.

## Requirements

**User stories**:

- Como leitor que estuda programação, quero decidir com critérios se mantenho, melhoro ou compro o meu notebook, para investir certo sem achismo.
- Como proprietário, quero publicar o guia pelo fluxo editorial existente, para cumprir a primeira jornada do escopo sem tocar no layout aprovado.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **jornada/AC-01**: O guia existe como rascunho versionado em `docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md`, com front matter completo (title, slug, editoria Tecnologia, excerpt, cover_image `/artigos/guia-notebook-estudar-programacao.jpeg`, author Redação GradualInfo, status rascunho, published_at nulo e fontes_citadas) e corpo Markdown de 2.000 a 3.000 palavras.
- **jornada/AC-02**: O corpo apresenta uma matriz de critérios objetivos (CPU, memória, armazenamento, bateria, tela e orçamento) com pontos de corte por perfil de uso, e o leitor consegue localizar nela o próprio caso (manter, melhorar ou comprar).
- **jornada/AC-03**: O guia fecha com um fecho curto por caminho: de 3 a 5 ações concretas para cada resultado (manter, melhorar, comprar), executáveis por quem já programa e é novo em hardware.
- **jornada/AC-04**: Cada afirmação técnica é ancorada em fonte primária (fabricante ou documentação oficial) listada em fontes_citadas com título e URL, e o título registra a data de consulta; mínimo de 5 fontes.
- **jornada/AC-05**: Preços e marcas aparecem como faixas e características, sem preço fixo nem recomendação nominal de modelo; quando um valor é citado, carrega contexto temporal explícito.
- **jornada/AC-06**: O rascunho passa por revisão do proprietário antes de qualquer publicação; a publicação acontece no Sanity (dataset production) com slug, excerpt, editoria, capa e fontes_citadas preenchidos, pelo fluxo editorial vigente.
- **jornada/AC-07**: Com o guia publicado, a home o exibe conforme a posição por data (capa, destaques, últimas leituras ou grade) e `/artigos/{slug}` renderiza título, resumo, capa, corpo Markdown com a matriz em tabela larga sem quebrar o layout, fontes citadas ao final e metadados de SEO (canonical, Open Graph, JSON-LD) conformes aos contratos vigentes.
- **jornada/AC-08**: Antes da publicação, o guia é visível apenas em preview ou leitura local; leitor anônimo vê o guia somente depois de publicado, e remover a publicação o retira da home e da página.
- **jornada/AC-09**: O tom e o público ficam fixados no rascunho: leitor que já programa mas é novo em hardware, com glossário curto de termos técnicos na primeira ocorrência e sem explicações de programação básica.
- **jornada/AC-10**: A entrega registra evidência na árvore avaliada: rascunho revisado e guia publicado observados na home e na página do artigo, com fontes visíveis; nada é declarado PASS sem observação direta, e a verificação formal pertence ao ciclo /check.

## Options considered

### Opção 1: Artigo único com rascunho local e publicação no Sanity

Um guia de decisão único, versionado como rascunho no repositório e publicado pelo fluxo editorial existente.

**Pros**:

- Menor custo e zero código novo: usa o pipeline consolidado e o template do artigo.

**Cons**:

- Sem interatividade; manutenção futura do texto é manual.

### Opção 2: Série de artigos por caminho (manter, melhorar, comprar)

Três artigos curtos, um por resultado, com um artigo índice.

**Pros**:

- Cada peça é menor e mais páginas ficam indexáveis.

**Cons**:

- Fragmenta a decisão única que o escopo pede e multiplica o custo editorial.

### Opção 3: Guia interativo ou ferramenta de decisão

Uma tela interativa onde o leitor responde perguntas e recebe o caminho.

**Pros**:

- Experiência diferenciada e reutilizável para outros guias.

**Cons**:

- Exige contrato de UI, componentes e estado novos, fora do template aprovado e do escopo desta fatia.

## Decision

**Chosen option**: Opção 1. Um artigo único, escrito como rascunho versionado, revisado pelo proprietário e publicado no Sanity pelo fluxo editorial existente.

**Decisões recomendadas pelo autor** (itens que couberam a mim, com alternativa registrada):

- Título "Manter, melhorar ou comprar: o guia do notebook para estudar programação" e slug `guia-notebook-estudar-programacao`: nome estável e alinhado ao escopo; alternativa: slug longo `manter-melhorar-comprar-notebook-estudar-programacao`.
- Data de consulta registrada como sufixo no título de cada fonte, no formato "(consultado em AAAA-MM-DD)": o schema de fontes_citadas não tem campo de data e o modelo confirmado dispensa migração; alternativa: nota de data no corpo do guia.
- Mínimo de 5 fontes primárias: proporcional ao tamanho e ao peso técnico do guia; alternativa: 3, como em rascunhos existentes.
- Autoria exibida "Redação GradualInfo": padrão dos rascunhos e do catálogo; alternativa: nome próprio do proprietário.
- Fecho com subseções "Se você vai manter", "Se você vai melhorar" e "Se você vai comprar", de 3 a 5 ações cada; alternativa: lista única ordenada por esforço.

## Rationale

A força decisiva é o escopo: a primeira jornada pede um guia real e publicável, não uma superfície nova. O caminho rascunho local mais Sanity já foi exercitado pelas specs 0015 e 0016, e o template do artigo (0010, Revisão 2) entrega render, fontes citadas e SEO sem código novo, o que mantém o risco perto de zero para o layout aprovado. A série de artigos fragmentaria a decisão central e multiplicaria o custo editorial; o guia interativo exigiria contrato de UI que esta fatia não autoriza.

## Feature design

**Data model sketch**:

- Rascunho versionado: `docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md`, front matter YAML com title (req), slug (req, kebab), editoria (req, Tecnologia), excerpt (req, uma a duas frases), cover_image (req, `/artigos/<slug>.jpeg`), author (req), status (rascunho), published_at (nulo até publicar) e fontes_citadas (lista de {titulo, url}); corpo Markdown.
- Documento Sanity (schema existente, sem migração): title, slug, excerpt, editoria, body (Markdown), fontes_citadas (lista de {titulo, url}), cover_image_url e published_at; o estado de publicação usa o motor de rascunhos do Sanity.
- Capa: arquivo `public/artigos/guia-notebook-estudar-programacao.jpeg`, fornecido pelo proprietário.

**State transitions**:

- rascunho local (status rascunho, invisível ao público) → aprovado pelo proprietário (revisão factual e editorial concluída) → publicado no Sanity (published_at preenchido, visível na home e no artigo) → despublicado (sai da home e da página; permanece no Sanity como não publicado).

**API surface**:

Sem endpoints novos. Publicação e despublicação pelo Sanity Studio, fluxo vigente da spec 0006; leitura pública pelas rotas existentes `/` e `/artigos/[slug]`.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action                     | Value produced / displayed                    | Source                                                                    |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Redigir o rascunho         | title, slug, excerpt, editoria, capa e fontes | front matter do rascunho, conforme decisões desta spec                    |
| Redigir matriz e fecho     | critérios, cortes e ações                     | corpo do rascunho, ancorado em fontes_citadas                             |
| Registrar data de consulta | "(consultado em AAAA-MM-DD)"                  | sufixo no título da fonte, decisão recomendada desta spec                 |
| Publicar                   | published_at e visibilidade                   | Sanity Studio pelo proprietário, fluxo da spec 0006                       |
| Exibir capa                | URL aprovada                                  | `approvedCoverImageUrl` sobre cover_image_url (`lib/editorial-images.ts`) |
| Exibir na home             | posição por data                              | getPublishedPosts com limite 60, espaços do AC-01 da 0010 Revisão 2       |
| Exibir SEO                 | canonical, Open Graph, JSON-LD                | template do artigo (0010 Revisão 2, AC-08, e spec 0006)                   |

**Key invariants**:

- Leitor anônimo nunca vê rascunho.
- Toda fonte em fontes_citadas tem título e URL.
- O guia publicado tem slug único, excerpt, editoria e capa válida pelo resolvedor de imagens.
- A matriz não recomenda marca ou modelo nominal.

**Security model**:

Conteúdo público sem dado sensível. Escrita apenas pelo proprietário via Sanity Studio, com credencial fora do repositório; nenhum segredo novo entra no código ou na árvore.

**Configuration required**: nenhuma variável nova. A publicação usa a credencial existente do Studio, fora do repositório.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: rascunho completo revisado e publicado; home exibe o guia e o artigo renderiza com matriz, fecho e fontes, verifies **jornada/AC-01** a **jornada/AC-07** e **jornada/AC-09**.
- Failure case: rascunho não publicado não aparece na home nem em `/artigos/{slug}` para leitor anônimo, verifies **jornada/AC-08**.
- Failure case: capa ausente ou URL rejeitada produz bloco neutro no card e no artigo, sem quebrar texto e link, verifies **jornada/AC-07**.
- Traceability: rascunho revisado e artigo publicado observados na árvore avaliada, com registro do que não foi observado, verifies **jornada/AC-10**.

## Build plan

Abordagem Tracer Bullet: a fatia atravessa redação, revisão e publicação de ponta a ponta, sem código novo.

1. Redigir o rascunho completo em `docs/rascunhos-editoriais/guia-notebook-estudar-programacao.md` (front matter mais corpo com matriz e fecho), satisfies **jornada/AC-01**, **jornada/AC-02**, **jornada/AC-03**, **jornada/AC-05**, **jornada/AC-09**
2. Pesquisar e fechar as fontes primárias com data de consulta, mínimo de 5, satisfies **jornada/AC-04**
3. Revisão do proprietário do rascunho (factual e editorial), satisfaz **jornada/AC-06** (primeira metade) e **jornada/AC-08**
4. Integrar a capa fornecida em `public/artigos/guia-notebook-estudar-programacao.jpeg`, satisfies **jornada/AC-06**
5. Publicar no Sanity pelo Studio com todos os campos e verificar home, artigo, fontes e SEO na árvore avaliada, satisfies **jornada/AC-06**, **jornada/AC-07**, **jornada/AC-10**

## Consequences

**Positive**:

- Primeira jornada do escopo cumprida com conteúdo real e o pipeline rascunho mais Sanity exercitado de novo.

**Negative / tradeoffs**:

- O guia envelhece: cortes de hardware e fontes mudam e exigem revisão futura; sem preço fixo, quem quer número exato fica com faixas.

**Neutral**:

- Uma capa nova entra em `public/artigos/`; a edição futura do guia passa a ser conteúdo no Sanity.

## Follow-up

- [ ] Verificação formal do guia publicado pertence ao ciclo /check, com captura na home e na página do artigo.
- [ ] Revisão editorial leve em 6 meses, ou antes se um critério citado mudar.
- [ ] O SEO aprofundado do guia acontece na Feature O, não aqui.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md`, Feature N (primeira jornada) e Slice 4.
- `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`, pipeline editorial vigente.
- `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`, Revisão 2, render, imagens e SEO do artigo.
- `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md`, padrão de revisão editorial dos rascunhos.
- `docs/rascunhos-editoriais/diagnosticar-erro-500-503-site.md`, padrão de qualidade e formato do front matter.
- `lib/sanity/client.ts`, campos do documento; `lib/editorial-images.ts`, resolvedor de capa; `lib/editorial/local-posts.ts`, leitura local.

**Practices & standards**:

- Critérios objetivos com ponto de corte por perfil de uso em guias de decisão de compra.
- Fontes primárias com data de consulta em conteúdo técnico.
- Rascunho versionado e revisão editorial antes de tornar conteúdo público.
