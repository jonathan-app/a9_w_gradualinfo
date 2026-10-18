/**
 * @fileoverview Composição editorial exclusiva da home Cambridge.
 * @module components/home
 * @description Usa posts já filtrados pelo serviço e tokens existentes.
 * @dependencies Post, EditorialCover, CSS Module da home.
 */

import type { Post } from '@/lib/services/posts';
import { EditorialCover } from '@/components/shared/editorial-cover';
import { approvedCoverImageUrl } from '@/lib/editorial-images';
import { PostByline } from './post-card-editorial';
import styles from './home-editorial.module.css';

/** @param props Post principal. @returns Capa prioritária, título, lead e autoria. */
export function HomeHeroFeatured({ post }: { post: Post }) {
  return (
    <section aria-label="Matéria de capa" className={styles.featured}>
      <article>
        <a href={`/artigos/${post.slug}`} className={styles.cardLink}>
          <div className={styles.heroCover}>
            <EditorialCover
              src={approvedCoverImageUrl(post.cover_image_url)}
              priority
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 60vw, 100vw"
            />
          </div>
          {post.editoria && <p className={styles.category}>{post.editoria}</p>}
          <h2 className={styles.heroTitle}>{post.title}</h2>
        </a>
        {post.excerpt && <p className={styles.lead}>{post.excerpt}</p>}
        <PostByline post={post} />
      </article>
    </section>
  );
}
