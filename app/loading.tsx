/**
 * @fileoverview Shell de carregamento da home (`app/loading.tsx`).
 * @module app/loading
 * @description O App Router renderiza este arquivo sozinho enquanto o Server
 *   Component da rota ainda busca dados — ele ocupa o lugar da página inteira
 *   até a resolução. O desenho espelha o da home real (1 card de destaque +
 *   grade de 6), para que a chegada do conteúdo troque bloco por bloco sem
 *   deslocar a página (CLS).
 * @dependencies components/ui/skeleton.
 */
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder da home enquanto os artigos são buscados.
 *
 * @returns Duas seções, cada uma com `aria-label` e título `sr-only`: quem
 *   navega por leitor de tela ouve que há conteúdo carregando em vez de
 *   silêncio, e o `data-slot` de cada bloco é alvo estável para teste.
 */
export default function Loading() {
  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 flex flex-col gap-12">
      {/* Featured Skeleton */}
      <section aria-label="Carregando artigo em destaque">
        <h2 className="sr-only">Carregando artigo em destaque</h2>
        <div
          className="rounded-card border border-border bg-background shadow-sm overflow-hidden flex flex-col md:flex-row"
          data-slot="skeleton-featured">
          <div className="w-full md:w-1/2 aspect-video md:aspect-auto relative bg-muted">
            <Skeleton className="absolute inset-0 rounded-none" />
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center p-6 gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-8 w-1/2 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </section>

      {/* Grid Skeletons */}
      <section aria-label="Carregando últimos artigos">
        <h2 className="sr-only">Carregando últimos artigos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-card border border-border bg-background shadow-sm overflow-hidden flex flex-col h-full"
              data-slot="skeleton-grid-item">
              <div className="w-full aspect-video relative bg-muted">
                <Skeleton className="absolute inset-0 rounded-none" />
              </div>
              <div className="flex-1 flex flex-col p-6 gap-4">
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3 mb-4" />
                <div className="space-y-2 mt-auto">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <Skeleton className="h-4 w-20 mt-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
