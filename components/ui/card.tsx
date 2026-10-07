import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * components/ui/card.tsx — o contêiner de conteúdo do design system
 *
 * Cada parte tem o prefixo `data-slot`: é o que permite estilizar por
 * contexto no CSS sem precisar variantar cada subcomponente, e o que dá um
 * alvo estável para teste e para o DevTools.
 *
 * @fileoverview Família de contêiner de conteúdo do design system (Card).
 * @module components/ui/card
 * @dependencies react, lib/utils/cn (merge de className).
 */
/**
 * Contêiner raiz do card (moldura, fundo e sombra).
 *
 * @param props - Props nativos de `div`; o `className` do consumidor entra no
 *   merge por último.
 * @returns `div` com `data-slot="card"`.
 */
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-card border border-border bg-background text-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Área de título/descrição do card.
 *
 * @returns `div` com `p-6`: o padding lateral bate com o `px-6` de
 *   `CardContent`, e título, corpo e rodapé caem na mesma vertical.
 */
export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  );
}

/**
 * Título do card, com semântica de `<h3>` — os `<h1>`/`<h2>` ficam com a
 * página, para a hierarquia de cabeçalhos não começar dentro de um card.
 *
 * @returns `<h3>` com `data-slot="card-title"`; o texto chega por children.
 */
export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- conteúdo chega via props.children; é um componente de biblioteca
    <h3
      data-slot="card-title"
      className={cn('text-lg font-semibold leading-tight', className)}
      {...props}
    />
  );
}

/**
 * Resumo do card em texto secundário.
 *
 * @returns `<p>` com a cor `muted-foreground`: apoio à leitura, não destaque.
 */
export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Corpo do card.
 *
 * @returns `div` com `px-6 pb-6`: mesma lateral do header e fechamento no
 *   rodapé, para o conteúdo não encostar na borda.
 */
export function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6 pb-6', className)}
      {...props}
    />
  );
}

/**
 * Rodapé do card, para ações alinhadas ao conteúdo.
 *
 * @returns `div` com `px-6 pb-6` e gap entre itens; é opcional por
 *   composição — card sem ação simplesmente não o renderiza.
 */
export function CardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2 px-6 pb-6', className)}
      {...props}
    />
  );
}
