/**
 * @fileoverview Composição editorial exclusiva da home Cambridge.
 * @module components/home
 * @description Usa posts já filtrados pelo serviço e tokens existentes.
 * @dependencies Post, EditorialCover, CSS Module da home.
 */

import type { Post } from '@/lib/services/posts';
import { PostCardEditorial } from './post-card-editorial';
import styles from './home-editorial.module.css';

/** @param props Artigos recentes de todas as editorias. @returns Grade de até 16 artigos. */
export function HomeSectionGrid({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return (
    <section
      id="editorias"
      aria-label="Grade de artigos"
      className={styles.section}>
      <div className={styles.sectionGrid}>
        {posts.map((post) => (
          <PostCardEditorial key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
