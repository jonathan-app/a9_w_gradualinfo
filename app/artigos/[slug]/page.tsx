import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { createClient } from '@/lib/supabase/server';
import { getPostBySlug } from '@/lib/services/posts';
import { SITE_ORIGIN } from '@/lib/site-config';
import { formatDate, serializeJsonLd } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  props: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const supabase = await createClient();
  const post = await getPostBySlug(supabase, params.slug);

  if (!post) {
    notFound();
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
          url: post.cover_image_url,
          width: 1200,
          height: 630,
          alt: `Capa do artigo ${post.title}`,
        },
      ],
    },
  };
}

export default async function ArticlePage(props: Props) {
  const params = await props.params;
  const supabase = await createClient();

  const post = await getPostBySlug(supabase, params.slug);

  if (!post) {
    notFound();
  }

  const publishedAt = post.published_at
    ? formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [post.cover_image_url],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <header className="mb-8 flex flex-col items-start gap-4">
          <Badge variant="secondary" className="text-brand-700 bg-brand-50">
            {post.editoria}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {post.title}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{post.author_name}</span>
            {publishedAt && (
              <>
                <span aria-hidden="true">&middot;</span>
                <time dateTime={post.published_at || ''}>{publishedAt}</time>
              </>
            )}
          </div>
        </header>

        {post.cover_image_url && (
          <div className="w-full aspect-video relative overflow-hidden bg-muted mb-12 rounded-card border border-border">
            <img
              src={post.cover_image_url}
              alt={`Capa do artigo ${post.title}`}
              className="object-cover w-full h-full"
              loading="eager"
            />
          </div>
        )}

        <article className="prose prose-slate prose-lg dark:prose-invert max-w-none mb-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: 'h2',
            }}>
            {post.content}
          </ReactMarkdown>
        </article>

        {post.fontes_citadas && post.fontes_citadas.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Fontes</h2>
            <ul className="flex flex-col gap-2 list-disc pl-5">
              {post.fontes_citadas.map((fonte, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm">
                    {fonte.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
