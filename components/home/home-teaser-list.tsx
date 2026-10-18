/**
 * @fileoverview Composição editorial exclusiva da home Cambridge.
 * @module components/home
 * @description Renderiza os quatro destaques secundários ao lado da matéria principal (duas colunas de 2 cards cada).
 * @dependencies Post, PostCardEditorial, CSS Module da home.
 */

import type { Post } from '@/lib/services/posts';
import { cn } from '@/lib/utils/cn';
import { PostCardEditorial } from './post-card-editorial';
import styles from './home-editorial.module.css';

/**
 * Renderiza os destaques secundários em duas colunas ao lado da matéria principal.
 * Primeira coluna com até 2 cards e segunda coluna com outros 2 cards ao lado.
 *
 * @param props Lista de posts de destaque (até 4 posts).
 * @returns Bloco de colunas de destaques ou null se a lista estiver vazia.
 */
export function HomeTeaserList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  const firstCol = posts.slice(0, 2);
  const secondCol = posts.slice(2, 4);

  return (
    <section
      aria-label="Destaques editoriais"
      className={cn(
        styles.sideColumns,
        secondCol.length === 0 && styles.sideColumnsSingle,
      )}>
      <div className={styles.teasers}>
        {firstCol.map((post) => (
          <PostCardEditorial key={post.id} post={post} />
        ))}
      </div>
      {secondCol.length > 0 && (
        <div className={cn(styles.teasers, styles.teasersSecondary)}>
          {secondCol.map((post) => (
            <PostCardEditorial key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
