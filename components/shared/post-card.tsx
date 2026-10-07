/**
 * @fileoverview Card de artigo da home (destaque e grade).
 * @module components/shared/post-card
 * @description Server Component com dois layouts: o horizontal de destaque
 *   (`isFeatured`) e o vertical da grade. Nos dois, o título é o único link do
 *   card e ele se estica sobre o card inteiro — clicar em qualquer ponto leva
 *   ao artigo sem duplicar o mesmo destino para quem navega por leitor de tela.
 * @dependencies next/image, components/ui/card e badge, lib/editorial-images
 *   (URL canônica da capa), lib/utils/format (data em pt-BR, fuso fixo),
 *   lib/services/posts (tipo `Post`).
 */
import Image from 'next/image';
import { coverImageUrl } from '@/lib/editorial-images';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import type { Post } from '@/lib/services/posts';

interface PostCardProps {
  /** Artigo vindo da consulta pública; a visibilidade já foi aplicada nela. */
  post: Post;
  /** `true` no destaque da home (layout horizontal). Padrão: `false`. */
  isFeatured?: boolean;
}

/**
 * Card navegável de um artigo, com layout de destaque ou de grade.
 *
 * @param post - Artigo a anunciar (capa, editoria, título, resumo, data).
 * @param isFeatured - Quando `true`, troca para a variante horizontal com
 *   título maior e capa `loading="eager"` (acima da dobra); a grade usa
 *   `lazy`, que não disputa banda com o destaque.
 * @returns Card com um único link (o título) cobrindo a área toda.
 */
export function PostCard({ post, isFeatured = false }: PostCardProps) {
  // Fuso fixo de SP: a data editorial não muda porque o servidor renderizou
  // em outro fuso — o leitor, o servidor e o banco estão em lugares diferentes.
  const publishedAt = post.published_at
    ? formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })
    : '';

  if (isFeatured) {
    return (
      <Card
        className="relative overflow-hidden flex flex-col md:flex-row group border-brand-500/20"
        data-slot="post-card-featured">
        <div className="w-full md:w-1/2 aspect-video md:aspect-auto relative overflow-hidden bg-muted">
          <Image
            src={coverImageUrl(post.cover_image_url)}
            alt={`Capa do artigo ${post.title}`}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            fill
            unoptimized
            sizes="(min-width: 768px) 50vw, 100vw"
            loading="eager"
          />
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-brand-700 bg-brand-50">
                {post.editoria}
              </Badge>
              {publishedAt && (
                <time
                  dateTime={post.published_at!}
                  className="text-sm text-muted-foreground">
                  {publishedAt}
                </time>
              )}
            </div>
            <CardTitle className="text-3xl line-clamp-2 hover:text-brand-600 transition-colors">
              {/* Link esticado: o span cobre o Card (que é `relative`), então
                  qualquer clique leva ao artigo. Um único <a> por card — dois
                  links para o mesmo destino encheriam a navegação por tab. */}
              <a
                href={`/artigos/${post.slug}`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm">
                <span className="absolute inset-0" aria-hidden="true" />
                {post.title}
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base line-clamp-3">
              {post.excerpt}
            </CardDescription>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="relative overflow-hidden flex flex-col h-full group"
      data-slot="post-card">
      <div className="w-full aspect-video relative overflow-hidden bg-muted">
        <Image
          src={coverImageUrl(post.cover_image_url)}
          alt={`Capa do artigo ${post.title}`}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          fill
          unoptimized
          sizes="(min-width: 768px) 33vw, 100vw"
          loading="lazy"
        />
      </div>
      <CardHeader className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-brand-700 bg-brand-50">
            {post.editoria}
          </Badge>
        </div>
        <CardTitle className="text-xl line-clamp-2 hover:text-brand-600 transition-colors">
          {/* Mesmo link esticado do destaque, aqui no ::before do próprio <a>:
              o pseudo-elemento cobre o card inteiro e mantém um só link. */}
          <a
            href={`/artigos/${post.slug}`}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm before:absolute before:inset-0">
            {post.title}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2 mb-4">
          {post.excerpt}
        </CardDescription>
        {publishedAt && (
          <div className="text-sm text-muted-foreground">{publishedAt}</div>
        )}
      </CardContent>
    </Card>
  );
}
