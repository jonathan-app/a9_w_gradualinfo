/**
 * @fileoverview Home do site (`/`): capa, dois destaques e lista de recentes.
 * @module app/page
 * @description Server Component dinâmico: busca 10 artigos publicados (1
 *   capa + 2 destaques + 7 recentes, limite definido na spec) com o cliente público —
 *   leitor anônimo enxerga só o que já é publicado, porque a regra de
 *   visibilidade mora na consulta e no RLS. Sem artigos, cai para o estado
 *   vazio mantendo o H1 institucional.
 * @dependencies lib/services/posts (consulta), lib/supabase/server (cliente
 *   público), components/shared/editorial-story, app/artigos-vazios.
 */
import { getPublishedPosts } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';
import { EditorialStory } from '@/components/shared/editorial-story';
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

  const lead = posts[0];
  const secondary = posts.slice(1, 3);
  const recent = posts.slice(3);

  return (
    <div data-editorial-layout="home" className="space-y-8">
      <h1 className="border-b border-border pb-6 text-xl font-semibold tracking-tight">
        Gradualinfo, tecnologia para estudar programação
      </h1>
      {!lead ? (
        <ArtigosVazios />
      ) : (
        <div className="editorial-highlights">
          <section aria-labelledby="lead-heading" className="min-w-0">
            <h2 id="lead-heading" className="sr-only">
              Matéria de capa
            </h2>
            <EditorialStory post={lead} variant="lead" />
          </section>
          {secondary.length > 0 && (
            <section
              aria-labelledby="secondary-heading"
              className="min-w-0 space-y-6">
              <h2 id="secondary-heading" className="sr-only">
                Destaques editoriais
              </h2>
              {secondary.map((post) => (
                <EditorialStory key={post.id} post={post} variant="secondary" />
              ))}
            </section>
          )}
          {recent.length > 0 && (
            <section
              aria-labelledby="recent-heading"
              className="editorial-recent min-w-0">
              <h2
                id="recent-heading"
                className="mb-5 border-b border-border pb-3 text-lg font-semibold">
                Artigos recentes
              </h2>
              <div className="space-y-5">
                {recent.map((post) => (
                  <EditorialStory key={post.id} post={post} variant="recent" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
