import { cn } from '@/lib/utils/cn';

/**
 * components/ui/skeleton.tsx — placeholder de carregamento
 *
 * Um bloco pulsante que ocupa o espaço do conteúdo até ele chegar. Sem isto,
 * a troca de "carregando" para "pronto" pula layout (CLS).
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
