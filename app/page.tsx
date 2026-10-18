/**
 * @fileoverview Home Cambridge: capa, destaques, últimas leituras e artigos recentes.
 * @module app/page
 * @description Server Component dinâmico: busca até 60 artigos visíveis para a home com o cliente público —
 *   leitor anônimo enxerga só o que já é publicado, porque a regra de
 *   visibilidade mora na consulta e no RLS. Sem artigos, cai para o estado
 *   vazio mantendo o H1 institucional.
 * @dependencies lib/services/posts (consulta), lib/supabase/server (cliente
 *   público), components/shared/editorial-story, app/artigos-vazios.
 */
import type { Metadata } from 'next';
import { getPublishedPosts, type Post } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';
import { SITE_ORIGIN } from '@/lib/site-config';
import { cn } from '@/lib/utils/cn';
import { JsonLd } from '@/components/shared/json-ld';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';
import { HomeHeroFeatured } from '@/components/home/home-hero-featured';
import { HomeTeaserList } from '@/components/home/home-teaser-list';
import { HomeLatestSection } from '@/components/home/home-latest-section';
import { HomeSectionGrid } from '@/components/home/home-section-grid';
import styles from '@/components/home/home-editorial.module.css';
import { ArtigosVazios } from './artigos-vazios';
import { EditorialIndisponivel } from './editorial-indisponivel';
import { ContentUnavailableError } from '@/lib/errors/content';
import * as Sentry from '@sentry/nextjs';

// No ar a cada requisição: a home não pode congelar no build com a lista da
// hora do deploy — publicado um artigo, ele tem que aparecer sem novo build.
export const dynamic = 'force-dynamic';

/**
 * Metadados da home: canonical aponta para o apex do site.
 *
 * Sem canonical, o buscador pode indexar a home por qualquer variação de URL
 * (com ou sem www, com query string), dividindo a autoridade da página.
 */
export const metadata: Metadata = {
  alternates: { canonical: SITE_ORIGIN },
};

/**
 * Página inicial.
 *
 * @returns H1 institucional + destaque + grade; com falha de infraestrutura,
 *   exibe o bloco honesto de indisponibilidade; com o banco vazio, o estado vazio.
 */
export default async function HomePage() {
  const supabase = createPublicClient();

  let posts: Post[] = [];
  let isUnavailable = false;

  try {
    // Até 60 posts alimentam as editorias sem consultas por componente.
    posts = await getPublishedPosts(supabase, 60);
  } catch (error) {
    if (error instanceof ContentUnavailableError) {
      isUnavailable = true;
      Sentry.captureException(error);
    } else {
      throw error;
    }
  }

  const lead = posts[0];
  // A seção inferior reúne as editorias pela data real de publicação.
  const recentPosts = [...posts]
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, 16);

  const hasSideTeasers = posts.length > 1;
  const teaserPosts = posts.slice(1, 5);
  const latestPosts = posts.slice(5, 9);
  const hasSingleSideColumn = teaserPosts.length <= 2;

  return (
    <div data-editorial-layout="home" className={styles.home}>
      {/* Institutional, não editorial: os blocos descrevem o site e continuam
          válidos mesmo quando a fonte de conteúdo está indisponível. */}
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <h1 className="sr-only">
        Gradualinfo, tecnologia para estudar programação
      </h1>
      {isUnavailable ? (
        <EditorialIndisponivel />
      ) : !lead ? (
        <ArtigosVazios />
      ) : (
        <>
          <div
            id="artigos"
            className={cn(
              styles.highlights,
              !hasSideTeasers && styles.highlightsSingle,
              hasSideTeasers &&
                hasSingleSideColumn &&
                styles.highlightsSideSingle,
            )}>
            <HomeHeroFeatured post={lead} />
            {hasSideTeasers && <HomeTeaserList posts={teaserPosts} />}
          </div>
          {latestPosts.length > 0 && <HomeLatestSection posts={latestPosts} />}
          <div id="recentes" className={styles.editorias}>
            <HomeSectionGrid posts={recentPosts} />
          </div>
        </>
      )}
    </div>
  );
}
