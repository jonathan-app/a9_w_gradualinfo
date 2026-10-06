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
  post: Post;
  isFeatured?: boolean;
}

export function PostCard({ post, isFeatured = false }: PostCardProps) {
  const publishedAt = post.published_at
    ? formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })
    : '';

  if (isFeatured) {
    return (
      <Card
        className="overflow-hidden flex flex-col md:flex-row group border-brand-500/20"
        data-slot="post-card-featured">
        <div className="w-full md:w-1/2 aspect-video md:aspect-auto relative overflow-hidden bg-muted">
          <img
            src={post.cover_image_url}
            alt={`Capa do artigo ${post.title}`}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="eager"
          />
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-brand-600 bg-brand-50">
                {post.editoria}
              </Badge>
              {publishedAt && (
                <span className="text-sm text-muted-foreground">
                  {publishedAt}
                </span>
              )}
            </div>
            <CardTitle className="text-3xl line-clamp-2 hover:text-brand-600 transition-colors">
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
      className="overflow-hidden flex flex-col h-full group"
      data-slot="post-card">
      <div className="w-full aspect-video relative overflow-hidden bg-muted">
        <img
          src={post.cover_image_url}
          alt={`Capa do artigo ${post.title}`}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <CardHeader className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-brand-600 bg-brand-50">
            {post.editoria}
          </Badge>
        </div>
        <CardTitle className="text-xl line-clamp-2 hover:text-brand-600 transition-colors">
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
