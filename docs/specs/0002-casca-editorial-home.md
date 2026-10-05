# Spec: 0002 — Casca Editorial e Home de Leitura

- Status: Proposed
- Escopo: Fatia 1 do roadmap. Construção da Home do Portal e da Página de Artigo em Markdown via Supabase.

## Problema

O portal GradualInfo requer uma página inicial para listar os guias direcionados a estudantes de programação e uma página para leitura fluida desses guias, sem depender de compilação estática de arquivos locais.

## Origem de Dados

- **Tabela Supabase:** `posts`
- **Campos:** `id`, `slug`, `title`, `excerpt`, `content`, `status`, `published_at`, `author_id`.
- **Acesso:** Policy RLS permitindo leitura pública (anon) para linhas onde `published_at <= now()`.

## Home (Página Inicial)

- **Estrutura Visual:** Header limpo (baseado no `/template-aqua`), seção de destaque (esboço do post principal) e grid com os últimos artigos publicados.
- **Card de Artigo:** Exibe imagem de capa, tag da editoria, título, resumo de 2 linhas e data formatada.

## Página de Artigo (`/artigos/[slug]`)

- **Resolução:** Busca no Supabase pelo `slug`. Se não existir ou não estiver publicado, retorna **404 elegante** (not found do Next.js).
- **Conteúdo Markdown:** Uso de `react-markdown` ou similar no lado do cliente/servidor para compilação segura, higienizada.
- **SEO & JSON-LD:**
  - Metadata gerado no server (Title, Description = excerpt, OpenGraph image = cover_image_url).
  - Componente de JSON-LD estruturando `Article` com título, data de publicação, autoria e imagem.
- **Marcação HTML:** Apenas um `<h1>` por página (o título do artigo).

## Comportamento de Rascunho / Fallback

- Artigos com `published_at` nulo ou no futuro **só podem ser lidos** em ambiente `local` (dev mode) via by-pass condicional da query ou flag (para preview). Em produção, retornam 404.

## Critérios de Aceite

- [ ] AC-01: A Home lista até 10 artigos ordenados por data de publicação decrescente.
- [ ] AC-02: A rota `/artigos/[slug]` renderiza o título em `<h1>` e o corpo formatado em HTML a partir do `content`.
- [ ] AC-03: Acessar um `slug` inexistente ou não publicado em produção exibe uma página 404 customizada.
- [ ] AC-04: O código-fonte da página `/artigos/[slug]` contém um bloco `<script type="application/ld+json">` válido do tipo `Article`.
- [ ] AC-05: Nenhuma tag Markdown crua escapa para o usuário (ex: links e negritos são tags HTML corretas).
