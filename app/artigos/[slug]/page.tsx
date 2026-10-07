/**
 * @fileoverview Página de artigo individual (`/artigos/[slug]`).
 * @module app/artigos/[slug]/page
 * @description Server Component dinâmico: lê o post pelo slug com a visibilidade
 *   do leitor (rascunho e publicação futura contam como inexistente para quem
 *   não tem sessão de preview) e devolve 404 via `notFound()` quando não há
 *   o que mostrar. Entrega SEO de artigo completo: metadata com canonical
 *   único, Open Graph e um JSON-LD do tipo `Article` — e marca `noindex` em
 *   post que ainda não é público, para o buscador não guardar rascunho.
 * @dependencies lib/supabase/server (cliente com a sessão do leitor),
 *   lib/services/posts (consulta + regra de visibilidade), lib/editorial-images
 *   (URL de capa), lib/utils/format (data pt-BR e serialização segura do
 *   JSON-LD), react-markdown + remark-gfm (renderização), next/image,
 *   components/ui/badge.
 */
import Image from 'next/image';
import { coverImageUrl } from '@/lib/editorial-images';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { createClient } from '@/lib/supabase/server';
import { getPostBySlug } from '@/lib/services/posts';
import { SITE_ORIGIN } from '@/lib/site-config';
import { formatDate, serializeJsonLd } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

// Sem pré-render no build: o artigo pode ser publicado (ou corrigido) a qualquer
// momento no banco, e HTML congelado no deploy continuaria servindo a versão
// antiga até o próximo build.
export const dynamic = 'force-dynamic';

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
  const supabase = await createClient();
  const post = await getPostBySlug(supabase, params.slug);

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
  const supabase = await createClient();

  const post = await getPostBySlug(supabase, params.slug);

  if (!post) {
    notFound();
  }

  const publishedAt = post.published_at
    ? formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })
    : null;

  // `datePublished` cai em `created_at` só quando o post nunca foi publicado:
  // é o melhor dado disponível para o buscador sem mentir com data futura.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [coverImageUrl(post.cover_image_url)],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name,
    },
  };

  return (
    <>
      {/* `serializeJsonLd` escapa "<", ">", "&" e os separadores Unicode de
          linha: título e resumo vêm do banco, e entrar cru num innerHTML
          deixaria qualquer "</script>" quebrar o parser do documento. */}
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
        </header>

        {post.cover_image_url && (
          <div className="w-full aspect-video relative overflow-hidden bg-muted mb-12 rounded-card border border-border">
            <Image
              src={coverImageUrl(post.cover_image_url)}
              alt={`Capa do artigo ${post.title}`}
              className="object-cover w-full h-full"
              fill
              unoptimized
              sizes="(min-width: 768px) 896px, 100vw"
              loading="eager"
            />
          </div>
        )}

        <article className="prose prose-slate prose-lg dark:prose-invert max-w-none mb-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // O <h1> da página já é o título do artigo: um "# " no markdown
              // desceria para <h2>, senão a página teria dois <h1> e a
              // hierarquia de cabeçalhos do texto ficaria quebrada para SEO e
              // para quem navega por cabeçalho no leitor de tela.
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
        <footer className="mt-8">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{post.author_name}</span>
            {publishedAt && (
              <>
                <span aria-hidden="true">&middot;</span>
                <time dateTime={post.published_at || ''}>{publishedAt}</time>
              </>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
