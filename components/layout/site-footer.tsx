/**
 * components/layout/site-footer.tsx — rodapé
 *
 * Server Component puro. Um ano corrente fixo no servidor é o suficiente: o
 * rodapé não precisa re-renderizar a cada virada de meia-noite.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Gradualinfo.</p>
        <p>Construído com Next.js 16, React 19, Tailwind CSS 4 e Supabase.</p>
      </div>
    </footer>
  );
}
