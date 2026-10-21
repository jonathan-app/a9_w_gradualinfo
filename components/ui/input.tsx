/**
 * components/ui/input.tsx — o campo de formulário do design system
 * @fileoverview Campo de formulário do design system.
 * @module components/ui/input
 * @description Encapsula o <input> nativo com os tokens do projeto
 *   (border-border, bg-background, foco em brand). Quem precisa de
 *   comportamento diferente sobrescreve via className — o cn() aplica a ordem
 *   correta do Tailwind.
 * @dependencies react (forwardRef), lib/utils/cn.
 * @param props - Props nativas de `<input>` (`type`, `required`, `name`...);
 *   o `className` entra por merge, então o consumidor sobrescreve sem lutar
 *   contra a ordem das classes.
 * @param ref - Encaminhado ao `<input>` nativo: é como o chamador pega o foco
 *   ou mede o campo sem procurar o elemento no DOM.
 * @returns `<input>` com borda, anel de foco e estados desabilitado do projeto.
 * @type InputProps - Props do campo: qualquer atributo nativo de `<input>`.
 */
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/** Props do campo: qualquer atributo nativo de `<input>`. */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
