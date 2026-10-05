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

- [ ] AC-01: Uma migration do Supabase define a tabela `posts` com campos `slug`, `title`, `content`, `published_at`, `author_id`.
- [ ] AC-02: A aplicação renderiza a rota `/artigos/[slug]` puxando os dados do banco e formatando o Markdown de forma segura.

Esta spec atua como o fundacional para a fatia 1 do novo roadmap e limpa a herança arquitetural das branches não mescladas.
