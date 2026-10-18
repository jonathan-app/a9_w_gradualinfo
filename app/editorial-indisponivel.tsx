/**
 * @fileoverview Bloco honesto de indisponibilidade temporária de conteúdo editorial.
 * @module app/editorial-indisponivel
 * @description Exibido na página inicial quando a fonte de conteúdo (Sanity) falha após o probe
 *   ou durante a renderização do Server Component. Comunica indisponibilidade de infraestrutura
 *   sem congelar skeletons ou mascarar a tela como 404 (Spec 0006, seção 3.C).
 * @dependencies React puro (Server Component).
 */

/**
 * Bloco de contingência para falha de infraestrutura editorial.
 *
 * @returns Elemento acessível com copy honesta de indisponibilidade.
 */
export function EditorialIndisponivel() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-card border border-border bg-muted/40"
      data-slot="editorial-indisponivel"
      role="status"
      aria-live="polite">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
        Conteúdo temporariamente indisponível
      </h2>
      <p className="text-muted-foreground max-w-md">
        Não conseguimos carregar os artigos agora. Tente novamente em alguns
        instantes.
      </p>
    </div>
  );
}
