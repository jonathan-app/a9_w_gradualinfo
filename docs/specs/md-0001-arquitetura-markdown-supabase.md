# Spec: 0001 — Arquitetura de Conteúdo (Markdown + Supabase)

- Status: Accepted
- Escopo: Reconciliação arquitetural do portal GradualInfo e depreciação das specs MDX/Velite.

## Problema

As especificações originais da branch `feat/identidade-portal-gradualinfo` (0001 e 0002) atrelavam o projeto ao framework Velite para renderização de MDX via Pull Requests. No entanto, para o MVP, essa abordagem misturava código-fonte com conteúdo e criava um gargalo de edição (exigindo fluxo git para redatores).

## Decisão Técnica

- **Substituição do Velite por Supabase + Markdown.** O conteúdo editorial não viverá no repositório (`content/`). Ele viverá em tabelas do Supabase.
- **Formato:** Markdown puro (renderizado no frontend via `react-markdown` ou similar).
- **Publicação (MVP):** Sem painel administrativo. Inserção direta via banco ou script de utilidade (CLI). O foco do MVP é prover uma experiência de leitura rápida e indexável.
- **Rota:** Os artigos serão acessados em `/artigos/[slug]` (substituindo o antigo `/blogs/[slug]`).
- **Depreciação:** As decisões de fluxo editorial por PR, Velite, e `.velite/generated` contidas nas specs antigas da branch `feat/identidade-portal-gradualinfo` estão **revogadas e substituídas** por este documento. O template `/template-aqua` permanece apenas como referência visual e de design system.

## Critérios de Aceite

- [ ] AC-01: Uma migration do Supabase define a tabela `posts` com campos
      `slug` (único, indexado), `title`, `content`, `excerpt`, `cover_image_url`,
      `editoria`, `author_name`, `fontes_citadas`, `status`
      (`rascunho` \| `publicado`), `published_at` (anulável) e `updated_at`, com
      RLS por operação e índice de listagem por `published_at`.
- [ ] AC-02: A aplicação renderiza a rota `/artigos/[slug]` puxando os dados do banco e formatando o Markdown de forma segura.

### Emenda do AC-01 — 2026-10-05

O AC-01 original declarava cinco colunas (`slug`, `title`, `content`,
`published_at`, `author_id`), mas o scope revisão 3 atribui à fatia 1 também
autor, editoria, fontes citadas, estado de publicação, data de atualização e
imagem de capa. A spec `md-0002` consome o schema do scope, então a fatia 2
não era construível com o AC-01 como estava.

**Fonte da emenda**: decisão do dono em 2026-10-05 (painel de decisão da
sessão, `/architect`), escolhida entre emendar o AC-01 e superseder esta spec
com uma nova. O status `Accepted` e a data de aceitação original, 2026-10-04,
permanecem válidos: o que mudou foi o alcance do AC-01, não a decisão de
fundação.

Duas mudanças de decisão dentro da emenda, ambas com consequência registrada:

- **`author_id` virou `author_name` (texto).** O MVP não tem cadastro nem
  login, então `author_id` não teria tabela de perfis para apontar e ficaria
  órfão.
  O custo é o nome não acompanhar uma renomeação futura, o que hoje é
  impossível porque não existe tela para renomear. Se o produto ganhar contas,
  isto vira migração para uma tabela de perfis.
- **`fontes_citadas` entrou como coluna, sem renderizador.** O scope pede
  fontes citadas na fatia 1 e a fatia 1 é a fatia de schema, mas nenhuma spec
  decide ainda onde a fonte é exibida (nota de rodapé, seção final ou
  marcação no corpo). A coluna existe para não adiar o schema; o formato e o
  ponto de exibição são de spec própria, e a lacuna está registrada em
  `md-0002` (`## Follow-up`).

Esta spec atua como o fundacional para a fatia 1 do novo roadmap e limpa a herança arquitetural das branches não mescladas.
