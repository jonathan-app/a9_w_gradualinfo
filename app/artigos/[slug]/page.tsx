/**
 * @fileoverview Página de artigo individual (`/artigos/[slug]`).
 * @module app/artigos/[slug]/page
 * @description Server Component dinâmico: lê o post pelo slug com a visibilidade
 *   do leitor (rascunho e publicação futura contam como inexistente para quem
 *   não tem sessão de preview) e devolve 404 via `notFound()` quando não há
 *   o que mostrar. Entrega SEO de artigo completo: metadata com canonical
 *   único, Open Graph e um JSON-LD do tipo `Article` — e marca `noindex` em
 *   post que ainda não é público, para o buscador não guardar rascunho.
 * @dependencies react (cache), lib/supabase/server (cliente com a sessão do leitor),
 *   lib/services/posts (consulta + regra de visibilidade), lib/editorial-images
 *   (URL de capa), lib/utils/format (data pt-BR e serialização segura do
 *   JSON-LD), react-markdown + remark-gfm (renderização), next/image,
 *   components/ui/badge.
 */
import { cache } from 'react';
import * as Sentry from '@sentry/nextjs';
import { EditorialCover } from '@/components/shared/editorial-cover';
import { approvedCoverImageUrl, coverImageUrl } from '@/lib/editorial-images';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { ArticleBody } from '@/components/editorial/article-body';
import { ArticleShare } from '@/components/editorial/article-share';
import { EditorialStory } from '@/components/shared/editorial-story';
import { readingMinutes, relatedPosts } from '@/lib/editorial/reading';

import { createClient } from '@/lib/supabase/server';
import { getPostBySlug, getPublishedPosts } from '@/lib/services/posts';
import { SITE_ORIGIN, SITE_URL } from '@/lib/site-config';
import { formatDate } from '@/lib/utils/format';
import { JsonLd } from '@/components/shared/json-ld';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured-data';

// Sem pré-render no build: o artigo pode ser publicado (ou corrigido) a qualquer
// momento no banco, e HTML congelado no deploy continuaria servindo a versão
// antiga até o próximo build.
export const dynamic = 'force-dynamic';

const getCachedPost = cache(async (slug: string) => {
  const supabase = await createClient();
  return getPostBySlug(supabase, slug);
});

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Metadados do artigo, resolvidos a cada requisição.
 *
 * @param props - Contém `params`, a Promise do segmento dinâmico (Next 16).
 * @param _parent - Metadados do layout pai; não é lido aqui, mas precisa
 *   constar na assinatura para o Next resolver a árvore de metadata.
 * @returns Title/description do post, canonical único e Open Graph de artigo;
 *   `robots: noindex` quando o post ainda não é público (status diferente de
 *   publicado ou data no futuro) — e também quando o slug não existe, para o
 *   404 não virar página indexável.
 */
export async function generateMetadata(
  props: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const post = await getCachedPost(params.slug);

  // notFound() aqui rende HTTP 200 no Next 16: a fase de metadata não
  // propaga o status 404. Deixa o componente página chamá-lo — é o caminho
  // que Next tipifica corretamente como 404.
  if (!post) {
    return {
      title: 'Página não encontrada',
      robots: { index: false, follow: false },
      alternates: { canonical: `${SITE_ORIGIN}/artigos/${params.slug}` },
    };
  }

  const url = `${SITE_ORIGIN}/artigos/${post.slug}`;
  const isPublic =
    post.status === 'publicado' &&
    post.published_at &&
    new Date(post.published_at) <= new Date();

  return {
    title: post.title,
    description: post.excerpt,
    robots: isPublic ? undefined : { index: false, follow: false },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.published_at || undefined,
      authors: [post.author_name],
      images: [
        {
          url: coverImageUrl(post.cover_image_url),
          width: 1200,
          height: 630,
          alt: `Capa do artigo ${post.title}`,
        },
      ],
    },
  };
}

/**
 * Renderiza o artigo completo: JSON-LD, capa, markdown, fontes e assinatura.
 *
 * @param props - Contém `params` com o slug pedido.
 * @returns O artigo, ou a tela de 404 do App Router quando `getPostBySlug`
 *   devolve `null` — inexistente ou invisível para o leitor atual (a regra de
 *   visibilidade mora no serviço, não aqui).
 */
export default async function ArticlePage(props: Props) {
  const params = await props.params;

  const post = await getCachedPost(params.slug);

  if (!post) {
    notFound();
  }

  const publishedAt = post.published_at
    ? formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })
    : null;

  // Canonical absoluto do artigo, a mesma URL do metadata: bloco e link não divergem.
  const articleUrl = `${SITE_ORIGIN}/artigos/${post.slug}`;

  let related: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    const supabase = await createClient();
    related = relatedPosts(post, await getPublishedPosts(supabase, 10));
  } catch (error) {
    // Outras leituras são opcionais: uma segunda consulta não derruba o artigo disponível.
    Sentry.captureException(error);
  }
  const isPublic =
    post.status === 'publicado' &&
    Boolean(post.published_at) &&
    new Date(post.published_at!) <= new Date();
  return (
    <>
      {/* Somente artigo publicado emite dados estruturados; a serialização
          segura fica em components/shared/json-ld, único caminho de script. */}
      {isPublic && (
        <>
          <JsonLd data={articleJsonLd(post, articleUrl)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: 'Início', url: SITE_URL },
              { name: post.title, url: articleUrl },
            ])}
          />
        </>
      )}
      <div data-editorial-layout="article" className="article-page">
        <header className="article-header">
          <a href="/" className="article-back">
            ← Voltar ao início
          </a>
          <span className="article-category">{post.editoria}</span>
          <h1 className="article-title">{post.title}</h1>
          {post.excerpt && <p className="article-excerpt">{post.excerpt}</p>}
          {(post.author_name || publishedAt || post.content) && (
            <div className="article-meta">
              {post.author_name && (
                <span className="article-author">{post.author_name}</span>
              )}
              <span>≈ {readingMinutes(post.content)} min de leitura</span>
              {post.status !== 'publicado' && <span>Em revisão</span>}
              {publishedAt && (
                <time dateTime={post.published_at!}>{publishedAt}</time>
              )}
            </div>
          )}
        </header>

        {
          <div className="article-hero">
            <EditorialCover
              src={approvedCoverImageUrl(post.cover_image_url)}
              priority
              sizes="(min-width: 1024px) 1040px, 100vw"
            />
          </div>
        }

        <ArticleBody content={post.content} />

        {post.fontes_citadas && post.fontes_citadas.length > 0 && (
          <section className="article-sources">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Fontes</h2>
            <ul className="flex flex-col gap-2 list-disc pl-5">
              {post.fontes_citadas.map((fonte, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm">
                    {fonte.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ArticleShare title={post.title} />
        {related.length > 0 && (
          <section className="article-related" aria-labelledby="related-title">
            <div className="article-section-heading">
              <span>Continue explorando</span>
              <h2 id="related-title">Outras leituras para você</h2>
            </div>
            <div className="article-related-grid">
              {related.map((item) => (
                <EditorialStory key={item.id} post={item} variant="secondary" />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
