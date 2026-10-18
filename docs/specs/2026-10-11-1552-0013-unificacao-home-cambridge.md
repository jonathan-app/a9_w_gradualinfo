# Spec: Unificacao e Consolidacao da Home Cambridge

> Especificacao arquitetural para a unificacao definitiva da Home Cambridge na arvore ativa, consolidando os contratos de composicao, ancoras estaveis e limites de arquivos permitidos.

## Governanca

- ID: `0013-unificacao-home-cambridge`
- Status: Superseded pela spec 0010 (Revisao 2, 2026-10-16)
- Incorporada por: `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`
- Revisao: 3, data: 2026-10-14 08:15, responsavel: /architect + /check
- Escopo: `docs/scope/2026-10-08-2228-0001-mvp-portal-gradualinfo.md`, fatia editorial local
- Substitui: complementa e detalha os requisitos tecnicos da spec `docs/specs/2026-10-11-1416-home-cambridge.md`, incorporando as recomendacoes da auditoria `2026-10-11-1546-auditoria-plano-unificacao-cambridge.md`

## Contexto e Problema

A primeira versao da Home Cambridge ja esta integrada na arvore ativa em `app/page.tsx` e `components/home/`. Porem, a auditoria estatica identificou pontos criticos que precisam de alinhamento arquitetural antes de novas etapas:

1. O pacote de entrega `gradualinfo-home-cambridge/` ficou duplicado na raiz do projeto, com quatro arquivos divergentes da arvore ativa.
2. A grade superior do topo reserva espacos e colunas laterais vazias quando ha poucos artigos cadastrados (um, dois ou tres posts).
3. Os identificadores de ancora das editorias usavam indices numericos variaveis (`home-editoria-${index + 1}`), que mudam quando a ordem dos artigos se altera.
4. O botao de expansao nativa precisa deixar transparente que expande apenas o lote carregado em memoria, nao um arquivo historico completo.
5. Os oito arquivos protegidos do layout dos artigos estao preservados e precisam continuar estritamente intocados.

## Decisoes Tecnicas e Recomendacoes

### 1. Limites de Arquivos: Protegidos versus Permitidos

#### Arquivos Protegidos (intocaveis, preservacao byte a byte)

Nenhum destes arquivos pode ser modificado nesta entrega:

- `app/artigos/[slug]/page.tsx`
- `components/editorial/article-body.tsx`
- `components/editorial/article-share.tsx`
- `components/shared/editorial-cover.tsx`
- `lib/editorial/reading.ts`
- `app/globals.css`
- `app/layout.tsx`
- `components/layout/site-header.tsx`

O componente `EditorialStory` continua responsavel pela secao de outras leituras no artigo aprovado. Ele nao e codigo morto e deve ser mantido.

#### Arquivos Permitidos para `/develop`

Apenas os seguintes arquivos ativos podem receber alteracoes:

- `app/page.tsx` (geracao de identificadores estaveis de ancoras e tratamento de contagem)
- `components/home/home-teaser-list.tsx` (omissao de trilhas vazias e adaptacao para 1 a 3 posts)
- `components/home/home-section-grid.tsx` (rotulo claro do sumario de expansao e identificadores estaveis)
- `components/home/home-editorial.module.css` (ajuste de largura de grade para quando nao houver destaques laterais)
- `lib/utils/format.ts` ou utilitario simples de criacao de slug puro para normalizacao de texto
- `__tests__/unit/app-home.test.tsx` (cobertura dos novos cenarios de poucos posts e ancoras estaveis)
- `e2e/editorial-local/home-cambridge.spec.ts` (adequacao dos testes E2E para ancoras estaveis)
- `playwright.editorial.config.ts` (manutencao de configuracao confiavel com `browserName: 'chromium'`)

### 2. Tratamento da Composicao do Topo com Poucos Posts

A composicao em `components/home/` deve se comportar de forma harmonica em todas as contagens:

- **Zero posts**: renderiza `ArtigosVazios`, mantendo o cabecalho institucional.
- **Exatamente um post**: o hero ocupa a largura util total disponível do container de destaques (sem colunas laterais vazias ao lado).
- **Dois ou tres posts**: o hero ocupa a coluna principal; a coluna lateral exibe apenas os artigos existentes de destaque; se nao houver ultimas leituras (posts 4 a 7), a secao de ultimas leituras nao renderiza tags vazias nem reserva trilhas fantasmas no CSS.
- **Quatro a seis posts**: o topo completo renderiza o hero prioritario, ate dois destaques laterais com capa e a lista textual de ultimas leituras. O hero nunca se repete no bloco lateral do topo.

### 3. Ancoras Estaveis por Editoria

Os links no menu de navegacao da home e os titulos das secoes de editoria devem usar identificadores estaveis derivados do nome da propria editoria, em vez do indice numerico do loop:

- Formato padrao: `home-editoria-${slug(editoria)}` (por exemplo: `home-editoria-performance-seo`, `home-editoria-inteligencia-artificial`).
- A funcao de geracao de slug deve converter caracteres acentuados, espacos e simbolos em letras minusculas e tracos sem quebrar a renderizacao.
- Tratamento de colisao deterministico: se duas categorias gerarem o mesmo slug, acrescentar sufixo numerico estavel baseado na ordem alfabetica.

### 4. Escopo da Expansao "Ver mais"

Como ainda nao existe rota publica de paginacao ou busca por editoria no projeto:

- A tag nativa `<details>` e `<summary>` exibe inicialmente ate quatro cards de cada categoria.
- Quando houver cinco ou mais artigos carregados na categoria, o botao deve declarar textualmente o que faz, usando a frase: `Ver mais desta editoria`.
- O componente nao promete acesso a arquivos historicos remotos completos que nao estejam nos dados carregados.

### 5. Arquivamento Seguro do Pacote Duplicado

O diretorio `gradualinfo-home-cambridge/` sera movido para `scratch/entregas-arquivadas/gradualinfo-home-cambridge/` (ou caminho equivalente dentro de `scratch/`, que ja esta coberto no `.gitignore` e fora dos escopos de compilação).
A arvore principal na raiz continua sendo a unica fonte canonica.
Apos o arquivamento, as regras do `tsconfig.json`, `eslint.config.mjs` e `.prettierignore` serao revisadas para manter apenas exclusoes necessarias e limpas.

### 6. Evolução da Composição: Destaques 2×2 e Seção Própria de Últimas Leituras (Revisão 2)

Em evolução à casca original de Cambridge (que renderizava dois cards ao lado de uma coluna estreita de últimas leituras no topo), a composição da home foi atualizada e refinada estruturalmente:

1. **Bloco de Destaques 2×2:**
   - Ao lado da Matéria de Capa (`HomeHeroFeatured`), os destaques secundários passam a ser compostos por até quatro cards organizados em grade 2×2 (`HomeTeaserList` com duas colunas de até dois cards cada).
   - Cada card possui imagem de capa (`EditorialCover`), etiqueta de editoria, título com tipografia de destaque e byline (`PostByline`).
   - Em telas grandes (desktop >= 1024px), a segunda coluna de cards é separada da primeira por uma borda vertical (`var(--color-border)`).
2. **Seção Própria de "Últimas Leituras":**
   - O bloco de últimas leituras foi transferido para uma seção horizontal dedicada (`#ultimas-leituras`, `HomeLatestSection`), imediatamente abaixo do bloco principal de destaques e antes das editorias.
   - A seção possui cabeçalho editorial (`sectionHeader`), contador de artigos e grade horizontal responsiva de até 4 colunas em desktop com categoria, título clicável, resumo (`excerpt`) em até 3 linhas e byline.
3. **Comportamento Harmônico com Poucos Posts:**
   - **Zero posts:** renderiza `ArtigosVazios`, mantendo o cabeçalho institucional.
   - **Exatamente um post:** o hero ocupa 100% da largura útil (`highlightsSingle`), sem coluna lateral e sem espaços vazios.
   - **Dois ou três posts:** o hero ocupa a coluna principal (`1.6fr`); a coluna lateral exibe 1 ou 2 cards em coluna única (`sideColumnsSingle`, `highlightsSideSingle`), sem segunda coluna fantasma e sem seção de últimas leituras.
   - **Quatro ou cinco posts:** o hero e os 3 ou 4 destaques dividem a grade 2×2, sem exibir últimas leituras vazia.
   - **Seis ou mais posts:** os primeiros 5 posts alimentam o topo (hero + 4 destaques 2×2), e os posts 5 a 8 alimentam a seção de últimas leituras (até 4 artigos).
   - **Garantia de Não Repetição:** os fatiamentos (`posts[0]`, `posts.slice(1, 5)`, `posts.slice(5, 9)`) são estritamente disjuntos; a matéria de capa nunca se repete nos destaques ou nas últimas leituras.
4. **Preservação dos Arquivos Protegidos:**
   - A integridade dos 8 arquivos protegidos do layout editorial de leitura é mantida estritamente contra a baseline reconciliada (`preservados.json`), com a exceção documentada da reestilização do cabeçalho público da spec 0010 e navbar PrebuiltUI com letreiro inferior.

## Requisitos e Criterios de Aceite (ACs)

- [x] **cambridge/AC-01**: Quando houver apenas um post publicado, o hero ocupa a largura total da area de destaque sem espacos laterais vazios.
- [x] **cambridge/AC-02**: Quando houver entre dois e tres posts, a coluna lateral exibe apenas os destaques disponiveis, sem reservar trilha de ultimas leituras vazia.
- [x] **cambridge/AC-03**: Quando houver quatro ou mais posts, a composicao exibe o hero, os dois destaques com imagem e a lista de ultimas leituras sem duplicar o hero.
- [x] **cambridge/AC-04**: As ancoras da navegacao de editorias e os IDs das secoes utilizam identificadores estaveis baseados no nome da editoria, imunes a mudancas na ordem dos artigos.
- [x] **cambridge/AC-05**: Em categorias com mais de quatro posts, o botao de expansao nativa exibe o texto `Ver mais desta editoria` e revela os posts excedentes com suporte total a teclado e foco.
- [x] **cambridge/AC-06**: Os oito arquivos protegidos listados nesta spec continuam identicos byte a byte em relacao a `preservados.json` ou à baseline formalmente reconciliada.
- [x] **cambridge/AC-07**: O pacote de entrega duplicado e movido para `scratch/entregas-arquivadas/` e nenhum import do produto faz referencia a pastas de entrega.
- [x] **cambridge/AC-08**: A suite completa de validacao (`pnpm typecheck`, `pnpm lint`, `pnpm test:run` e `pnpm test:editorial`) executa e passa com sucesso.
- [x] **cambridge/AC-09**: A área de destaques secundários exibe grade 2×2 com até 4 cards com capa ao lado da matéria principal, sem repetição do hero.
- [x] **cambridge/AC-10**: A seção "Últimas leituras" funciona como seção horizontal própria com até 4 colunas em desktop, exibindo artigos disjuntos dos destaques.
- [x] **cambridge/AC-11**: Catálogos com poucos posts (1 a 5) adaptam a grade proporcionalmente sem colunas vazias ou caixas fantasmas.
- [x] **cambridge/AC-12**: Os 8 arquivos protegidos mantêm integridade byte a byte frente à baseline reconciliada.
- [x] **cambridge/AC-13**: A validação visual cobre Desktop e Celular nos temas Claro e Escuro para a Home e o Artigo de referência.

## Plano de Rollback

Se qualquer regressao visual ou funcional for detectada no artigo aprovado ou na home durante a execucao:

1. Restaurar os arquivos alterados em `components/home/` e `app/page.tsx` a partir do backup ou da versao anterior do Git.
2. Confirmar os hashes dos oito arquivos protegidos usando `preservados.json`.
3. Manter o historico do `workflow/STATE.md` intacto sem apagar registros anteriores.

## Delegacao

Esta especificacao fornece o contrato fechado e a matriz de permissoes para `/develop` implementar as correcoes na composicao, IDs estaveis e limpeza de pastas.
