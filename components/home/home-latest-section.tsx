/**
 * @fileoverview Seção de Últimas Leituras da home.
 * @module components/home/home-latest-section
 * @description Exibe a lista das últimas leituras em grade horizontal de artigos.
 * @dependencies Post, PostByline, CSS Module da home.
 */

import type { Post } from '@/lib/services/posts';
import { PostByline } from './post-card-editorial';
import styles from './home-editorial.module.css';

/**
 * Renderiza a seção de últimas leituras abaixo dos destaques principais.
 *
 * @param props - Lista de artigos para a seção de últimas leituras.
 * @returns Seção editorial com cabeçalho e grade de artigos textuais, ou null se vazia.
 */
export function HomeLatestSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section
      id="ultimas-leituras"
      aria-label="Últimas leituras"
      className={styles.latestSection}>
      <div className={styles.sectionHeader}>
        <h2 id="home-latest-title">Últimas leituras</h2>
        <span className={styles.count}>
          {posts.length} {posts.length === 1 ? 'artigo' : 'artigos'}
        </span>
      </div>
      <div className={styles.latestGrid}>
        {posts.map((post) => (
          <article className={styles.latestArticle} key={post.id}>
            {post.editoria && (
              <p className={styles.category}>{post.editoria}</p>
            )}
            <h3 className={styles.latestTitle}>
              <a href={`/artigos/${post.slug}`} className={styles.cardLink}>
                {post.title}
              </a>
            </h3>
            {post.excerpt && (
              <p className={styles.latestExcerpt}>{post.excerpt}</p>
            )}
            <PostByline post={post} />
          </article>
        ))}
      </div>
    </section>
  );
}
