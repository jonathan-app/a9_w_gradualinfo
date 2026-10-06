import type { SupabaseClient } from '@supabase/supabase-js';

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  editoria: string;
  author_name: string;
  fontes_citadas: Array<{ titulo: string; url: string }>;
  status: 'rascunho' | 'publicado' | 'arquivado';
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export async function isPreviewSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    user?.app_metadata?.preview === true ||
    user?.app_metadata?.preview === 'true'
  );
}

export async function getPublishedPosts(
  supabase: SupabaseClient,
  limit = 10,
): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'publicado')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data as Post[];
}

export async function getPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Post | null> {
  const isPreview = await isPreviewSession(supabase);

  let query = supabase.from('posts').select('*').eq('slug', slug);

  if (!isPreview) {
    query = query
      .eq('status', 'publicado')
      .lte('published_at', new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as Post | null;
}
