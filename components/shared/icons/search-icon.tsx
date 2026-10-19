/**
 * @fileoverview Ícone de busca vetorial nativo em SVG.
 * @module components/shared/icons/search-icon
 * @description Renderiza o símbolo de lupa com traçado idêntico ao LuSearch (Lucide) usando currentColor.
 * @dependencies react, components/shared/icons/types
 */
import type { IconProps } from './types';

/**
 * Renderiza o ícone de pesquisa vetorial acessível.
 *
 * @param props Propriedades do elemento SVG (tamanho, classes e acessibilidade).
 * @returns Elemento SVG pronto para exibição com herança de cor do contêiner.
 */
export function SearchIcon({
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
