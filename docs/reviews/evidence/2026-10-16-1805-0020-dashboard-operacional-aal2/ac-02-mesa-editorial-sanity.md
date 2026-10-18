# Evidência admin-dashboard/AC-02: Mesa Editorial com Consulta Autenticada ao Sanity e Paginação

## Critério
O dashboard deve carregar artigos publicados e rascunhos do Sanity Content Lake via consulta GROQ autenticada no servidor utilizando token de leitura quando o Sanity estiver configurado, suportando paginação parametrizada e exibindo título, slug, status editorial, editoria e data de atualização. Deve fornecer estados explícitos para lista vazia e para indisponibilidade da fonte com mensagem sanitizada. O catálogo local fica estritamente restrito ao modo editorial local (`isLocalEditorialMode`).

## Verificação Empírica

1. **Implementação do Serviço (`lib/services/editorial-dashboard.ts`)**:
   - Quando `isSanityConfigured === true`: invoca `executeSanityQuery` passando query GROQ com fatiamento determinístico `[$start...$end]` e `readToken: env.SANITY_READ_TOKEN`:
     ```groq
     *[_type == "post"] | order(_updatedAt desc) [$start...$end] {
       _id,
       title,
       "slug": slug.current,
       "status": select(_id in path("drafts.**") => "rascunho", "publicado"),
       "category": coalesce(categories[0]->title, "Geral"),
       _updatedAt,
       publishedAt
     }
     ```
     Essa query recupera tanto documentos publicados quanto rascunhos (`drafts.**`) no mesmo conjunto ordenado pela data mais recente.
   - Quando `isSanityConfigured === false` e `isLocalEditorialMode === true`: consome o catálogo local via `getLocalPosts()`, aplicando paginação determinística em memória e mapeando metadados.
   - Tratamento de erro sanitizado: qualquer exceção durante a consulta é capturada, logada de forma estruturada e convertida no DTO `{ posts: [], total: 0, isError: true }`, sem derrubar a renderização do restante da página.

2. **Estados Negativos e Interface (`components/admin/dashboard/editorial-table.tsx`)**:
   - **Estado Vazio**: Se `posts.length === 0` e `!isError`, renderiza mensagem amigável: `"Nenhum artigo publicado ou rascunho encontrado."`.
   - **Estado de Erro Sanitizado**: Se `isError === true`, exibe banner com badge de alerta: `"Não foi possível carregar os artigos no momento. Verifique a integração com o Sanity."`.
   - **Paginação**: Suporta parâmetros `page` e `pageSize` com controle de botões "Anterior" e "Próxima", desabilitados nos limites.
   - **Badges Semafóricos**: Rascunho recebe badge âmbar (`bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`), enquanto publicado recebe badge verde (`bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`).

3. **Cobertura de Testes**:
   - `__tests__/unit/lib/editorial-dashboard.test.ts`:
     - Teste de consulta Sanity com token de leitura, paginação ($start, $end) e projeção de status.
     - Teste de catálogo local sob `isLocalEditorialMode`.
     - Teste de degradação graciosa com `isError: true` sob falha do Sanity.
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Renderização sob servidor OpenNext/Worker em Chromium, verificando títulos, badges de status "Rascunho"/"Publicado", editoria e botão de prévia individual.

4. **Resolução e Validação Empírica da Leitura Autenticada no Sanity**:
   - A ressalva anterior de integração restrita a mocks e catálogo local foi formalmente sanada e comprovada em 2026-10-16T23:02Z via `scripts/verify-sanity-authenticated-read.mjs` com credencial válida em `SANITY_API_READ_TOKEN` no runner local com Worker real (`http://127.0.0.1:3100/admin-dashboard`).
   - Resultado da consulta GROQ autenticada: HTTP 200 via Bearer contra o Content Lake `4iipvaar` (`production`), retornando 6 documentos publicados e 7 documentos de rascunho (exercitando a dimensão de rascunhos remotos com sucesso), totalizando 13 documentos no dataset (sem assunção de 13 artigos distintos, pois rascunhos podem corresponder a versões de publicados).
   - Renderização no Worker local sob AAL2 comprovada com `source: 'sanity'`, badge visual ativo `✅ SANITY` e títulos reais do Sanity renderizados com paginação determinística (4 por página, sem sobreposição de IDs).
   - Evidência consolidada e captura arquivadas em `docs/reviews/evidence/2026-10-16-1930-sanity-authenticated-read/` (`relatorio-leitura-autenticada-sanity.md` e `01-mesa-editorial-sanity-ativa.png`).

## Veredito
**PASS**
