import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { isPreviewConfigured } from '@/lib/preview/config';
import { PREVIEW_COOKIE, readPreviewGrant } from '@/lib/preview/session';
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
  if (!isPreviewConfigured()) return false;
  const grant = readPreviewGrant(
    (await cookies()).get(PREVIEW_COOKIE)?.value,
    env.previewToken,
  );
  if (!grant || grant.sub !== env.previewUserId) return false;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      user.id !== grant.sub ||
      ![true, 'true'].includes(user.app_metadata.preview)
    )
      return false;
    const { data, error: claimsError } = await supabase.auth.getClaims();
    return (
      !claimsError &&
      data?.claims.sub === user.id &&
      data.claims.session_id === grant.session_id
    );
  } catch {
    return false;
  }
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
