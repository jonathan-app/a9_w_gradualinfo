/**
 * components/ui/skeleton.tsx — placeholder de carregamento
 * @fileoverview Placeholder de carregamento (shimmer).
 * @module components/ui/skeleton
 * @description Um bloco pulsante que ocupa o espaço do conteúdo até ele
 *   chegar. Sem isto, a troca de "carregando" para "pronto" pula layout (CLS).
 * @dependencies lib/utils/cn (merge de className).
 * @param props - Props nativas de `div`; o `className` do chamador dá a forma
 *   (altura, largura, raio) — o `animate-pulse` é o contrato que não deve
 *   sumir, senão vira caixa cinza parada.
 * @returns `<div>` pulsante com a cor de fundo `muted`.
 */
import { cn } from '@/lib/utils/cn';
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
