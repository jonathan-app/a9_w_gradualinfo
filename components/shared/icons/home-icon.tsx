/**
 * @fileoverview Ícone de página inicial vetorial nativo em SVG.
 * @module components/shared/icons/home-icon
 * @description Renderiza o símbolo de casa com traçado idêntico ao LuHouse (Lucide) usando currentColor.
 * @dependencies react, components/shared/icons/types
 */
import type { IconProps } from './types';

/**
 * Renderiza o ícone de página inicial (Home) vetorial acessível.
 *
 * @param props Propriedades do elemento SVG (tamanho, classes e acessibilidade).
 * @returns Elemento SVG pronto para exibição com herança de cor do contêiner.
 */
export function HomeIcon({
  className,
  size,
  'aria-hidden': ariaHidden,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size ?? '1em'}
      height={size ?? '1em'}
      aria-hidden={ariaHidden ?? (props['aria-label'] ? undefined : true)}
      className={className}
      {...props}>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
