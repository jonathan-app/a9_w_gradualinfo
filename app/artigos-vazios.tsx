/**
 * app/artigos-vazios.tsx — estado vazio da listagem de artigos
 * @fileoverview Estado vazio da listagem de artigos publicados.
 * @module app/artigos-vazios
 * @description Exibido quando a query de artigos publicados retorna array
 *   vazio. Sem este componente, a home mostraria apenas o container vazio, o
 *   que não comunica ao usuário o que aconteceu.
 * @dependencies nenhum além do React/JSX (Server Component puro).
 */
/**
 * Bloco de estado vazio exibido quando não há artigo publicado.
 *
 * Não oferece link de ação nem botão de recarregar: não existe destino útil
 * enquanto o catálogo está vazio, e fingir que existe só convida ao clique
 * que devolve a mesma tela.
 *
 * @returns Container centralizado com borda tracejada e o aviso em duas linhas
 *   (título + explicação), legível sem leitor de tela.
 */
export function ArtigosVazios() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-card border border-dashed border-border bg-muted/30"
      data-slot="artigos-vazios">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
        Nenhum artigo publicado
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Ainda não há artigos disponíveis para leitura. Volte em breve para
        conferir as novidades.
      </p>
    </div>
  );
}
