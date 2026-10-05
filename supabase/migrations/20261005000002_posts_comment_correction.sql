-- ===========================================================================
-- supabase/migrations/20261005000002_posts_comment_correction.sql
-- ===========================================================================
--
-- Corrige o COMMENT da tabela `public.posts`, que herdou "Conteúdo de exemplo"
-- da migration 20261004000000_posts_exemplo.sql e agora é falso: a tabela
-- deixou de ser exemplo e passou a ser o schema editorial do `md-0001`.
-- ===========================================================================

comment on table public.posts is
  'Conteúdo editorial do portal GradualInfo. Linhas com status=publicado e published_at no passado são visíveis ao público; rascunho, arquivado e agendado são invisíveis. Preview lê tudo via app_metadata.preview=true.';