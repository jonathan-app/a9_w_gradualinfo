/**
 * @fileoverview Variantes editoriais da capa, destaques e recentes.
 * @module components/shared/editorial-story
 * @description Recebe dados já publicados, sem consulta por card.
 * @dependencies editorial-cover, editorial-images, format, cn.
 */
import type { Post } from '@/lib/services/posts';
import { approvedCoverImageUrl } from '@/lib/editorial-images';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { EditorialCover } from './editorial-cover';

/**
 * Apresenta um artigo com um único link e campos definidos por variante.
 * @param props - Artigo e posição editorial.
 * @returns Card sem autoria, reservada ao artigo completo.
 */
export function EditorialStory({
  post,
  variant,
}: {
  post: Post;
  variant: 'lead' | 'secondary' | 'recent';
}) {
  const recent = variant === 'recent';
  return (
    <article
      className={cn(
        'relative min-w-0',
        recent &&
          'grid grid-cols-[minmax(0,1fr)_5rem] gap-4 border-b border-border pb-5',
      )}>
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          recent ? 'order-2 aspect-[4/3]' : 'mb-4 aspect-video',
        )}>
        <EditorialCover
          src={approvedCoverImageUrl(post.cover_image_url)}
          priority={variant === 'lead'}
          sizes={
            recent
              ? '80px'
              : variant === 'lead'
                ? '(min-width: 1280px) 520px, (min-width: 768px) 55vw, 100vw'
                : '(min-width: 1280px) 300px, (min-width: 768px) 40vw, 100vw'
          }
        />
      </div>
      <div className="min-w-0">
        {post.editoria && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {post.editoria}
          </p>
        )}
        <h3
          className={cn(
            'font-bold tracking-tight',
            variant === 'lead'
              ? 'text-3xl leading-tight md:text-4xl'
              : recent
                ? 'text-base leading-snug'
                : 'text-xl leading-snug',
          )}>
          <a
            href={`/artigos/${post.slug}`}
            className="after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {post.title}
          </a>
        </h3>
        {!recent && post.excerpt && (
          <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        {post.published_at && (
          <time
            dateTime={post.published_at}
            className="mt-3 block text-xs text-muted-foreground">
            {formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })}
          </time>
        )}
      </div>
    </article>
  );
}
