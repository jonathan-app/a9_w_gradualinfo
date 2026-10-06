import { getPublishedPosts } from '@/lib/services/posts';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/shared/post-card';
import { ArtigosVazios } from './artigos-vazios';

export default async function HomePage() {
  const supabase = await createClient();

  // O limite na querie é de 10 artigos, como exigido na spec (1 destaque + 9 grade)
  const posts = await getPublishedPosts(supabase, 10);

  if (!posts || posts.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <ArtigosVazios />
      </div>
    );
  }

  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 flex flex-col gap-12">
      <section aria-label="Artigo em Destaque">
        <h2 className="sr-only">Artigo em Destaque</h2>
        <PostCard post={featuredPost!} isFeatured />
      </section>

      {gridPosts.length > 0 && (
        <section aria-labelledby="latest-articles-heading">
          <h2
            id="latest-articles-heading"
            className="text-2xl font-semibold tracking-tight mb-6">
            Últimos Artigos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
