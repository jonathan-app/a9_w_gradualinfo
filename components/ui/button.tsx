import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * components/ui/button.tsx — o botão do design system
 *
 * Por que `cva` e não uma condicional de className
 * As variantes ficam declaradas uma vez, em um único lugar, e o TypeScript
 * deriva o tipo de `variant` e `size` delas. Escrever `<Button variant="x">`
 * errado vira erro de compilação, não um botão cinza silencioso.
 *
 * Por que `asChild`
 * Quando `asChild` está ligado, o componente não renderiza um <button>: ele
 * entrega as classes e os props para o filho (geralmente uma <a>). Assim o
 * link continua sendo link — e é isso que o teclado, o leitor de tela e o
 * "abrir em nova aba" esperam.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white hover:bg-brand-700',
        outline: 'border border-border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza o filho no lugar do <button>, mantendo o estilo. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
