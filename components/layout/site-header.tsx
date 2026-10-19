/**
 * @fileoverview Cabeçalho público e navegação principal do portal.
 * @module components/layout/site-header
 * @description Adapta o menu com faixa promocional em gradiente e barra branca fornecido
 *   pelo proprietário à marca e às rotas reais do Gradualinfo. A navegação pública
 *   (HOME, Artigos, Recentes) e a busca vivem no desktop; o celular usa um menu nativo
 *   `<details>` com o botão hamburger da referência. A faixa inferior exibe mensagem de
 *   boas-vindas e um letreiro contínuo (marquee) com todos os artigos publicados.
 * @dependencies next/link, components/shared/icons, components/shared/theme-toggle,
 *   lib/services/posts, lib/supabase/server.
 */
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpenIcon,
  ClockIcon,
  HomeIcon,
  SearchIcon,
} from '@/components/shared/icons';
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
      {/* Barra principal de navegação com 70px de altura e gradiente de #028CDF para #295FF2 */}
      <nav
        aria-label="Navegação principal"
        className="relative flex h-[70px] w-full items-center justify-between border-b border-[#214ec7] bg-gradient-to-r from-[#028CDF] to-[#295FF2] px-4 py-4 text-white transition-all sm:px-6 md:px-12 lg:px-16 xl:px-24">
        {/* Lado esquerdo: Menu hambúrguer (drawer esquerdo) e Logo da marca */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Menu lateral esquerdo nativo com details/summary (Menu Hambúrguer off-canvas) */}
          <details className="group" name="header-drawer">
            <summary
              aria-label="menu-btn"
              className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {/* Fundo escurecido semi-transparente cobrindo a tela (fecha o menu ao clicar fora) */}
              <span
                className="fixed inset-0 z-40 hidden bg-black/60 backdrop-blur-xs group-open:block"
                aria-hidden="true"
              />

              {/* Botão de alternância: hambúrguer fechado no header / botão fechar (X) dentro do drawer */}
              <span className="relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10 active:scale-90 group-open:fixed group-open:top-[15px] group-open:left-[232px] sm:group-open:left-[264px] group-open:text-gray-700 dark:group-open:text-gray-200 group-open:hover:bg-gray-100 dark:group-open:hover:bg-gray-800">
                {/* Ícone de três barrinhas horizontais (hambúrguer ≡) quando fechado */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 group-open:hidden"
                  aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                {/* Ícone de fechar (✕) quando o menu lateral está aberto */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden h-6 w-6 group-open:block"
                  aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="sr-only">Menu</span>
              </span>
            </summary>

            {/* Painel lateral esquerdo (Drawer Lateral Esquerdo) com z-50 acima do backdrop z-40 */}
            <div className="fixed top-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-gray-200 bg-white p-6 shadow-2xl sm:w-80 dark:border-gray-800 dark:bg-gray-900">
              <div>
                {/* Cabeçalho do menu lateral com marca no canto esquerdo e o botão fechar (X) depois */}
                <div className="flex h-12 items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/logo.svg"
                      alt=""
                      width={28}
                      height={32}
                      unoptimized
                      className="h-7 w-auto"
                    />
                    <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                      Gradualinfo
                    </span>
                  </div>
                  {/* Espaço reservado para o botão fixo de fechar no topo direito do drawer */}
                  <div className="h-10 w-10 shrink-0" aria-hidden="true" />
                </div>

                {/* Rotas de navegação do menu lateral */}
                <nav
                  aria-label="Navegação lateral"
                  className="flex flex-col space-y-2 pt-6 text-sm font-semibold tracking-wider uppercase">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-900 transition-colors hover:bg-gray-100 hover:text-[#028CDF] dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-[#028CDF]">
                    <HomeIcon aria-hidden="true" className="h-5 w-5" /> HOME
                  </Link>
                  <Link
                    href="/#artigos"
                    className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-900 transition-colors hover:bg-gray-100 hover:text-[#028CDF] dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-[#028CDF]">
                    <BookOpenIcon aria-hidden="true" className="h-5 w-5" />{' '}
                    ARTIGOS
                  </Link>
                  <Link
                    href="/#recentes"
                    className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-900 transition-colors hover:bg-gray-100 hover:text-[#028CDF] dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-[#028CDF]">
                    <ClockIcon aria-hidden="true" className="h-5 w-5" />{' '}
                    RECENTES
                  </Link>
                </nav>
              </div>

              {/* Rodapé informativo do menu lateral */}
              <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Gradualinfo Tecnologia e Consumo Digital
                </p>
              </div>
            </div>
          </details>
        </div>

        {/* Marca centralizada (Logo + Gradualinfo) */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 font-bold tracking-tight text-white transition-opacity hover:opacity-90"
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
          <span className="text-xl font-bold tracking-tight text-white">
            Gradualinfo
          </span>
        </Link>

        {/* Lado direito: Tema e Pesquisa com drawer lateral */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alternador de tema claro/escuro */}
          <ThemeToggle />

          {/* Drawer lateral de pesquisa nativo com details/summary */}
          <details className="group" name="header-drawer">
            <summary
              aria-label="Abrir pesquisa"
              className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {/* Fundo escurecido semi-transparente cobrindo a tela (fecha a pesquisa ao clicar fora) */}
              <span
                className="fixed inset-0 z-40 hidden bg-black/60 backdrop-blur-xs group-open:block"
                aria-hidden="true"
              />

              {/* Botão de alternância da busca: lupa fechado / X aberto */}
              <span className="relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10 active:scale-90 group-open:fixed group-open:top-[15px] group-open:right-4 group-open:text-gray-700 dark:group-open:text-gray-200 group-open:hover:bg-gray-100 dark:group-open:hover:bg-gray-800">
                {/* Ícone de busca quando fechado */}
                <SearchIcon
                  aria-hidden="true"
                  className="h-5 w-5 group-open:hidden"
                />
                {/* Ícone de fechar (✕) quando o painel de pesquisa está aberto */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden h-6 w-6 group-open:block"
                  aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="sr-only">Pesquisar artigos</span>
              </span>
            </summary>

            {/* Painel lateral direito de pesquisa (Drawer de Pesquisa) com z-50 */}
            <div className="fixed top-0 right-0 z-50 flex h-full w-80 max-w-[88vw] flex-col justify-between border-l border-gray-200 bg-white p-6 shadow-2xl sm:w-96 dark:border-gray-800 dark:bg-gray-900">
              <div>
                {/* Cabeçalho do painel de pesquisa */}
                <div className="flex h-12 items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <SearchIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-[#028CDF]"
                    />
                    <span className="text-lg font-bold tracking-tight">
                      Buscar sobre Gradual Info
                    </span>
                  </div>
                  {/* Espaço reservado para o botão fixo de fechar no topo direito */}
                  <div className="h-10 w-10 shrink-0" aria-hidden="true" />
                </div>

                {/* Formulário de busca */}
                <form
                  action="/busca"
                  method="GET"
                  role="search"
                  className="pt-6">
                  <label className="sr-only" htmlFor="drawer-search">
                    Pesquisar artigos
                  </label>
                  <div className="relative">
                    <input
                      id="drawer-search"
                      name="q"
                      type="search"
                      placeholder="O que você procura?..."
                      required
                      maxLength={120}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-900 outline-none transition focus:border-[#028CDF] focus:bg-white focus:ring-2 focus:ring-[#028CDF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <SearchIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-gray-400"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Pesquisar artigos"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#028CDF] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0278be]">
                    <SearchIcon aria-hidden="true" className="h-4 w-4" />
                    Buscar
                  </button>
                </form>

                {/* Sugestões de buscas rápidas */}
                <div className="pt-6">
                  <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                    Sugestões de temas
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      'Next.js',
                      'SEO',
                      'Supabase',
                      'Cloudflare',
                      'IA',
                      'Segurança',
                    ].map((tag) => (
                      <Link
                        key={tag}
                        href={`/busca?q=${encodeURIComponent(tag)}`}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-[#028CDF]/10 hover:text-[#028CDF] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-[#028CDF]">
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé informativo da pesquisa */}
              <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Pesquise títulos, resumos e conteúdos de todos os artigos
                  publicados.
                </p>
              </div>
            </div>
          </details>
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
