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
