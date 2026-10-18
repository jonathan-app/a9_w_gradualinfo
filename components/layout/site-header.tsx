/**
 * @fileoverview Cabeçalho público e navegação principal do portal.
 * @module components/layout/site-header
 * @description Adapta o menu com faixa promocional em gradiente e barra branca fornecido
 *   pelo proprietário à marca e às rotas reais do Gradualinfo. A navegação pública
 *   (HOME, Artigos, Recentes) e a busca vivem no desktop; o celular usa um menu nativo
 *   `<details>` com o botão hamburger da referência. A faixa inferior exibe mensagem de
 *   boas-vindas e um letreiro contínuo (marquee) com todos os artigos publicados.
 * @dependencies next/link, react-icons/lu, components/shared/theme-toggle,
 *   lib/services/posts, lib/supabase/server.
 */
import Image from 'next/image';
import Link from 'next/link';
import { LuHouse, LuSearch } from 'react-icons/lu';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getPublishedPosts, type Post } from '@/lib/services/posts';
import { createPublicClient } from '@/lib/supabase/server';

/**
 * Renderiza o cabeçalho público completo com faixa de aviso, marca, rotas e menu responsivo.
 *
 * @returns Cabeçalho com barra de navegação, faixa com mensagem de boas-vindas e letreiro de posts.
 */
export async function SiteHeader() {
  let posts: Post[];
  try {
    const supabase = createPublicClient();
    posts = await getPublishedPosts(supabase, 60);
  } catch {
    // Falha silenciosa para garantir disponibilidade honesta sem quebrar layout
    posts = [];
  }

  return (
    <header className="relative w-full">
      {/* Barra principal de navegação com 70px de altura e borda sutil */}
      <nav
        aria-label="Navegação principal"
        className="relative flex h-[70px] w-full items-center justify-between border-b border-gray-200 bg-white px-4 py-4 text-gray-900 transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:px-6 md:px-12 lg:px-16 xl:px-24">
        {/* Marca fornecida pelo proprietário, com nome legível ao lado. */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-gray-900 transition-opacity hover:opacity-85 dark:text-white"
          aria-label="Gradualinfo, início">
          <Image
            src="/logo.svg"
            alt=""
            width={32}
            height={36}
            priority
            unoptimized
            className="h-9 w-auto"
          />
          <span className="text-xl font-bold tracking-tight">Gradualinfo</span>
        </Link>

        {/* Links de navegação desktop */}
        <ul className="hidden items-center space-x-8 text-sm font-medium md:flex md:pl-8 lg:pl-16">
          <li>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-violet-600 dark:hover:text-violet-400">
              <LuHouse aria-hidden="true" className="h-4 w-4" /> HOME
            </Link>
          </li>
          <li>
            <Link
              href="/#artigos"
              className="transition-colors hover:text-violet-600 dark:hover:text-violet-400">
              Artigos
            </Link>
          </li>
          <li>
            <Link
              href="/#recentes"
              className="transition-colors hover:text-violet-600 dark:hover:text-violet-400">
              Recentes
            </Link>
          </li>
        </ul>

        {/* Ações: Busca, Tema e Menu mobile */}
        <div className="flex items-center gap-3">
          {/* Formulário de busca desktop */}
          <form
            action="/busca"
            className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm transition-all focus-within:border-violet-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-violet-400 lg:flex"
            role="search">
            <LuSearch
              aria-hidden="true"
              className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
            />
            <label className="sr-only" htmlFor="header-search">
              Pesquisar artigos
            </label>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Pesquisar artigos..."
              required
              maxLength={120}
              className="w-28 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 xl:w-36"
            />
            <button
              type="submit"
              aria-label="Pesquisar artigos"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200/70 text-gray-600 transition-colors hover:bg-violet-600 hover:text-white dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-violet-500 dark:hover:text-white">
              <LuSearch aria-hidden="true" className="h-3 w-3" />
            </button>
          </form>

          {/* Atalho de busca mobile */}
          <Link
            href="/busca"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Pesquisar artigos">
            <LuSearch aria-hidden="true" className="h-5 w-5" />
          </Link>

          {/* Alternador de tema claro/escuro */}
          <ThemeToggle />

          {/* Menu mobile nativo com details/summary (acessível, zero JS no cliente, compatível com React 19) */}
          <div className="relative md:hidden">
            <details className="group">
              <summary
                aria-label="menu-btn"
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-gray-900 transition active:scale-90 dark:text-gray-100 [&::-webkit-details-marker]:hidden">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  fill="currentColor"
                  className="h-6 w-6">
                  <path d="M3 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2z" />
                </svg>
                <span className="sr-only">Menu</span>
              </summary>

              <div className="absolute top-[54px] right-0 w-[calc(100vw-2rem)] max-w-xs border-t border-gray-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:w-80 sm:rounded-b-2xl">
                <nav
                  aria-label="Navegação para celular"
                  className="flex flex-col space-y-4 text-base font-medium">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-900 hover:text-violet-600 dark:text-gray-100 dark:hover:text-violet-400">
                    <LuHouse aria-hidden="true" className="h-4 w-4" /> HOME
                  </Link>
                  <Link
                    href="/#artigos"
                    className="text-gray-900 hover:text-violet-600 dark:text-gray-100 dark:hover:text-violet-400">
                    Artigos
                  </Link>
                  <Link
                    href="/#recentes"
                    className="text-gray-900 hover:text-violet-600 dark:text-gray-100 dark:hover:text-violet-400">
                    Recentes
                  </Link>
                  <Link
                    href="/busca"
                    className="inline-flex items-center gap-2 text-gray-900 hover:text-violet-600 dark:text-gray-100 dark:hover:text-violet-400">
                    <LuSearch aria-hidden="true" className="h-4 w-4" /> Pesquisa
                  </Link>
                </nav>
              </div>
            </details>
          </div>
        </div>
      </nav>

      {/* Faixa inferior com letreiro contínuo de boas-vindas e artigos */}
      <div className="w-full overflow-hidden border-y border-gray-800 bg-gray-900 py-2 text-white dark:bg-black">
        <div
          className="marquee-container relative flex w-full items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]"
          aria-label="Boas-vindas e artigos do portal">
          {/* Trilho principal */}
          <div className="animate-marquee-scroll flex shrink-0 items-center gap-6 pr-6">
            {/* Mensagem de boas-vindas no fluxo contínuo */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-white md:text-sm">
              <span
                className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              <span>Bem-vindo(a) ao Gradualinfo!</span>
              <span aria-hidden="true" className="text-white/40">
                •
              </span>
            </span>

            {posts.map((post) => (
              <a
                key={post.slug}
                href={`/artigos/${post.slug}`}
                className="inline-flex items-center gap-2 text-xs font-medium text-white transition-opacity hover:opacity-80 md:text-sm">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  {post.editoria}
                </span>
                <span className="underline-offset-2 hover:underline">
                  {post.title}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  •
                </span>
              </a>
            ))}

            {posts.length === 0 && (
              <span className="text-xs font-medium text-white/90 md:text-sm">
                Explore nossos guias práticos e artigos de tecnologia para
                desenvolvedores.
              </span>
            )}
          </div>

          {/* Trilho duplicado para efeito infinito contínuo */}
          <div
            aria-hidden="true"
            className="animate-marquee-scroll flex shrink-0 items-center gap-6 pr-6">
            {/* Mensagem de boas-vindas no fluxo contínuo duplicado */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-white md:text-sm">
              <span
                className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              <span>Bem-vindo(a) ao Gradualinfo!</span>
              <span aria-hidden="true" className="text-white/40">
                •
              </span>
            </span>

            {posts.map((post) => (
              <a
                key={`dup-${post.slug}`}
                href={`/artigos/${post.slug}`}
                tabIndex={-1}
                className="inline-flex items-center gap-2 text-xs font-medium text-white transition-opacity hover:opacity-80 md:text-sm">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  {post.editoria}
                </span>
                <span className="underline-offset-2 hover:underline">
                  {post.title}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  •
                </span>
              </a>
            ))}

            {posts.length === 0 && (
              <span className="text-xs font-medium text-white/90 md:text-sm">
                Explore nossos guias práticos e artigos de tecnologia para
                desenvolvedores.
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
