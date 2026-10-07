/**
 * @fileoverview Badge do design system (etiqueta compacta).
 * @module components/ui/badge
 * @description Componente de etiqueta com variantes fechadas via `cva`
 *   (default, secondary, destructive, outline). É Server Component: não tem
 *   estado nem evento, e por isso nasce como `div` — a etiqueta anuncia
 *   categoria (ex.: editoria de um artigo), não ação, então não deve receber
 *   foco de teclado.
 * @dependencies class-variance-authority (variantes), lib/utils/cn (merge de
 *   className).
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils/cn';

// Variantes fechadas: adicionar uma variante nova passa por este arquivo,
// não por className solto no consumidor.
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-600 text-white',
        secondary: 'border-transparent bg-muted text-foreground',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Props do badge: as variantes do `cva` mais qualquer atributo nativo de
 * `div` (`title`, `aria-*`, `data-*`).
 */
export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Etiqueta de categoria com a variante escolhida.
 *
 * @param props - `variant` (padrão `default`) e props nativos de `div`.
 * @returns `div` com as classes da variante mescladas ao `className` do
 *   consumidor na ordem certa (é o `cn()` que garante isso).
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
