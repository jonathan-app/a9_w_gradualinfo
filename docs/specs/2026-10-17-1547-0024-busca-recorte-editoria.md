# 0024. Busca textual com recorte por editoria e tolerância a erros de digitação

**Date**: 2026-10-17
**Status**: Accepted
**Decision source**: Aprovado pelo proprietário em 2026-10-17 via /architect

## Summary

Esta especificação define o aprimoramento da rota pública de pesquisa de artigos em /busca. O leitor poderá encontrar publicações mesmo digitando termos com pequenos erros ortográficos ou de digitação, combinando tolerância por distância de edição com filtragem direta por editoria. A solução opera inteiramente em TypeScript puro sobre o catálogo de artigos em memória no servidor, preservando alta velocidade e dispensando novos serviços externos ou custos adicionais de infraestrutura.

## Context

O portal editorial Gradualinfo conta com uma implementação inicial de pesquisa textual em app/busca/page.tsx. Essa rotina atual compara apenas substrings exatas normalizadas sem diferenciar maiúsculas ou acentos. Leitores que digitam palavras com pequenos deslizes de digitação ou trocas de letras recebem zero resultados. Além disso, leitores interessados em áreas específicas como Inteligência Artificial ou Segurança não dispõem de filtros diretos por editoria dentro da interface de busca.

A ausência de filtros e tolerância a digitação reduz o engajamento e prejudica a descoberta do acervo editorial. É essencial prover uma experiência de busca amigável, rápida e aderente aos padrões de acessibilidade e ao design do projeto, mantendo compatibilidade integral com o runtime do Cloudflare Workers sem estourar limites de memória ou CPU.

## Requirements

**User stories**:

- As a leitor do portal, I want buscar artigos mesmo que digite termos com pequenas trocas de letras so that eu encontre conteúdos relevantes sem precisar corrigir manualmente a grafia.
- As a leitor explorando uma temática, I want filtrar os resultados por editoria diretamente na busca so that eu visualize somente publicações da minha área de interesse.
- As a leitor navegando em dispositivos móveis, I want avançar e retroceder páginas de resultados so that a lista permaneça organizada e rápida para carregar.

**Acceptance criteria**:

- **busca/AC-01**: A rota `/busca` aceita parâmetros de consulta `q` (termo até 120 caracteres), `editoria` (slug ou nome da categoria) e `page` (número inteiro positivo) via query string da URL.
- **busca/AC-02**: A busca textual normaliza caracteres removendo diacríticos e convertendo para minúsculas, avaliando correspondências nos campos título, resumo, editoria e corpo textual dos artigos públicos.
- **busca/AC-03**: O algoritmo de pesquisa oferece tolerância a erros de digitação via distância Levenshtein Damerau, aceitando até 1 edição para termos de 5 a 8 caracteres e até 2 edições para termos com mais de 8 caracteres, exigindo correspondência estrita ou prefixo para termos de até 4 caracteres.
- **busca/AC-04**: O recorte por editoria restringe os resultados aos artigos pertencentes à categoria selecionada quando o parâmetro for válido, retornando todas as editorias caso o parâmetro seja vazio, omitido, igual a `todas` ou desconhecido.
- **busca/AC-05**: Os resultados encontrados são classificados por pontuação decrescente de relevância, priorizando título exato (peso 4), título aproximado (peso 3), resumo exato (peso 2), resumo aproximado (peso 1.5), corpo exato (peso 1) e corpo aproximado (peso 0.5), aplicando data de publicação mais recente como critério de desempate.
- **busca/AC-06**: A paginação limita a exibição a 20 artigos por página, provendo controles funcionais para página anterior e próxima página preservando os parâmetros `q` e `editoria` ativos na URL.
- **busca/AC-07**: A interface apresenta pílulas clicáveis com as editorias disponíveis, destacando visualmente a opção ativa e permitindo alternar filtros sem apagar o termo de busca atual.
- **busca/AC-08**: Em consultas sem resultados, a página apresenta mensagem de estado vazio honesto com botão ou atalho para limpar o recorte de editoria ativo e links navegáveis para as editorias públicas.
- **busca/AC-09**: A rota `/busca` preserva a diretiva de cabeçalho e metadados `noindex, follow` para evitar indexação externa de páginas de busca interna conforme a diretriz de SEO da Spec 0023.

## Options considered

### Option 1: Algoritmo nativo de Levenshtein Damerau com filtros em memória no servidor

Implementar um comparador puro em TypeScript com cálculo de distância de edição restrita, operando sobre o catálogo de artigos retornado pelos serviços editoriais já existentes.

**Pros**:

- Zero dependências npm adicionais no pacote de produção.
- Desempenho ultrarrápido compatível com Cloudflare Workers e Next.js App Router.
- Controle total sobre regras de tolerância proporcionais ao tamanho dos termos.

**Cons**:

- Exige algoritmo próprio bem testado com cobertura unitária minuciosa.

### Option 2: Incorporar biblioteca externa de busca aproximada como Fuse.js

Adicionar biblioteca cliente e servidora consolidada no ecossistema JavaScript para gerenciar correspondência por similaridade.

**Pros**:

- Algoritmo pronto com múltiplos pesos e configurações de fábrica.

**Cons**:

- Adiciona peso desnecessário ao bundle final e contraria o princípio Ponytail de evitar dependências quando poucas linhas resolvem.
- Dependência de terceiros sujeita a vulnerabilidades e revisões de compatibilidade no runtime Cloudflare.

### Option 3: Delegar busca fuzzy para o banco Supabase via extensões de texto

Executar consultas remotas com extensão pg_trgm ou similaridade fonética no Postgres.

**Pros**:

- Delega o processamento pesado de texto para o banco de dados.

**Cons**:

- Incompatível com o Sanity como fonte primária única de artigos conforme a arquitetura editorial alvo.
- Gera latência de rede adicional a cada requisição de busca.

## Decision

**Chosen option**: Option 1: Algoritmo nativo de Levenshtein Damerau com filtros em memória no servidor

Adotar algoritmo nativo em TypeScript leve e determinístico para cálculo de distância de edição, integrado às funções puras de busca e aos Server Components do Next.js.

## Rationale

A opção 1 respeita rigorosamente as convenções de arquitetura do Gradualinfo e o princípio de Senioridade Preguiçosa (Ponytail). O volume do catálogo editorial atual e de médio prazo comporta perfeitamente a leitura dos artigos em memória no Worker. Um módulo puro sem dependências externas elimina riscos de quebra de build no OpenNext, evita latências de banco de dados e mantém a aplicação desacoplada do backend de armazenamento.

## Feature design

**Data model sketch**:

A busca opera sobre a entidade existente `Post` definida em `lib/services/posts.ts`, sem requerer alterações em esquemas de banco de dados ou migrações SQL.

```typescript
export interface SearchFilterOptions {
  query: string;
  editoria?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  post: Post;
  score: number;
}

export interface SearchResult {
  items: Post[];
  totalMatches: number;
  currentPage: number;
  totalPages: number;
  availableEditorias: string[];
}
```

**State transitions**:

A busca pública é estritamente idempotente e sem estado interno persistente, reagindo aos parâmetros da URL via Server Component:

- Inicial: leitor acessa `/busca` sem parâmetros, recebendo orientações e atalhos de editoria.
- Pesquisa ativa: parâmetros `q` e opcionalmente `editoria` e `page` são lidos, filtrados e renderizados.
- Troca de filtro: clique em pílula de editoria atualiza a query string mantendo o valor de `q`.
- Paginação: clique em próxima ou anterior altera `page` preservando filtros.

**API surface**:

| Endpoint | Method | Key inputs                                       | Key outputs                                   | Auth    | Key errors                       |
| -------- | ------ | ------------------------------------------------ | --------------------------------------------- | ------- | -------------------------------- |
| `/busca` | GET    | `q`: string, `editoria`: string, `page`: integer | HTML renderizado com lista paginada e filtros | pública | 503 caso serviço editorial falhe |

**Value sourcing**:

| Action                     | Value produced / displayed | Source                                                 |
| -------------------------- | -------------------------- | ------------------------------------------------------ |
| Leitura da busca           | `query` sanitizada         | `searchParams.q` cortado em 120 caracteres             |
| Recorte de categoria       | `activeEditoria`           | `searchParams.editoria` validado contra catálogo       |
| Controle de paginação      | `page`                     | `searchParams.page` parsed como inteiro maior que zero |
| Lista de artigos filtrados | `matches`                  | Função pura `searchPostsWithFilters`                   |
| Contagem de resultados     | `totalCount`               | Total de itens retornados pela filtragem               |
| Pílulas de seleção         | `availableEditorias`       | Editorias únicas extraídas dos artigos publicados      |

**Key invariants**:

- Nenhuma dependência externa adicional de busca textual pode ser adicionada ao `package.json`.
- A tolerância a typos não pode retornar correspondências espúrias para termos de até 4 caracteres.
- A rota `/busca` nunca pode ser indexada por motores de busca (mantém robots `noindex, follow`).
- Se o serviço editorial Sanity falhar, exibe mensagem honesta de indisponibilidade (503 ou banner) sem falha silenciosa.

**Security model**:

A rota é pública e não requer autenticação. Os termos de busca são estritamente sanitizados para remoção de caracteres de controle, limitados a 120 caracteres de extensão máxima e renderizados com escape padrão do React para prevenir injeção XSS.

**Configuration required**:

Nenhuma nova variável de ambiente é necessária para esta funcionalidade.

**Critical test scenarios**:

- Happy path: Leitor busca termo exato com filtro de editoria ativo e recebe artigos correspondentes ordenados por relevância e data, verificando **busca/AC-01**, **busca/AC-02**, **busca/AC-04** e **busca/AC-05**.
- Tolerância a erro de digitação: Leitor digita termo com erro como "inteligencia artifisial" ou "prograamacao" e encontra os artigos corretos, verificando **busca/AC-03**.
- Paginação com preservação de estado: Leitor clica na página 2 e os parâmetros `q` e `editoria` permanecem intactos na URL, verificando **busca/AC-06**.
- Limpeza e estado vazio: Leitor busca termo sem correspondência na editoria selecionada e visualiza atalho para limpar o filtro de editoria, verificando **busca/AC-07** e **busca/AC-08**.
- Integridade de metadados SEO: Inspeção do cabeçalho HTML comprova a presença da diretiva robots noindex, verificando **busca/AC-09**.

## Build plan

1. Criar módulo utilitário puro `lib/utils/fuzzy-match.ts` com cálculo de distância Levenshtein Damerau e limites de tolerância proporcionais, satisfaz **busca/AC-03**.
2. Atualizar utilitário `lib/utils/search-posts.ts` para suportar tolerância a typos, recorte por editoria, ponderação de relevância e cálculo de paginação, satisfaz **busca/AC-02**, **busca/AC-04**, **busca/AC-05** e **busca/AC-06**.
3. Atualizar o Server Component `app/busca/page.tsx` para ler os parâmetros da URL, renderizar as pílulas de editoria, lista paginada e estados vazios com atalhos de recuperação, satisfaz **busca/AC-01**, **busca/AC-07**, **busca/AC-08** e **busca/AC-09**.
4. Atualizar folha de estilos `app/busca/search.module.css` garantindo conformidade visual com o design system em `DESIGN.md` para pílulas e botões de paginação, satisfaz **busca/AC-07**.
5. Criar suíte de testes unitários em `__tests__/unit/search-posts.test.ts` cobrindo correspondência exata, typos, recorte por editoria e ordenação, satisfaz **busca/AC-02**, **busca/AC-03**, **busca/AC-04** e **busca/AC-05**.
6. Atualizar testes de componente e integração em `__tests__/unit/app-busca.test.tsx` e `e2e/search-flow.spec.ts` validando fluxos na interface, satisfaz **busca/AC-01**, **busca/AC-06**, **busca/AC-07**, **busca/AC-08** e **busca/AC-09**.

## Consequences

**Positive**:

- Experiência de busca muito mais tolerante a falhas humanas de digitação.
- Descoberta temática facilitada através do recorte por editoria.
- Zero dependências externas e custo zero de infraestrutura adicional.

**Negative / tradeoffs**:

- A busca em memória exige que o volume total de artigos publicados caiba confortavelmente na memória do Worker (aceitável para o porte atual e futuro de milhares de posts).

**Neutral**:

- A interface de busca ganha pílulas adicionais que ocupam espaço vertical moderado no topo da listagem.

## Migration plan

**Strategy**: Fix in place
**Phases**:

1. Implementação dos novos utilitários puros de fuzzy match e ordenação com testes unitários isolados.
2. Atualização dos componentes da rota `/busca` mantendo compatibilidade com URLs existentes apenas com parâmetro `q`.
   **Rollback**: Reversão direta do commit ou commit de ajuste restaura a busca anterior sem efeitos colaterais em banco de dados.
   **Risks**: Degradação de performance caso cálculo de distância seja executado de forma ineficiente sobre textos longos (mitigado avaliando distância prioritariamente sobre títulos, resumos e tokens únicos).
