/**
 * @fileoverview Composição editorial exclusiva da home Cambridge.
 * @module components/home
 * @description Usa posts já filtrados pelo serviço e tokens existentes.
 * @dependencies Post, EditorialCover, CSS Module da home.
 */

import type { Post } from '@/lib/services/posts';
import { EditorialCover } from '@/components/shared/editorial-cover';
import { approvedCoverImageUrl } from '@/lib/editorial-images';
import { formatDate } from '@/lib/utils/format';
import styles from './home-editorial.module.css';

/** @param props Artigo já autorizado. @returns Autoria e data real, ou indicação de rascunho. */
export function PostByline({ post }: { post: Post }) {
  return (
    <p className={styles.byline}>
      {post.author_name && <span>{post.author_name}</span>}
      {post.published_at ? (
        <time dateTime={post.published_at}>
          {formatDate(post.published_at, { timeZone: 'America/Sao_Paulo' })}
        </time>
      ) : post.status === 'rascunho' ? (
        <span>Rascunho · prévia local</span>
      ) : null}
    </p>
  );
}

/** @param props Post já filtrado. @returns Card com um único link, sem corpo longo. */
export function PostCardEditorial({ post }: { post: Post }) {
  return (
    <article className={styles.card}>
      <a href={`/artigos/${post.slug}`} className={styles.cardLink}>
        <div className={styles.cover}>
          <EditorialCover
            src={approvedCoverImageUrl(post.cover_image_url)}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 100vw"
          />
        </div>
        {post.editoria && <p className={styles.category}>{post.editoria}</p>}
        <h3 className={styles.cardTitle}>{post.title}</h3>
      </a>
      <PostByline post={post} />
    </article>
  );
}
