/**
 * @fileoverview Página pública de pesquisa de artigos.
 * @module app/busca/page
 * @description Pesquisa por título, resumo, editoria e texto nos artigos com recorte por categoria e tolerância a erros de digitação.
 * @dependencies lib/services/posts, lib/utils/search-posts, lib/supabase/server.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowUpRight, LuSearch } from 'react-icons/lu';
import { getPublishedPosts, type Post } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';
import { searchPostsWithFilters } from '@/lib/utils/search-posts';
import { ContentUnavailableError } from '@/lib/errors/content';
import styles from './search.module.css';

// Título sem o sufixo da marca: o template do layout raiz o acrescenta uma vez.
export const metadata: Metadata = {
  title: 'Pesquisa de artigos',
  description: 'Encontre artigos de tecnologia e programação no Gradualinfo.',
  robots: { index: false, follow: true },
};

/**
 * Página de pesquisa pública com busca textual, recorte por editoria e paginação.
 *
 * @param props Parâmetros da URL (q, editoria e page).
 * @returns Interface com campo de busca, pílulas de editoria, lista paginada e estados honestos.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    editoria?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawEditoria = Array.isArray(params.editoria)
    ? params.editoria[0]
    : params.editoria;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;

  const query = (typeof rawQ === 'string' ? rawQ : '').trim().slice(0, 120);
  const editoriaParam =
    typeof rawEditoria === 'string' ? rawEditoria.trim() : undefined;
  const pageParam = typeof rawPage === 'string' ? parseInt(rawPage, 10) : 1;
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  let matches: Post[] = [];
  let totalMatches = 0;
  let totalPages = 0;
  let currentPage = 1;
  let availableEditorias: string[] = [];
  let activeEditoria: string | undefined = undefined;
  let unavailable = false;

  if (query) {
    try {
      const allPosts = await getPublishedPosts(createPublicClient(), 500);
      const searchResult = searchPostsWithFilters(allPosts, {
        query,
        editoria: editoriaParam,
        page,
        pageSize: 20,
      });

      matches = searchResult.items;
      totalMatches = searchResult.totalMatches;
      totalPages = searchResult.totalPages;
      currentPage = searchResult.currentPage;
      availableEditorias = searchResult.availableEditorias;
      activeEditoria = searchResult.activeEditoria;
    } catch (error) {
      if (error instanceof ContentUnavailableError) unavailable = true;
      else throw error;
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>
          <LuSearch aria-hidden="true" /> EXPLORE O GRADUALINFO
        </span>
        <h1>O que você quer aprender hoje?</h1>
        <p>Busque por assunto, tecnologia ou uma dúvida de programação.</p>
        <form action="/busca" role="search" className={styles.searchForm}>
          <label className="sr-only" htmlFor="article-search">
            Pesquisar artigos
          </label>
          <LuSearch aria-hidden="true" />
          <input
            id="article-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Ex.: Next.js, segurança, IA..."
            maxLength={120}
            required
          />
          {activeEditoria && (
            <input type="hidden" name="editoria" value={activeEditoria} />
          )}
          <button type="submit">Pesquisar</button>
        </form>
      </div>

      <section className={styles.results} aria-live="polite">
        {unavailable ? (
          <p className={styles.message}>
            A pesquisa está indisponível agora. Tente novamente em instantes.
          </p>
        ) : query ? (
          <>
            {availableEditorias.length > 0 && (
              <nav
                aria-label="Filtrar por editoria"
                className={styles.editoriaFilter}>
                <span className={styles.filterTitle}>
                  Recorte por editoria:
                </span>
                <div className={styles.pillsList}>
                  <Link
                    href={`/busca?q=${encodeURIComponent(query)}`}
                    className={`${styles.pill} ${!activeEditoria ? styles.pillActive : ''}`}
                    aria-current={!activeEditoria ? 'page' : undefined}
                    data-active={!activeEditoria ? 'true' : undefined}>
                    Todas
                  </Link>
                  {availableEditorias.map((ed) => {
                    const isActive = activeEditoria === ed;
                    return (
                      <Link
                        key={ed}
                        href={`/busca?q=${encodeURIComponent(query)}&editoria=${encodeURIComponent(ed)}`}
                        className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive ? 'true' : undefined}>
                        {ed}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className={styles.resultHeading}>
              <h2>
                Resultados para “{query}”
                {activeEditoria ? ` em ${activeEditoria}` : ''}
              </h2>
              <span>
                {totalMatches} {totalMatches === 1 ? 'artigo' : 'artigos'}
              </span>
            </div>

            {totalMatches === 0 ? (
              <p className={styles.message}>
                {activeEditoria ? (
                  <>
                    Nenhum artigo encontrado em {activeEditoria} para “{query}”.{' '}
                    <Link href={`/busca?q=${encodeURIComponent(query)}`}>
                      Limpar filtro de editoria
                    </Link>{' '}
                    ou explore as <Link href="/#editorias">editorias</Link>.
                  </>
                ) : (
                  <>
                    Nenhum artigo encontrado. Tente outro termo ou explore as{' '}
                    <Link href="/#editorias">editorias</Link>.
                  </>
                )}
              </p>
            ) : (
              <>
                <div className={styles.list}>
                  {matches.map((post) => (
                    <article className={styles.card} key={post.slug}>
                      <span className={styles.category}>{post.editoria}</span>
                      <h3>
                        <Link href={`/artigos/${post.slug}`}>
                          {post.title}
                          <LuArrowUpRight aria-hidden="true" />
                        </Link>
                      </h3>
                      {post.excerpt && <p>{post.excerpt}</p>}
                    </article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    aria-label="Paginação dos resultados"
                    className={styles.pagination}>
                    {currentPage > 1 ? (
                      <Link
                        href={`/busca?q=${encodeURIComponent(query)}${
                          activeEditoria
                            ? `&editoria=${encodeURIComponent(activeEditoria)}`
                            : ''
                        }&page=${currentPage - 1}`}
                        rel="prev"
                        className={styles.paginationButton}>
                        Anterior
                      </Link>
                    ) : (
                      <span
                        className={styles.paginationDisabled}
                        aria-disabled="true">
                        Anterior
                      </span>
                    )}

                    <span className={styles.paginationInfo}>
                      Página {currentPage} de {totalPages}
                    </span>

                    {currentPage < totalPages ? (
                      <Link
                        href={`/busca?q=${encodeURIComponent(query)}${
                          activeEditoria
                            ? `&editoria=${encodeURIComponent(activeEditoria)}`
                            : ''
                        }&page=${currentPage + 1}`}
                        rel="next"
                        className={styles.paginationButton}>
                        Próxima
                      </Link>
                    ) : (
                      <span
                        className={styles.paginationDisabled}
                        aria-disabled="true">
                        Próxima
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </>
        ) : (
          <p className={styles.message}>
            Digite um termo para encontrar artigos.
          </p>
        )}
      </section>
    </main>
  );
}
