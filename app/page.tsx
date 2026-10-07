/**
 * @fileoverview Home do site (`/`): artigo em destaque + grade dos últimos.
 * @module app/page
 * @description Server Component dinâmico: busca 10 artigos publicados (1
 *   destaque + 9 na grade, limite definido na spec) com o cliente público —
 *   leitor anônimo enxerga só o que já é publicado, porque a regra de
 *   visibilidade mora na consulta e no RLS. Sem artigos, cai para o estado
 *   vazio mantendo o H1 institucional.
 * @dependencies lib/services/posts (consulta), lib/supabase/server (cliente
 *   público), components/shared/post-card, app/artigos-vazios.
 */
import { getPublishedPosts } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/shared/post-card';
import { ArtigosVazios } from './artigos-vazios';

// No ar a cada requisição: a home não pode congelar no build com a lista da
// hora do deploy — publicado um artigo, ele tem que aparecer sem novo build.
export const dynamic = 'force-dynamic';

/**
 * Página inicial.
 *
 * @returns H1 institucional + destaque + grade; com o banco vazio, o mesmo H1
 *   com o estado vazio — a home diz o que é o site nos dois casos.
 */
export default async function HomePage() {
  const supabase = createPublicClient();

  // O limite na querie é de 10 artigos, como exigido na spec (1 destaque + 9 grade)
  const posts = await getPublishedPosts(supabase, 10);

  if (!posts || posts.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">
          Gradualinfo, tecnologia para estudar programação
        </h1>
        <ArtigosVazios />
      </div>
    );
  }

  // `posts[0]!` é seguro: o guard acima já devolveu quando a lista é vazia.
  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 flex flex-col gap-12">
      <h1 className="text-3xl font-bold">
        Gradualinfo, tecnologia para estudar programação
      </h1>
      <section aria-label="Artigo em Destaque">
        {/* `aria-label` nomeia a região para quem navega por landmarks; o h2
            sr-only existe para quem navega por lista de cabeçalhos. Os dois
            enxergam a mesma seção, que sem isso ficaria sem título. */}
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
